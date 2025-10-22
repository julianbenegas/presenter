"use client";

import ReactMarkdown from "react-markdown";

interface SlideViewProps {
  content: string;
  className?: string;
}

export function SlideView({ content, className = "" }: SlideViewProps) {
  return (
    <div className={`slide-view ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-bold mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-bold mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-bold mb-2">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-4">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-4">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-gray-100 px-2 py-1 rounded">{children}</code>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} className="max-w-full h-auto" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
