"use client";

import { useEffect, useState, use } from "react";
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

  const slides = splitSlides(content);
  const currentSlide = slides[currentSlideIndex] || "";
  const { visible } = extractPresenterNotes(currentSlide);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black">
      <div className="w-full max-w-6xl aspect-video bg-white rounded-lg p-16 flex items-center justify-center">
        {visible ? (
          <SlideView content={visible} />
        ) : (
          <div className="text-gray-400 text-center">
            {content ? "No content on this slide" : "No presentation content"}
          </div>
        )}
      </div>

      {/* Slide indicator */}
      <div className="fixed bottom-8 right-8 bg-white bg-opacity-80 px-4 py-2 rounded-lg text-sm">
        {slides.length > 0
          ? `${currentSlideIndex + 1} / ${slides.length}`
          : "No slides"}
      </div>
    </div>
  );
}
