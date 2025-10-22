"use client";

import { useEffect, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentUnit,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Editor({ value, onChange, className = "" }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!editorRef.current) return;

    // Custom markdown highlighting for better visibility
    const markdownHighlighting = HighlightStyle.define([
      {
        tag: tags.heading1,
        color: "#e06c75",
        fontWeight: "bold",
        fontSize: "1.5em",
      },
      {
        tag: tags.heading2,
        color: "#e06c75",
        fontWeight: "bold",
        fontSize: "1.3em",
      },
      {
        tag: tags.heading3,
        color: "#e06c75",
        fontWeight: "bold",
        fontSize: "1.1em",
      },
      { tag: tags.heading, color: "#e06c75", fontWeight: "bold" },
      { tag: tags.emphasis, color: "#c678dd", fontStyle: "italic" },
      { tag: tags.strong, color: "#e5c07b", fontWeight: "bold" },
      { tag: tags.link, color: "#61afef", textDecoration: "underline" },
      { tag: tags.monospace, color: "#98c379", backgroundColor: "#2c323c" },
      { tag: tags.list, color: "#61afef" },
      { tag: tags.quote, color: "#5c6370", fontStyle: "italic" },
    ]);

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        syntaxHighlighting(markdownHighlighting),
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
        // Configure indentation to use 1 tab character
        EditorState.tabSize.of(4),
        indentUnit.of("\t"),
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
