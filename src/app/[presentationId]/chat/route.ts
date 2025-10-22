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

  // For resumable conversations, just send the user's message directly
  // Cursor already has all the context from the previous conversation
  return userRequest;
}

// Helper to escape content for heredoc
function escapeHeredoc(content: string): string {
  // Escape backslashes and dollar signs for heredoc
  return content.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
}

// Redis keys
const SANDBOX_KEY = (presentationId: string) => `sandbox:${presentationId}:id`;
const THREAD_ID_KEY = (presentationId: string) =>
  `cursor:${presentationId}:thread_id`;

// Get or create sandbox for presentation
async function getOrCreateSandbox(
  presentationId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<{ sandbox: Sandbox; reusingSandbox: boolean }> {
  // Check if sandbox exists
  const existingSandboxId = await redis.get<string>(
    SANDBOX_KEY(presentationId)
  );

  let sandbox: Sandbox | null = null;
  let reusingSandbox = false;
  if (existingSandboxId) {
    try {
      sandbox = await Sandbox.get({ sandboxId: existingSandboxId });
      reusingSandbox = true;
    } catch {
      // noop
    }
  }

  if (!sandbox) {
    controller.enqueue(encoder.encode("[Creating secure environment...]\n\n"));
    sandbox = await Sandbox.create({
      resources: { vcpus: 2 },
      timeout: ms("15m"),
      runtime: "node22",
    });
  }

  await redis.setex(SANDBOX_KEY(presentationId), 840, sandbox.sandboxId);

  return { sandbox, reusingSandbox };
}

// Get Cursor agent thread ID from Redis
async function getThreadId(presentationId: string): Promise<string | null> {
  return await redis.get<string>(THREAD_ID_KEY(presentationId));
}

// Save Cursor agent thread ID to Redis
async function saveThreadId(
  presentationId: string,
  threadId: string
): Promise<void> {
  // Set TTL of 1 hour to match sandbox lifetime
  await redis.setex(THREAD_ID_KEY(presentationId), 3600, threadId);
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

    // Get existing thread ID (if any) for resumable conversation
    const existingThreadId = await getThreadId(presentationId);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let sandbox: Sandbox | null = null;
        let isNewSandbox = false;

        try {
          // Get or create sandbox
          const result = await getOrCreateSandbox(
            presentationId,
            controller,
            encoder
          );
          sandbox = result.sandbox;
          isNewSandbox = !result.reusingSandbox;

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

          // Build the prompt
          const promptContent = buildCursorPrompt(userRequest, isFirstMessage);

          // Run Cursor Agent with streaming JSON output
          // Use --resume if we have an existing thread, otherwise start fresh

          // Escape the prompt for shell
          const escapedPrompt = promptContent
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");

          const cursorArgs = [
            "-p",
            "--force",
            "--output-format",
            "stream-json",
            "--stream-partial-output",
          ];

          // Add --resume flag if we have an existing thread ID
          if (existingThreadId) {
            cursorArgs.push("--resume", existingThreadId);
          }

          cursorArgs.push(escapedPrompt);

          const cursorResult = await sandbox.runCommand({
            cmd: "cursor-agent",
            args: cursorArgs,
            env: {
              CURSOR_API_KEY: process.env.CURSOR_API_KEY || "",
            },
          });

          // Parse and stream Cursor output
          const cursorStdout = await cursorResult.stdout();
          let assistantResponse = "";
          let sessionId: string | null = null;

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
                  // Task completed - extract session ID for resumable conversations
                  const duration = event.duration_ms || 0;
                  const completionMessage = `\n\n[Completed in ${duration}ms]\n`;
                  assistantResponse += completionMessage;
                  controller.enqueue(encoder.encode(completionMessage));

                  // Capture session ID if present (used for --resume)
                  if (event.session_id) {
                    sessionId = event.session_id;
                  }
                }
              } catch (e) {
                // Ignore malformed JSON lines
                console.error("Failed to parse JSON line:", e);
              }
            }

            // Save session ID to Redis for future resumption
            if (sessionId) {
              await saveThreadId(presentationId, sessionId);
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
          controller.enqueue(encoder.encode("__FINAL_CONTENT__"));
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
