import { BroadcastMessage } from "@/types";

const CHANNEL_NAME = "presenter-sync";

/**
 * Create a BroadcastChannel for syncing slide navigation between tabs
 */
export function createBroadcastChannel(presentationId: string) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }

  const channel = new BroadcastChannel(`${CHANNEL_NAME}-${presentationId}`);
  return channel;
}

/**
 * Send a slide change message to all listening tabs
 */
export function broadcastSlideChange(
  channel: BroadcastChannel | null,
  slideIndex: number
): void {
  if (!channel) return;

  const message: BroadcastMessage = {
    type: "slide-change",
    slideIndex,
  };

  channel.postMessage(message);
}

/**
 * Listen for slide change messages
 */
export function listenToSlideChanges(
  channel: BroadcastChannel | null,
  callback: (slideIndex: number) => void
): (() => void) | null {
  if (!channel) return null;

  const handler = (event: MessageEvent<BroadcastMessage>) => {
    if (event.data.type === "slide-change") {
      callback(event.data.slideIndex);
    }
  };

  channel.addEventListener("message", handler);

  // Return cleanup function
  return () => {
    channel.removeEventListener("message", handler);
    channel.close();
  };
}
