"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import { Play, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { Chat } from "@/components/Chat";
import { SlideView } from "@/components/SlideView";
import { ViewMode, ChatMessage } from "@/types";
import {
  getPresentation,
  savePresentation,
  getChat,
  saveChat,
} from "@/lib/storage";
import { splitSlides, extractPresenterNotes } from "@/lib/markdown";
import { createBroadcastChannel, broadcastSlideChange } from "@/lib/broadcast";
import { VerticalResizeHandle } from "@/components/VerticalResizeHandle";

const NOTES_HEIGHT_KEY = "presenter-notes-height";
const DEFAULT_NOTES_HEIGHT = 192;
const MIN_NOTES_HEIGHT = 100;
const MAX_NOTES_HEIGHT = 400;

export default function PresentationPage({
  params,
}: {
  params: Promise<{ presentationId: string }>;
}) {
  const { presentationId } = use(params);
  const searchParams = useSearchParams();
  const initialPrompt = searchParams?.get("prompt");

  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [broadcastChannel, setBroadcastChannel] =
    useState<BroadcastChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notesHeight, setNotesHeight] = useState(DEFAULT_NOTES_HEIGHT);

  // Load saved notes height
  useEffect(() => {
    const savedHeight = localStorage.getItem(NOTES_HEIGHT_KEY);
    if (savedHeight) {
      setNotesHeight(parseInt(savedHeight, 10));
    }
  }, []);

  const handleNotesResize = (newHeight: number) => {
    setNotesHeight(newHeight);
    localStorage.setItem(NOTES_HEIGHT_KEY, newHeight.toString());
  };

  // Initialize broadcast channel
  useEffect(() => {
    const channel = createBroadcastChannel(presentationId);
    setBroadcastChannel(channel);

    return () => {
      channel?.close();
    };
  }, [presentationId]);

  // Load presentation on mount
  useEffect(() => {
    const presentation = getPresentation(presentationId);
    if (presentation) {
      setContent(presentation.content);
    }

    // Load chat history
    const chat = getChat(presentationId);
    if (chat) {
      setMessages(chat.messages);
    }

    setIsInitialized(true);
  }, [presentationId]);

  // Send initial prompt if present
  useEffect(() => {
    if (isInitialized && initialPrompt && messages.length === 0) {
      handleSendMessage(initialPrompt, true);
    }
  }, [isInitialized, initialPrompt]);

  // Auto-save content
  const handleContentChange = useCallback(
    (newContent: string) => {
      // Only save if content actually changed
      if (newContent === content) return;

      setContent(newContent);
      savePresentation({
        id: presentationId,
        title: "Presentation",
        content: newContent,
        updatedAt: Date.now(), // Only updates when content changes
      });
      window.dispatchEvent(new Event("presentations-updated"));
    },
    [presentationId, content]
  );

  // Handle chat messages
  const handleSendMessage = useCallback(
    async (message: string, isInitial = false) => {
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      // Save user message
      saveChat({
        presentationId,
        messages: updatedMessages,
      });

      try {
        const response = await fetch(`/${presentationId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            currentContent: content, // Send current presentation content
          }),
        });

        if (!response.ok) throw new Error("Failed to get response");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let agentThinking = "";

        // Create a temporary streaming message
        const streamingMessage: ChatMessage = {
          role: "assistant",
          content: "",
        };
        setMessages([...updatedMessages, streamingMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedText += chunk;

          // Check if we have the final content marker
          if (accumulatedText.includes("__FINAL_CONTENT__")) {
            const parts = accumulatedText.split("__FINAL_CONTENT__");
            agentThinking = parts[0];
            const finalContent = parts[1] || "";

            // Update presentation with final content
            setContent(finalContent);
            savePresentation({
              id: presentationId,
              title: "Presentation",
              content: finalContent,
              updatedAt: Date.now(),
            });

            // Save agent's thinking as chat message
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: agentThinking.trim() || "Presentation updated!",
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);

            saveChat({
              presentationId,
              messages: finalMessages,
            });

            window.dispatchEvent(new Event("presentations-updated"));
            break;
          } else {
            // Update streaming message in real-time
            streamingMessage.content = accumulatedText;
            setMessages([...updatedMessages, { ...streamingMessage }]);
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [content, presentationId, messages]
  );

  // Handle slide navigation
  const slides = splitSlides(content);
  const currentSlide = slides[currentSlideIndex] || "";
  const { visible: currentSlideVisible, notes: currentSlideNotes } =
    extractPresenterNotes(currentSlide);

  const handlePrevSlide = () => {
    const newIndex = Math.max(0, currentSlideIndex - 1);
    setCurrentSlideIndex(newIndex);
    broadcastSlideChange(broadcastChannel, newIndex);
  };

  const handleNextSlide = () => {
    const newIndex = Math.min(slides.length - 1, currentSlideIndex + 1);
    setCurrentSlideIndex(newIndex);
    broadcastSlideChange(broadcastChannel, newIndex);
  };

  const handlePresentClick = () => {
    // Open present window
    window.open(`/${presentationId}/present`, "_blank");
    // Switch to present mode
    setViewMode("present");
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* View mode toggle */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          {viewMode === "present" ? (
            <>
              <div className="text-sm text-gray-600">
                Slide {currentSlideIndex + 1} of {slides.length}
              </div>
              <button
                onClick={() => setViewMode("side-by-side")}
                className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                <X size={16} />
                Exit Present
              </button>
            </>
          ) : (
            <>
              <div></div>
              <button
                onClick={handlePresentClick}
                className="flex items-center gap-2 px-4 py-2 rounded bg-black text-white hover:bg-gray-800 cursor-pointer"
              >
                <Play size={16} />
                Present
              </button>
            </>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex">
          {viewMode === "side-by-side" && (
            <>
              <div className="flex-1 overflow-auto border-r border-gray-200">
                <Editor
                  value={content}
                  onChange={handleContentChange}
                  className="h-full"
                />
              </div>
              <div className="flex-1 overflow-auto p-8">
                {slides.length > 0 ? (
                  <div className="space-y-8">
                    {slides.map((slide, index) => {
                      const { visible } = extractPresenterNotes(slide);
                      return (
                        <div
                          key={index}
                          className="border border-gray-200 p-8 rounded-lg aspect-video flex items-center justify-center"
                        >
                          <SlideView content={visible} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center mt-8">
                    No slides yet
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === "present" && (
            <div className="flex-1 flex flex-col">
              {/* Slide display */}
              <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-4xl aspect-video border border-gray-200 rounded-lg bg-white p-12 flex items-center justify-center">
                  {currentSlideVisible ? (
                    <SlideView content={currentSlideVisible} />
                  ) : (
                    <div className="text-gray-400">No content</div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="border-t border-gray-200 p-4 flex items-center justify-center gap-4">
                <button
                  onClick={handlePrevSlide}
                  disabled={currentSlideIndex === 0}
                  className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>

              {/* Presenter notes - resizable */}
              <VerticalResizeHandle
                onResize={handleNotesResize}
                minHeight={MIN_NOTES_HEIGHT}
                maxHeight={MAX_NOTES_HEIGHT}
              />
              <div
                className="border-t border-gray-200 p-4 overflow-y-auto bg-gray-50"
                style={{ height: `${notesHeight}px` }}
              >
                <div className="text-sm font-bold mb-2">Presenter Notes:</div>
                <div className="text-sm whitespace-pre-wrap">
                  {currentSlideNotes || "No notes for this slide"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Chat
        presentationId={presentationId}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
