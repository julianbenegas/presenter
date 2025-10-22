# Quick Start Guide

## Get Running in 3 Steps

### 1. Set Your API Key

Create a file named `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Get your key from: https://platform.openai.com/api-keys

### 2. Start the Server

```bash
npm run dev
```

### 3. Open Your Browser

Navigate to: http://localhost:3000

## First Presentation

1. Type what you want to present about (e.g., "Why dogs are better than cats")
2. Press "Create Presentation"
3. Watch as AI generates your slides
4. Edit the markdown or chat with AI to refine
5. Click "Present" to show your slides

## View Modes

- **Edit**: Write and edit markdown
- **Side by side**: See editor and slide previews
- **Present**: Full slide view with controls

## Markdown Tips

```markdown
# This is a title (always visible)

This is a note (only you see it).

---

    Indent text to show it on the slide

## Slide heading

More notes here.
```

## Shortcuts

- `---` on its own line = new slide
- Lines starting with `#` = headings (visible)
- Indented lines (tab or 4 spaces) = visible text
- Regular lines = presenter notes (hidden from audience)

## Need Help?

- See **README.md** for features overview
- See **SETUP.md** for detailed documentation
- See **IMPLEMENTATION_SUMMARY.md** for technical details

## Common Issues

**AI not responding?**

- Check your `.env.local` has the correct `OPENAI_API_KEY`
- Ensure you have API credits in your OpenAI account

**Slides not syncing between tabs?**

- BroadcastChannel API requires same origin
- Works in localhost automatically
- Requires HTTPS in production

**Storage full?**

- localStorage has ~5-10MB limit
- Export important presentations to markdown files
- Clear old presentations you don't need

---

Happy presenting! 🎉
