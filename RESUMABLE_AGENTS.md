# Cursor Resumable Agents Implementation

## Overview

This document describes how we migrated from manually managing chat history to using Cursor's built-in resumable agent feature via the `--resume` flag.

## Key Changes

### Before: Manual Chat History Management

Previously, the system:

1. Stored all chat messages in Redis
2. Retrieved chat history and wrote it to `.cursor/chat-history.txt` in the sandbox
3. Expected Cursor to read this file for context

**Problems:**

- Manual history management was redundant
- No guarantee Cursor would read the history file
- Required extra Redis operations and file I/O
- Chat context could get lost or inconsistent

### After: Native Resumable Conversations

Now the system:

1. Stores only the Cursor thread ID in Redis
2. Uses `--resume [thread_id]` for subsequent messages
3. Lets Cursor manage the conversation state natively

**Benefits:**

- ✅ Native conversation continuity handled by Cursor
- ✅ No manual history serialization/deserialization
- ✅ Cleaner code with less complexity
- ✅ Guaranteed conversation context preservation
- ✅ Aligns with Cursor's recommended workflow

## Implementation Details

### Redis Keys

```typescript
const THREAD_ID_KEY = (presentationId: string) =>
  `cursor:${presentationId}:thread_id`;
```

Each presentation has its own thread ID stored with a 1-hour TTL (matching the sandbox lifetime).

### Session ID Management

```typescript
// Get existing session ID (thread ID)
async function getThreadId(presentationId: string): Promise<string | null>;

// Save session ID after conversation
async function saveThreadId(
  presentationId: string,
  threadId: string
): Promise<void>;
```

Note: The function names use "ThreadId" for semantic clarity, but they actually store Cursor's `session_id` field.

### Cursor Agent Invocation

For the **first message** (no existing thread):

```bash
cursor-agent -p --force --output-format stream-json --stream-partial-output "prompt"
```

For **subsequent messages** (with existing thread):

```bash
cursor-agent -p --force --output-format stream-json --stream-partial-output --resume [thread_id] "prompt"
```

### Session ID Extraction

The session ID is extracted from the Cursor output stream when the task completes:

```typescript
if (event.type === "result") {
  // Capture session ID if present (used for --resume)
  if (event.session_id) {
    sessionId = event.session_id;
  }
}

// After streaming completes
if (sessionId) {
  await saveThreadId(presentationId, sessionId);
}
```

**Important:** Cursor CLI uses `session_id` in the JSON output, not `thread_id`. This `session_id` is what you pass to the `--resume` flag.

## Architecture Flow

```
User sends message
    ↓
Check Redis for existing thread ID
    ↓
    ├─ Thread ID exists → Use --resume [thread_id]
    └─ No thread ID → Start new conversation
    ↓
Run cursor-agent with appropriate flags
    ↓
Parse stream-json output
    ↓
Extract session_id from result event
    ↓
Save session ID to Redis
    ↓
Return response to user
```

## Code Changes Summary

### Removed Functions

- `saveChatMessage()` - No longer needed
- `getChatHistory()` - No longer needed
- `writeChatHistoryToSandbox()` - No longer needed

### Added Functions

- `getThreadId()` - Retrieve thread ID from Redis
- `saveThreadId()` - Store thread ID in Redis

### Modified Logic

- Added `existingThreadId` check at request start
- Conditionally add `--resume` flag to cursor-agent args
- Extract and save `thread_id` from Cursor output

### Redis Keys Changed

- Removed: `chat:${presentationId}:history`
- Added: `cursor:${presentationId}:thread_id`

## Per-Sandbox Behavior

As mentioned in the user's note: In sandbox environments, there will typically be one conversation thread per sandbox. This is perfect for our use case where each presentation gets its own sandbox.

The 1-hour TTL on both the sandbox ID and thread ID ensures they expire together, maintaining consistency.

## Testing Considerations

To test resumable conversations:

1. Send an initial message to create a presentation
2. Verify thread ID is stored in Redis
3. Send a follow-up message referencing the previous conversation
4. Verify Cursor maintains context (e.g., "change the title of slide 2")
5. Check that thread ID persists across multiple messages

## Future Improvements

Potential enhancements:

- Use `cursor-agent ls` to list conversation history
- Implement conversation reset functionality
- Add thread ID to API responses for debugging
- Monitor thread ID expiration and handle gracefully
