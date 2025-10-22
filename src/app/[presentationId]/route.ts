import { query } from "@anthropic-ai/claude-agent-sdk";
import { writeFile, readFile, mkdir, copyFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Helper to create temp directory for presentation
async function ensureTempDir(presentationId: string): Promise<string> {
  const tempDir = join("/tmp", `presenter-${presentationId}`);
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
  return tempDir;
}

// Helper to build the agent prompt
function buildAgentPrompt(
  userRequest: string,
  isFirstMessage: boolean
): string {
  if (isFirstMessage) {
    return `You are an expert presentation designer. Create a compelling presentation in markdown format based on this request: "${userRequest}"

The presentation file is at presentation.md in the current directory.

IMPORTANT FORMAT RULES (see sample.md for examples):
- Separate slides with "---" (three hyphens on their own line)
- Headlines (#, ##, ###) are always visible on slides
- Body text WITHOUT tabs/indentation = presenter notes (only speaker sees)
- Text WITH tabs (⇥) or 4 spaces at start = visible on slide to audience
- Keep slides simple and focused

Use the Write tool to create presentation.md with 5-10 well-structured slides.`;
  }

  return `Edit the presentation based on this request: "${userRequest}"

The current presentation is in presentation.md. Use Read to see it, then Edit to make precise changes.

Remember the format rules (see sample.md):
- "---" separates slides
- Headlines are visible
- Body text = notes
- Indented text = visible on slides

Make surgical edits - don't regenerate unless asked.`;
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

    // Setup temp directory
    const tempDir = await ensureTempDir(presentationId);
    const presentationPath = join(tempDir, "presentation.md");
    const samplePath = join(tempDir, "sample.md");

    // Write current content to temp file
    await writeFile(presentationPath, currentContent || "");

    // Copy sample.md to temp directory as reference
    const sourceSamplePath = join(process.cwd(), "public", "sample.md");
    if (existsSync(sourceSamplePath)) {
      await copyFile(sourceSamplePath, samplePath);
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Run Claude Agent SDK
          // Note: ANTHROPIC_API_KEY env var is automatically picked up
          const agentQuery = query({
            prompt: buildAgentPrompt(userRequest, isFirstMessage),
            options: {
              continue: !isFirstMessage, // Continue conversation context
              cwd: tempDir,
              allowedTools: ["Edit", "Read", "Write"],
              maxTurns: isFirstMessage ? 3 : 5,
            },
          });

          // Stream agent messages
          for await (const message of agentQuery) {
            if (message.type === "assistant") {
              // Stream agent thinking - extract text from message content
              const content = message.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === "text") {
                    controller.enqueue(encoder.encode(block.text));
                  } else if (block.type === "tool_use") {
                    // Stream tool usage info
                    const toolInfo = `\n[Using ${block.name}...]\n`;
                    controller.enqueue(encoder.encode(toolInfo));
                  }
                }
              }
            } else if (message.type === "result") {
              // Agent finished, read the final file
              try {
                const finalContent = await readFile(presentationPath, "utf-8");
                // Send a special marker followed by the content
                controller.enqueue(encoder.encode("\n\n__FINAL_CONTENT__\n"));
                controller.enqueue(encoder.encode(finalContent));
              } catch (err) {
                console.error("Error reading final content:", err);
                controller.enqueue(
                  encoder.encode("\n\nError reading presentation file.")
                );
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Agent error:", error);
          controller.enqueue(
            encoder.encode(
              `\n\nError: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
          controller.close();
        }
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
