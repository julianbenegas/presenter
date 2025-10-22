"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Presentation } from "@/types";
import { getAllPresentations } from "@/lib/storage";
import { extractTitle, formatRelativeTime } from "@/lib/markdown";
import { ResizeHandle } from "@/components/ResizeHandle";

const SIDEBAR_WIDTH_KEY = "sidebar-left-width";
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

export function Sidebar() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, []);

  const handleResize = (newWidth: number) => {
    setWidth(newWidth);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, newWidth.toString());
  };

  useEffect(() => {
    // Load presentations on mount
    loadPresentations();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadPresentations();
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab updates
    window.addEventListener("presentations-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("presentations-updated", handleStorageChange);
    };
  }, []);

  const loadPresentations = () => {
    const allPresentations = getAllPresentations();
    const sorted = allPresentations.sort((a, b) => b.updatedAt - a.updatedAt);
    setPresentations(sorted);
  };

  return (
    <div className="flex flex-shrink-0">
      <div
        className="border-r border-gray-200 dark:border-gray-800 h-screen overflow-y-auto p-4 bg-white dark:bg-black"
        style={{ width: `${width}px` }}
      >
        <div className="mb-6">
          <Link
            href="/"
            className="block px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 text-center"
          >
            New Presentation
          </Link>
        </div>

        <div className="space-y-2">
          {presentations.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-600 text-sm px-4">
              No presentations yet
            </p>
          ) : (
            presentations.map((presentation) => {
              const title = extractTitle(presentation.content);
              const isActive = pathname?.includes(presentation.id);

              return (
                <Link
                  key={presentation.id}
                  href={`/${presentation.id}`}
                  className={`block px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-900 ${
                    isActive ? "bg-gray-100 dark:bg-gray-900" : ""
                  }`}
                >
                  <div className="font-medium truncate">{title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatRelativeTime(presentation.updatedAt)}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <ResizeHandle
        onResize={handleResize}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        side="left"
      />
    </div>
  );
}
