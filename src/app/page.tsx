"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { savePresentation } from "@/lib/storage";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent, withAI: boolean = true) => {
    e.preventDefault();
    if (isCreating) return;
    if (withAI && !prompt.trim()) return;

    setIsCreating(true);

    try {
      // Generate a new presentation ID
      const presentationId = nanoid();

      // Create a new presentation in localStorage
      const now = Date.now();
      savePresentation({
        id: presentationId,
        title: "New Presentation",
        content: "",
        updatedAt: now,
      });

      // Redirect to the presentation editor
      if (withAI && prompt.trim()) {
        router.push(`/${presentationId}?prompt=${encodeURIComponent(prompt)}`);
      } else {
        router.push(`/${presentationId}`);
      }
    } catch (error) {
      console.error("Error creating presentation:", error);
      setIsCreating(false);
    }
  };

  const handleBlankClick = () => {
    handleSubmit(new Event("submit") as unknown as React.FormEvent, false);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <h1 className="text-5xl font-bold mb-12 text-center">
            What are you presenting?
          </h1>

          <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. The future of renewable energy"
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:border-black"
              disabled={isCreating}
              autoFocus
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isCreating}
              className="w-full px-6 py-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isCreating ? "Creating..." : "Create with AI"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={handleBlankClick}
            disabled={isCreating}
            className="w-full px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-black hover:text-black disabled:bg-gray-100 disabled:cursor-not-allowed text-lg font-medium"
          >
            Start blank
          </button>
        </div>
      </div>
    </div>
  );
}
