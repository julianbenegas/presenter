export interface ParsedSlide {
  visible: string;
  notes: string;
}

/**
 * Split markdown content by slide separator (---)
 */
export function splitSlides(content: string): string[] {
  return content.split(/\n---\n/).filter((slide) => slide.trim().length > 0);
}

/**
 * Extract presenter notes from a slide.
 * Based on iA Presenter rules:
 * - Headlines (starting with #) are always visible
 * - Images (lines starting with !) are always visible
 * - Videos (lines starting with <video) are always visible
 * - Code blocks (``` ... ```) are always visible
 * - Body text without tabs is notes (not visible to audience)
 * - Text with tabs (⇥) or 2+ spaces at the start is visible to audience
 */
export function extractPresenterNotes(slide: string): ParsedSlide {
  const lines = slide.split("\n");
  const visibleLines: string[] = [];
  const noteLines: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for code block fence
    if (trimmedLine.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      visibleLines.push(line);
      continue;
    }

    // If inside code block, always add to visible
    if (inCodeBlock) {
      visibleLines.push(line);
      continue;
    }

    // Headlines are always visible
    if (trimmedLine.startsWith("#")) {
      visibleLines.push(line);
    }
    // Images are always visible (regardless of indentation)
    else if (trimmedLine.startsWith("!")) {
      visibleLines.push(line);
    }
    // Videos are always visible (regardless of indentation)
    else if (trimmedLine.startsWith("<video")) {
      visibleLines.push(line);
    }
    // Lines starting with tab or 2+ spaces are visible
    else if (line.startsWith("\t") || line.startsWith("  ")) {
      visibleLines.push(line.replace(/^\t|^  /, ""));
    }
    // Everything else is presenter notes
    else if (trimmedLine.length > 0) {
      noteLines.push(line);
    }
    // Preserve empty lines in their respective sections
    else if (visibleLines.length > 0 || noteLines.length > 0) {
      if (noteLines.length > visibleLines.length) {
        noteLines.push(line);
      } else {
        visibleLines.push(line);
      }
    }
  }

  return {
    visible: visibleLines.join("\n").trim(),
    notes: noteLines.join("\n").trim(),
  };
}

/**
 * Extract the first H1 title from markdown content
 */
export function extractTitle(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return "Untitled Presentation";
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
