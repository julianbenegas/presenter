import { Sandbox } from "@vercel/sandbox";
import ms from "ms";
import { readFile } from "fs/promises";
import { join } from "path";
import { redis } from "@/lib/redis";

// Helper to build the system prompt for Cursor
function buildCursorPrompt(
  userRequest: string,
  isFirstMessage: boolean
): string {
  if (isFirstMessage) {
    return `Create a compelling presentation based on this user request:

<user_request>
${userRequest}
</user_request>

<rules>
Read RULES.md for the complete formatting rules.
</rules>

<reference>
See sample.md for a real example of proper formatting.
</reference>

Create 5-10 well-structured slides and save the result to presentation.md.`;
  }

  return `The user is working on their presentation and sent you a message:

<user_message>
${userRequest}
</user_message>

<current_presentation>
Read presentation.md for the current content.
</current_presentation>

<rules>
Read RULES.md for formatting rules.
</rules>

<reference>
See sample.md for examples.
</reference>

You can edit the presentation.md file to make changes, if the user asks you to do so.`;
}

// Helper to escape content for heredoc
function escapeHeredoc(content: string): string {
  // Escape backslashes and dollar signs for heredoc
  return content.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
}

// Redis keys
const SANDBOX_KEY = (presentationId: string) => `sandbox:${presentationId}:id`;
const CHAT_HISTORY_KEY = (presentationId: string) =>
  `chat:${presentationId}:history`;

