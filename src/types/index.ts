export type ViewMode = "edit" | "side-by-side" | "present";

export interface Presentation {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PresentationChat {
  presentationId: string;
  messages: ChatMessage[];
}

export interface BroadcastMessage {
  type: "slide-change";
  slideIndex: number;
}
