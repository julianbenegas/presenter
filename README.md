# Presenter

A web-based presentation app inspired by [iA Presenter](https://ia.net/presenter), built with Next.js and AI.

Just write. Focus on the words you want to say. Write markdown, separate slides with `---`, and the app handles the layout.

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with your Anthropic API key:

   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- 🤖 **Claude Agent-powered** - AI that actually edits your files with precision
- 📝 **Markdown editing** - Write in markdown with syntax highlighting (CodeMirror)
- 🎨 **Side-by-side view** - See your markdown and rendered slides simultaneously
- 🔄 **Tab sync** - Navigation syncs between present window and main editor
- 📱 **Responsive slides** - Auto-layout adapts to screen size
- 💬 **AI chat** - Refine your presentation through conversation with Claude Agent
- 💾 **Local storage** - No database needed, everything in localStorage
- ⚡ **Real-time streaming** - Watch the agent think and edit in real-time

## How to Use

### Create a Presentation

1. Enter what you want to present about on the home page
2. AI generates a complete presentation with slides
3. Refine through the AI chat or edit markdown directly

### Markdown Format

Based on iA Presenter conventions:

```markdown
# Title

Presenter notes (not visible to audience).

---

    Indented text is visible

## Slide Title

More notes here.
```

- Headlines (with #) are always visible
- Body text = presenter notes (only you see)
- Indented text (tab or 4 spaces) = visible on slide
- `---` separates slides

### Present Mode

1. Click "Present" in the editor
2. Opens a new window with slide display
3. Use prev/next controls to navigate
4. Presenter notes appear below slides
5. Navigation syncs via BroadcastChannel API

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **AI**: Claude Agent SDK with file-based editing
- **Model**: Anthropic Claude (via Agent SDK)
- **Editor**: CodeMirror 6 with custom markdown syntax highlighting
- **Rendering**: react-markdown
- **Storage**: localStorage + temp file system for agent operations
- **Sync**: BroadcastChannel API

See [SETUP.md](./SETUP.md) for detailed documentation.
