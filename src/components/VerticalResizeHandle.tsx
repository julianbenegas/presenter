"use client";

import { useEffect, useState } from "react";

interface VerticalResizeHandleProps {
  onResize: (height: number) => void;
  minHeight: number;
  maxHeight: number;
}

export function VerticalResizeHandle({
  onResize,
  minHeight,
  maxHeight,
}: VerticalResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const constrainedHeight = Math.max(
        minHeight,
        Math.min(maxHeight, newHeight)
      );
      onResize(constrainedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize, minHeight, maxHeight]);

  return (
    <div
      className={`relative h-2 ${
        isDragging ? "bg-blue-500" : "bg-gray-200 hover:bg-blue-400"
      } cursor-row-resize flex-shrink-0 transition-colors`}
      onMouseDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      style={{
        userSelect: "none",
      }}
    >
      {/* Invisible hit area for easier grabbing */}
      <div
        className="absolute inset-0"
        style={{
          height: "12px",
          marginTop: "-6px",
        }}
      />
    </div>
  );
}