// Get or create sandbox for presentation
async function getOrCreateSandbox(
  presentationId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<Sandbox> {
  // Check if sandbox exists
  const existingSandboxId = await redis.get<string>(
    SANDBOX_KEY(presentationId)
  );

  // TODO: Implement sandbox reuse when Sandbox.get() API is available
  // For now, we create a new sandbox each time but skip CLI installation
  // if we detect it was recently created
  const isReusingSandbox = !!existingSandboxId;

  // Create new sandbox
  if (!isReusingSandbox) {
    controller.enqueue(encoder.encode("[Creating secure environment...]\n\n"));
  }

  const sandbox = await Sandbox.create({
    resources: { vcpus: 2 },
    timeout: ms("15m"),
    runtime: "node22",
  });

  // Store sandbox reference in Redis with TTL (14 minutes, before sandbox timeout)
  // Note: Storing the sandbox object itself for now
  // TODO: Check if sandboxes have a retrievable ID
  await redis.setex(SANDBOX_KEY(presentationId), 840, "created");

  return sandbox;
}

// Save chat message to Redis
async function saveChatMessage(
  presentationId: string,
  role: "user" | "assistant",
  content: string
) {
  const message = {
    role,
    content,
    timestamp: Date.now(),
  };

  // Append to chat history (keep last 50 messages)
  await redis.rpush(CHAT_HISTORY_KEY(presentationId), message);
  await redis.ltrim(CHAT_HISTORY_KEY(presentationId), -50, -1);

  // Set TTL on chat history (1 hour)
  await redis.expire(CHAT_HISTORY_KEY(presentationId), 3600);
}

// Get chat history from Redis
async function getChatHistory(
  presentationId: string
): Promise<Array<{ role: string; content: string; timestamp: number }>> {
  const history = await redis.lrange<{
    role: string;
    content: string;
    timestamp: number;
  }>(CHAT_HISTORY_KEY(presentationId), 0, -1);
  return history;
}

// Write chat history to sandbox for Cursor agent
async function writeChatHistoryToSandbox(
  sandbox: Sandbox,
  presentationId: string
) {
  const history = await getChatHistory(presentationId);

  if (history.length === 0) {
    return;
  }

  // Format chat history for Cursor
  const formattedHistory = history
    .map((msg) => {
      const timestamp = new Date(msg.timestamp).toISOString();
      return `[${timestamp}] ${msg.role.toUpperCase()}:\n${msg.content}\n`;
    })
    .join("\n---\n\n");

  // Write to .cursor/chat-history.txt
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `mkdir -p .cursor && cat > .cursor/chat-history.txt << 'HISTORY_EOF'
${escapeHeredoc(formattedHistory)}
HISTORY_EOF`,
    ],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ presentationId: string }> }
) {
  const encoder = new TextEncoder();

  try {
    const { presentationId } = await params;
    const { messages, currentContent } = await request.json();

    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    const userRequest = lastMessage?.content || "";
    const isFirstMessage = !currentContent || currentContent.trim() === "";

    // Read reference files
    const samplePath = join(process.cwd(), "public", "sample.md");
    const rulesPath = join(process.cwd(), "public", "RULES.md");
    const sampleContent = await readFile(samplePath, "utf-8");
    const rulesContent = await readFile(rulesPath, "utf-8");

    // Save user message to Redis
    await saveChatMessage(presentationId, "user", userRequest);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let sandbox: Sandbox | null = null;
        let isNewSandbox = false;

        try {
          // Get or create sandbox
          sandbox = await getOrCreateSandbox(
            presentationId,
            controller,
            encoder
          );

          // Check if this is a new sandbox (needs CLI installation)
          const checkCLI = await sandbox.runCommand({
            cmd: "which",
            args: ["cursor-agent"],
          });

          isNewSandbox = checkCLI.exitCode !== 0;

          if (isNewSandbox) {
            // Install Cursor CLI using official installation script
            controller.enqueue(
              encoder.encode("[Installing Cursor CLI...]\n\n")
            );

            const installResult = await sandbox.runCommand({
              cmd: "bash",
              args: ["-c", "curl https://cursor.com/install -fsSL | bash"],
            });

            if (installResult.exitCode !== 0) {
              const stderr = await installResult.stderr();
              throw new Error(
                `Failed to install Cursor CLI: ${stderr || "Unknown error"}`
              );
            }

            controller.enqueue(encoder.encode("[Cursor CLI installed]\n\n"));

            // Write reference files using heredoc
            controller.enqueue(encoder.encode("[Setting up files...]\n\n"));
          }

          // Write RULES.md
          await sandbox.runCommand({
            cmd: "bash",
            args: [
              "-c",
              `cat > RULES.md << 'RULES_EOF'
${escapeHeredoc(rulesContent)}
RULES_EOF`,
            ],
          });

          // Write sample.md
          await sandbox.runCommand({
            cmd: "bash",
            args: [
              "-c",
              `cat > sample.md << 'SAMPLE_EOF'
${escapeHeredoc(sampleContent)}
SAMPLE_EOF`,
            ],
          });

          // Write current presentation content
          await sandbox.runCommand({
            cmd: "bash",
            args: [
              "-c",
              `cat > presentation.md << 'PRES_EOF'
${escapeHeredoc(currentContent || "")}
PRES_EOF`,
            ],
          });

          if (isNewSandbox) {
            controller.enqueue(encoder.encode("[Files setup complete...]\n\n"));
            controller.enqueue(encoder.encode("[Running AI agent...]\n\n"));
          }

          // Write chat history to sandbox
          await writeChatHistoryToSandbox(sandbox, presentationId);

          // Build the prompt
          const promptContent = buildCursorPrompt(userRequest, isFirstMessage);

          // Run Cursor Agent with streaming JSON output

          // Escape the prompt for shell
          const escapedPrompt = promptContent
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");

          const cursorResult = await sandbox.runCommand({
            cmd: "cursor-agent",
            args: [
              "-p",
              "--force",
              "--output-format",
              "stream-json",
              "--stream-partial-output",
              escapedPrompt,
            ],
            env: {
              CURSOR_API_KEY: process.env.CURSOR_API_KEY || "",
            },
          });

          // Parse and stream Cursor output
          const cursorStdout = await cursorResult.stdout();
          let assistantResponse = "";

          if (cursorStdout) {
            // Parse JSON stream line by line
            const lines = cursorStdout.split("\n").filter((l) => l.trim());

            for (const line of lines) {
              try {
                const event = JSON.parse(line);

                if (event.type === "assistant") {
                  // Stream assistant thinking
                  const content = event.message?.content?.[0]?.text || "";
                  assistantResponse += content;
                  controller.enqueue(encoder.encode(content));
                } else if (event.type === "tool_call") {
                  // Show tool usage
                  if (event.subtype === "started") {
                    const toolMessage = (() => {
                      if (event.tool_call?.writeToolCall) {
                        const path =
                          event.tool_call.writeToolCall.args?.path || "file";
                        return `\n[Writing ${path}...]\n`;
                      } else if (event.tool_call?.readToolCall) {
                        const path =
                          event.tool_call.readToolCall.args?.path || "file";
                        return `\n[Reading ${path}...]\n`;
                      } else if (event.tool_call?.editToolCall) {
                        const path =
                          event.tool_call.editToolCall.args?.path || "file";
                        return `\n[Editing ${path}...]\n`;
                      }
                      return "";
                    })();

                    if (toolMessage) {
                      assistantResponse += toolMessage;
                      controller.enqueue(encoder.encode(toolMessage));
                    }
                  }
                } else if (event.type === "result") {
                  // Task completed
                  const duration = event.duration_ms || 0;
                  const completionMessage = `\n\n[Completed in ${duration}ms]\n`;
                  assistantResponse += completionMessage;
                  controller.enqueue(encoder.encode(completionMessage));
                }
              } catch (e) {
                // Ignore malformed JSON lines
                console.error("Failed to parse JSON line:", e);
              }
            }

            // Save assistant's response to Redis
            if (assistantResponse) {
              await saveChatMessage(
                presentationId,
                "assistant",
                assistantResponse
              );
            }
          }

          if (cursorResult.exitCode !== 0) {
            const stderr = await cursorResult.stderr();
            throw new Error(`Cursor CLI failed: ${stderr || "Unknown error"}`);
          }

          // Read the final presentation.md
          const readResult = await sandbox.runCommand({
            cmd: "cat",
            args: ["presentation.md"],
          });

          if (readResult.exitCode !== 0) {
            throw new Error("Failed to read presentation.md");
          }

          const finalContent = (await readResult.stdout()) || "";

          // Send the final content marker
          controller.enqueue(encoder.encode("__FINAL_CONTENT__\n"));
          controller.enqueue(encoder.encode(finalContent));

          controller.close();
        } catch (error) {
          console.error("Sandbox error:", error);
          controller.enqueue(
            encoder.encode(
              `\n\nError: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
          controller.close();
        }
        // Note: We don't stop the sandbox - it will be reused for future requests
        // Sandbox will auto-expire after 15 minutes of inactivity
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
