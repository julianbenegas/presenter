# Vercel Sandbox + Cursor CLI Integration 🚀

This document describes how we integrated **Cursor CLI** within **Vercel Sandbox** to enable AI-powered presentation editing that works both locally and in production on Vercel.

## The Problem

The Claude Agent SDK requires the `claude` CLI executable to be installed, which:

- ❌ Works great locally
- ❌ Doesn't work on Vercel's serverless environment
- ❌ Can't be bundled or deployed easily

## The Solution

Use **Vercel Sandbox** ([docs](https://vercel.com/docs/vercel-sandbox)) to create isolated containers where we can:

- ✅ Install the Cursor CLI dynamically
- ✅ Run AI agents in a secure environment
- ✅ Access the file system for editing
- ✅ Stream results back in real-time
- ✅ Deploy to production without issues

## How It Works

### Architecture

```
User Request
    ↓
API Route (/[presentationId]/chat)
    ↓
Create Vercel Sandbox
    ↓
Install Cursor CLI (npm install -g @cursorai/cli)
    ↓
Write Files (sample.md, presentation.md, prompt.txt)
    ↓
Run Cursor CLI Headless Mode
    ↓
Read Updated presentation.md
    ↓
Stream Back to Client
    ↓
Update UI
```

### Key Components

1. **Sandbox Creation**

   ```typescript
   const sandbox = await Sandbox.create({
     resources: { vcpus: 2 },
     timeout: ms("5m"),
     runtime: "node22",
   });
   ```

2. **Cursor CLI Installation**

   ```typescript
   await sandbox.runCommand({
     cmd: "bash",
     args: ["-c", "curl https://cursor.com/install -fsSL | bash"],
   });
   
   // Verify installation
   await sandbox.runCommand({
     cmd: "cursor-agent",
     args: ["--version"],
   });
   ```

3. **File Writing via Heredoc**

   ```typescript
   await sandbox.runCommand({
     cmd: "bash",
     args: ["-c", `cat > presentation.md << 'EOF'\n${content}\nEOF`],
   });
   ```

4. **Running Cursor Agent**

   ```typescript
   await sandbox.runCommand({
     cmd: "cursor-agent",
     args: [
       "headless",
       "--prompt-file",
       "prompt.txt",
       "--files",
       "presentation.md",
       "sample.md",
     ],
     env: { CURSOR_API_KEY: process.env.CURSOR_API_KEY },
   });
   ```

5. **Reading Results**
   ```typescript
   const result = await sandbox.runCommand({
     cmd: "cat",
     args: ["presentation.md"],
   });
   const finalContent = await result.stdout();
   ```

## Environment Variables

Required environment variables:

```bash
# Cursor API Key (for Cursor CLI)
CURSOR_API_KEY=your_cursor_api_key

# Vercel OIDC Token (automatically provided by Vercel in production)
# For local development, run: vercel env pull
VERCEL_OIDC_TOKEN=your_vercel_oidc_token
```

## Local Development Setup

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Link Project**

   ```bash
   vercel link
   ```

3. **Pull Environment Variables**

   ```bash
   vercel env pull
   ```

   This creates `.env.local` with `VERCEL_OIDC_TOKEN` for local sandbox authentication.

4. **Add Cursor API Key**
   Add to `.env.local`:

   ```
   CURSOR_API_KEY=your_cursor_api_key
   ```

5. **Run Dev Server**
   ```bash
   bun run dev
   ```

## Production Deployment

1. **Add Environment Variable**
   In Vercel Dashboard → Your Project → Settings → Environment Variables:

   - Add `CURSOR_API_KEY` with your Cursor API key

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Vercel handles:**
   - ✅ OIDC token management (no expiration issues)
   - ✅ Sandbox infrastructure
   - ✅ Scaling and isolation

## Features

### What Works

- ✅ **Dynamic CLI Installation**: Cursor CLI installed fresh in each sandbox
- ✅ **File-Based Editing**: AI can read, edit, and write markdown files
- ✅ **Streaming Output**: Real-time updates as Cursor processes
- ✅ **Secure Isolation**: Each request gets its own container
- ✅ **Format Reference**: `sample.md` provided as reference for proper formatting
- ✅ **Surgical Edits**: Can make precise changes to specific slides
- ✅ **Context Aware**: Understands current presentation state

### Prompt Strategy

**First Message (Generation):**

```
Create a compelling presentation based on: "{user request}"

- Follow format rules from sample.md
- Create 5-10 well-structured slides
- Save result to presentation.md
```

**Follow-up Messages (Editing):**

```
Edit the presentation based on: "{user request}"

Current presentation.md:
[current content]

- Make surgical edits
- Don't regenerate unless asked
- Follow format rules from sample.md
```

## Performance

- **Sandbox Creation**: ~2-5 seconds
- **CLI Installation**: ~10-15 seconds (first time in sandbox)
- **AI Processing**: ~5-20 seconds (depending on task)
- **Total**: ~20-40 seconds per request

## Costs

Vercel Sandbox pricing (as of 2025):

- **Hobby**: 45 min max timeout, usage-based pricing
- **Pro**: 5 hour max timeout, included minutes + usage-based
- **Enterprise**: Custom limits and pricing

Typical usage per request:

- 2 vCPUs × ~30 seconds = ~0.017 vCPU-hours

See [Vercel Sandbox Pricing](https://vercel.com/docs/vercel-sandbox#pricing-and-limits) for details.

## Observability

### View Running Sandboxes

1. Go to your project in Vercel Dashboard
2. Click **Observability** tab
3. Click **Sandboxes** in left sidebar
4. See all active sandboxes, their command history, and URLs

### Monitoring

- Sandbox creation logs streamed to client
- CLI installation status messages
- AI processing output
- Error messages with stack traces

## Cleanup

Sandboxes are automatically stopped:

- ✅ When timeout expires (5 min default)
- ✅ When explicitly stopped via `sandbox.stop()`
- ✅ When the response stream closes

No manual cleanup needed!

## Error Handling

```typescript
try {
  // Sandbox operations
} catch (error) {
  console.error("Sandbox error:", error);
  // Stream error to client
  controller.enqueue(encoder.encode(`Error: ${error.message}`));
} finally {
  // Always clean up sandbox
  if (sandbox) {
    await sandbox.stop();
  }
}
```

## Advantages Over Other Approaches

### vs Regular Anthropic SDK

- ✅ File-based editing (more reliable)
- ✅ Can verify its own work
- ✅ Better at surgical edits
- ✅ Format reference always available

### vs Claude Agent SDK Locally Only

- ✅ Works in production
- ✅ No deployment issues
- ✅ Same experience everywhere

### vs Self-Hosting

- ✅ No infrastructure management
- ✅ Automatic scaling
- ✅ Vercel-native solution

### vs External Worker Service

- ✅ No extra services
- ✅ Simpler architecture
- ✅ One deployment

## Future Enhancements

Potential improvements:

- Cache CLI installation (reuse sandboxes)
- Parallel sandbox creation for faster response
- Progress indicators for each step
- Retry logic for transient failures
- Support for multiple file formats
- Image generation in sandbox

## Troubleshooting

### "Failed to install Cursor CLI"

- Check CURSOR_API_KEY is set
- Verify npm registry is accessible
- Check sandbox timeout isn't too short

### "VERCEL_OIDC_TOKEN not found"

- Run `vercel env pull` locally
- In production, Vercel provides this automatically

### "Cursor CLI failed"

- Check CURSOR_API_KEY is valid
- Verify prompt file was written correctly
- Check sandbox logs in Vercel Dashboard

### Sandbox timeout

- Increase timeout: `timeout: ms("10m")`
- Optimize prompt for faster responses
- Reduce number of files processed

## Example Request Flow

1. User: "Create a presentation about climate change"
2. API creates sandbox: `[Creating secure environment...]`
3. Install CLI: `[Installing Cursor CLI...]`
4. Setup files: `[Setting up files...]`
5. Run AI: `[Running AI agent...]`
6. Stream thinking: "I'll create 8 slides covering..."
7. Final content: `__FINAL_CONTENT__` + full markdown
8. Client updates editor
9. Sandbox auto-stops

## Success Metrics

✅ Works locally with `bun run dev`
✅ Deploys successfully to Vercel
✅ No "executable not found" errors
✅ Streaming works in real-time
✅ Files are properly created and read
✅ AI editing maintains format rules
✅ Cleanup happens automatically

---

**This is production-ready AI-powered editing!** 🎉

Built with:

- [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox)
- [Cursor CLI](https://cursor.com/docs/cli/headless)
- Next.js 15
- Vercel Functions
