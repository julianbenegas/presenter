"use client";

import { useEffect, useState, use, useRef } from "react";
import { SlideView } from "@/components/SlideView";
import { getPresentation } from "@/lib/storage";
import { splitSlides, extractPresenterNotes } from "@/lib/markdown";
import { createBroadcastChannel, listenToSlideChanges } from "@/lib/broadcast";

export default function PresentPage({
  params,
}: {
  params: Promise<{ presentationId: string }>;
}) {
  const { presentationId } = use(params);
  const [content, setContent] = useState("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load presentation content
  useEffect(() => {
    const loadPresentation = () => {
      const presentation = getPresentation(presentationId);
      if (presentation) {
        setContent(presentation.content);
      }
    };

    loadPresentation();

    // Listen for content updates
    const handleStorageChange = () => {
      loadPresentation();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("presentations-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("presentations-updated", handleStorageChange);
    };
  }, [presentationId]);

  // Listen for slide changes via BroadcastChannel
  useEffect(() => {
    const channel = createBroadcastChannel(presentationId);

    const cleanup = listenToSlideChanges(channel, (slideIndex) => {
      setCurrentSlideIndex(slideIndex);
    });

    return () => {
      cleanup?.();
    };
  }, [presentationId]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes (e.g., user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts: F key to toggle fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // Auto-enter fullscreen on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        toggleFullscreen();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const slides = splitSlides(content);
  const currentSlide = slides[currentSlideIndex] || "";
  const { visible } = extractPresenterNotes(currentSlide);

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen flex items-center justify-center bg-white overflow-hidden"
    >
      <div className="w-full h-full flex items-center justify-center">
        {visible ? (
          <SlideView content={visible} />
        ) : (
          <div className="text-gray-400 text-center">
            {content ? "No content on this slide" : "No presentation content"}
          </div>
        )}
      </div>

      {/* Fullscreen hint (only show when not in fullscreen) */}
      {!isFullscreen && (
        <div className="fixed top-8 right-8 bg-gray-900 bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          Press <kbd className="px-2 py-1 bg-gray-700 rounded">F</kbd> for
          fullscreen
        </div>
      )}
    </div>
  );
}
