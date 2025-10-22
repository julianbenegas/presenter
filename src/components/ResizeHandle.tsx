"use client";

import { useEffect, useRef, useState } from "react";

interface ResizeHandleProps {
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  side: "left" | "right";
}

export function ResizeHandle({
  onResize,
  minWidth,
  maxWidth,
  side,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth: number;

      if (side === "left") {
        newWidth = e.clientX;
      } else {
        newWidth = window.innerWidth - e.clientX;
      }

      // Constrain to min/max
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onResize(newWidth);
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
  }, [isDragging, onResize, minWidth, maxWidth, side]);

  return (
    <div
      className={`relative w-2 ${
        isDragging ? "bg-blue-500" : "bg-gray-200 hover:bg-blue-400"
      } cursor-col-resize flex-shrink-0 transition-colors`}
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
          width: "8px",
          marginLeft: side === "left" ? "-4px" : "0",
          marginRight: side === "right" ? "-4px" : "0",
        }}
      />
    </div>
  );
}
