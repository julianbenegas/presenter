# Presenter App - Setup Guide

A web-based presentation app inspired by iA Presenter, built with Next.js and AI.

## Features

- 🤖 AI-powered presentation generation using OpenAI
- 📝 Markdown-based editing with CodeMirror
- 🎨 Three view modes: Edit, Side-by-side, and Present
- 🔄 Real-time sync between tabs using BroadcastChannel API
- 💾 Local storage for presentations and chat history
- 🎯 Presenter notes support (following iA Presenter conventions)
- 🔁 Resumable AI streaming with Redis support

## Prerequisites

- Node.js 18+ or Bun
- OpenAI API key
- Redis (optional, for resumable streaming in production)

## Installation

1. Install dependencies:

   ```bash
   npm install
   # or
   bun install
   ```

2. Create a `.env.local` file in the root directory:

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here

   # Optional: Redis for resumable streaming
   REDIS_URL=redis://localhost:6379
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Creating Presentations

1. On the home page, enter what you want to present about
2. The AI will generate a complete presentation with multiple slides
3. Presentations are stored in localStorage

### Editing Presentations

- **Edit Mode**: Edit the markdown source with syntax highlighting
- **Side-by-side Mode**: See your editor and slide previews simultaneously
- **Present Mode**: View slides with navigation controls and presenter notes

### Markdown Format

Presentations follow the iA Presenter format:

```markdown
# Title Slide

This is a presenter note (not visible to audience).

---

    Visible text with tab/indent

## Slide Title

More presenter notes here.

---
```

Rules:

- Headlines (starting with #) are always visible
- Body text without tabs = presenter notes (only you see)
- Text with tabs/4 spaces = visible on slide
- Separate slides with `---`

### AI Chat

- Chat with AI to refine your presentation
- The AI can update slides, add content, or restructure
- Chat history is saved per presentation

### Present Mode

1. Click "Present" to enter presentation mode
2. Click "Present" again or use the button to open in a new window
3. Navigation controls in the main window sync with the present window
4. Presenter notes are shown below the slide in the main window

## Architecture

- **Storage**: localStorage for presentations and chat history
- **AI**: OpenAI GPT-4o via AI SDK with resumable streaming
- **Editor**: CodeMirror 6 with markdown syntax highlighting
- **Rendering**: react-markdown for slide display
- **Sync**: BroadcastChannel API for tab communication

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── [presentationId]/
│   │   ├── page.tsx                # Main editor
│   │   └── present/page.tsx        # Present mode window
│   └── api/
│       └── [presentationId]/
│           └── chat/route.ts       # AI chat endpoint
├── components/
│   ├── Chat.tsx                    # Chat interface
│   ├── Editor.tsx                  # CodeMirror editor
│   ├── Sidebar.tsx                 # Presentations list
│   └── SlideView.tsx               # Slide renderer
├── lib/
│   ├── broadcast.ts                # BroadcastChannel utilities
│   ├── markdown.ts                 # Markdown parsing
│   └── storage.ts                  # localStorage utilities
└── types/
    └── index.ts                    # TypeScript types
```

## Development Notes

- The app focuses on layout (flexbox, spacing) not styling (colors, fonts)
- Minimal, functional UI design
- No authentication or database - uses localStorage
- Redis is optional but recommended for production use with resumable-stream

## Troubleshooting

### AI not responding

- Check that OPENAI_API_KEY is set in `.env.local`
- Ensure you have API credits in your OpenAI account

### Present window not syncing

- BroadcastChannel API requires HTTPS in production
- Works in localhost development without HTTPS
- Ensure both tabs are on the same origin

### Storage not persisting

- localStorage is domain-specific
- Clearing browser data will delete presentations
- Export important presentations to markdown files
