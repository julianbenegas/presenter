"use client";

import { useEffect, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting,
  indentUnit,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onMediaPaste?: (
    file: File,
    insertMarkdown: (markdown: string) => void
  ) => void;
  className?: string;
}

export function Editor({
  value,
  onChange,
  onMediaPaste,
  className = "",
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitialMount = useRef(true);

  // Helper to insert markdown at current cursor position
  const insertMarkdownAtCursor = (view: EditorView, markdown: string) => {
    const { from } = view.state.selection.main;
    view.dispatch({
      changes: { from, insert: markdown },
      selection: { anchor: from + markdown.length },
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // Custom markdown highlighting for better visibility
    const markdownHighlighting = HighlightStyle.define([
      {
        tag: tags.heading1,
        class: "cm-heading-1",
      },
      {
        tag: tags.heading2,
        class: "cm-heading-2",
      },
      {
        tag: tags.heading3,
        class: "cm-heading-3",
      },
      { tag: tags.heading, class: "cm-heading" },
      { tag: tags.emphasis, class: "cm-emphasis" },
      { tag: tags.strong, class: "cm-strong" },
      { tag: tags.link, class: "cm-link" },
      { tag: tags.monospace, class: "cm-monospace" },
      { tag: tags.list, class: "cm-list" },
      { tag: tags.quote, class: "cm-quote" },
      { tag: tags.strikethrough, class: "cm-strikethrough" },
      { tag: tags.url, class: "cm-url" },
    ]);

    // Handle paste events for images and videos
    const pasteHandler = EditorView.domEventHandlers({
      paste(event, view) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (
            item.type.startsWith("image/") ||
            item.type.startsWith("video/")
          ) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file && onMediaPaste) {
              onMediaPaste(file, (markdown) =>
                insertMarkdownAtCursor(view, markdown)
              );
            }
            return true;
          }
        }
        return false;
      },
      drop(event, view) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        // Check if any of the files are images or videos
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (
            file.type.startsWith("image/") ||
            file.type.startsWith("video/")
          ) {
            event.preventDefault();

            // Get the drop position
            const pos = view.posAtCoords({
              x: event.clientX,
              y: event.clientY,
            });
            if (pos !== null) {
              // Move cursor to drop position
              view.dispatch({
                selection: { anchor: pos },
              });
            }

            if (onMediaPaste) {
              onMediaPaste(file, (markdown) =>
                insertMarkdownAtCursor(view, markdown)
              );
            }
            return true;
          }
        }
        return false;
      },
    });

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        syntaxHighlighting(markdownHighlighting, { fallback: false }),
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Skip onChange on initial mount
            if (isInitialMount.current) {
              isInitialMount.current = false;
              return;
            }
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
        EditorState.tabSize.of(4),
        indentUnit.of("\t"),
        pasteHandler,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Auto-focus the editor
    view.focus();

    return () => {
      view.destroy();
    };
  }, []);

  // Update editor content if value prop changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return <div ref={editorRef} className={`editor h-full ${className}`} />;
}
