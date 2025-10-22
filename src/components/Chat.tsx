"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types";
import { ResizeHandle } from "@/components/ResizeHandle";

const CHAT_WIDTH_KEY = "sidebar-right-width";
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

interface ChatProps {
  presentationId: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function Chat({ messages, onSendMessage, isLoading }: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(CHAT_WIDTH_KEY);
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, []);

  const handleResize = (newWidth: number) => {
    setWidth(newWidth);
    localStorage.setItem(CHAT_WIDTH_KEY, newWidth.toString());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-shrink-0">
      <ResizeHandle
        onResize={handleResize}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        side="right"
      />
      <div
        className="border-l border-gray-200 dark:border-gray-800 h-screen flex flex-col bg-white dark:bg-black"
        style={{ width: `${width}px` }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold">AI Assistant</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              Start chatting to refine your presentation
            </p>
          ) : (
            messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-black dark:bg-white text-white dark:text-black">
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {message.content}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-gray-200 dark:border-gray-800"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-800 bg-white dark:bg-black rounded focus:outline-none focus:border-black dark:focus:border-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
