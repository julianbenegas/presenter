import { Presentation, PresentationChat } from "@/types";

const PRESENTATIONS_KEY = "presentations";
const CHATS_KEY = "chats";

// Presentations
export function getAllPresentations(): Presentation[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(PRESENTATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getPresentation(id: string): Presentation | null {
  const presentations = getAllPresentations();
  return presentations.find((p) => p.id === id) || null;
}

export function savePresentation(presentation: Presentation): void {
  const presentations = getAllPresentations();
  const index = presentations.findIndex((p) => p.id === presentation.id);

  if (index >= 0) {
    presentations[index] = presentation;
  } else {
    presentations.push(presentation);
  }

  localStorage.setItem(PRESENTATIONS_KEY, JSON.stringify(presentations));
}

export function deletePresentation(id: string): void {
  const presentations = getAllPresentations();
  const filtered = presentations.filter((p) => p.id !== id);
  localStorage.setItem(PRESENTATIONS_KEY, JSON.stringify(filtered));
}

// Chats
export function getChat(presentationId: string): PresentationChat | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(`${CHATS_KEY}_${presentationId}`);
  return data ? JSON.parse(data) : null;
}

export function saveChat(chat: PresentationChat): void {
  localStorage.setItem(
    `${CHATS_KEY}_${chat.presentationId}`,
    JSON.stringify(chat)
  );
}

export function deleteChat(presentationId: string): void {
  localStorage.removeItem(`${CHATS_KEY}_${presentationId}`);
}
