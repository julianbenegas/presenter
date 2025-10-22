"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useTheme } from "next-themes";

interface SlideViewProps {
  content: string;
  className?: string;
}

// Minimal grayscale theme for code blocks (light mode)
const minimalLightTheme = {
  'code[class*="language-"]': {
    color: "#1f2937",
    background: "none",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: "0.875em",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#1f2937",
    background: "#fafafa",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: "0.875em",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto",
    borderRadius: "0.5rem",
    border: "1px solid #e5e7eb",
  },
  comment: { color: "#6b7280", fontStyle: "italic" },
  prolog: { color: "#6b7280" },
  doctype: { color: "#6b7280" },
  cdata: { color: "#6b7280" },
  punctuation: { color: "#374151" },
  property: { color: "#111827" },
  tag: { color: "#111827" },
  boolean: { color: "#111827" },
  number: { color: "#111827" },
  constant: { color: "#111827" },
  symbol: { color: "#111827" },
  deleted: { color: "#111827" },
  selector: { color: "#1f2937" },
  "attr-name": { color: "#1f2937" },
  string: { color: "#1f2937" },
  char: { color: "#1f2937" },
  builtin: { color: "#1f2937" },
  inserted: { color: "#1f2937" },
  operator: { color: "#374151" },
  entity: { color: "#1f2937" },
  url: { color: "#1f2937" },
  "language-css": { color: "#1f2937" },
  "style .token.string": { color: "#1f2937" },
  atrule: { color: "#111827" },
  "attr-value": { color: "#1f2937" },
  keyword: { color: "#111827", fontWeight: "600" },
  function: { color: "#111827" },
  "class-name": { color: "#111827" },
  regex: { color: "#374151" },
  important: { color: "#111827", fontWeight: "bold" },
  variable: { color: "#1f2937" },
};

// Minimal grayscale theme for code blocks (dark mode)
const minimalDarkTheme = {
  'code[class*="language-"]': {
    color: "#e5e7eb",
    background: "none",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: "0.875em",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#e5e7eb",
    background: "#0a0a0a",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: "0.875em",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    lineHeight: "1.5",
    tabSize: 2,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto",
    borderRadius: "0.5rem",
    border: "1px solid #374151",
  },
  comment: { color: "#9ca3af", fontStyle: "italic" },
  prolog: { color: "#9ca3af" },
  doctype: { color: "#9ca3af" },
  cdata: { color: "#9ca3af" },
  punctuation: { color: "#d1d5db" },
  property: { color: "#f3f4f6" },
  tag: { color: "#f3f4f6" },
  boolean: { color: "#f3f4f6" },
  number: { color: "#f3f4f6" },
  constant: { color: "#f3f4f6" },
  symbol: { color: "#f3f4f6" },
  deleted: { color: "#f3f4f6" },
  selector: { color: "#e5e7eb" },
  "attr-name": { color: "#e5e7eb" },
  string: { color: "#e5e7eb" },
  char: { color: "#e5e7eb" },
  builtin: { color: "#e5e7eb" },
  inserted: { color: "#e5e7eb" },
  operator: { color: "#d1d5db" },
  entity: { color: "#e5e7eb" },
  url: { color: "#e5e7eb" },
  "language-css": { color: "#e5e7eb" },
  "style .token.string": { color: "#e5e7eb" },
  atrule: { color: "#f3f4f6" },
  "attr-value": { color: "#e5e7eb" },
  keyword: { color: "#f9fafb", fontWeight: "600" },
  function: { color: "#f3f4f6" },
  "class-name": { color: "#f3f4f6" },
  regex: { color: "#d1d5db" },
  important: { color: "#f9fafb", fontWeight: "bold" },
  variable: { color: "#e5e7eb" },
};

export function SlideView({ content, className = "" }: SlideViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={`slide-view ${className}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
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
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            return !inline && language ? (
              <SyntaxHighlighter
                style={isDark ? minimalDarkTheme : minimalLightTheme}
                language={language}
                PreTag="div"
                className="mb-4"
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                }}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code
                className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} className="max-w-full h-auto" />
          ),
          video: ({ src }) => (
            <video src={src} controls className="max-w-full h-auto" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
