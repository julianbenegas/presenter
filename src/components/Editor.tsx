"use client";

import { useEffect, useRef } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  syntaxHighlighting,
  indentUnit,
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  defaultHighlightStyle,
} from "@codemirror/language";
import { tags, classHighlighter } from "@lezer/highlight";

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
      { tag: tags.heading1, class: "cm-heading-1" },
      { tag: tags.heading2, class: "cm-heading-2" },
      { tag: tags.heading3, class: "cm-heading-3" },
      { tag: tags.heading4, class: "cm-heading-4" },
      { tag: tags.heading5, class: "cm-heading-5" },
      { tag: tags.heading6, class: "cm-heading-6" },
      { tag: tags.heading, class: "cm-heading" },
      { tag: tags.emphasis, class: "cm-emphasis" },
      { tag: tags.strong, class: "cm-strong" },
      { tag: tags.link, class: "cm-link" },
      { tag: tags.monospace, class: "cm-monospace" },
      { tag: tags.list, class: "cm-list" },
      { tag: tags.quote, class: "cm-quote" },
      { tag: tags.strikethrough, class: "cm-strikethrough" },
      { tag: tags.url, class: "cm-url" },
      { tag: tags.meta, class: "cm-meta" },
      { tag: tags.comment, class: "cm-comment" },
      { tag: tags.atom, class: "cm-atom" },
      { tag: tags.bool, class: "cm-bool" },
      { tag: tags.labelName, class: "cm-labelName" },
      { tag: tags.inserted, class: "cm-inserted" },
      { tag: tags.deleted, class: "cm-deleted" },
      { tag: tags.literal, class: "cm-literal" },
      { tag: tags.string, class: "cm-string" },
      { tag: tags.number, class: "cm-number" },
      {
        tag: [tags.regexp, tags.escape, tags.special(tags.string)],
        class: "cm-string2",
      },
      { tag: tags.variableName, class: "cm-variableName" },
      { tag: tags.local(tags.variableName), class: "cm-variableName cm-local" },
      {
        tag: tags.definition(tags.variableName),
        class: "cm-variableName cm-definition",
      },
      {
        tag: tags.special(tags.variableName),
        class: "cm-variableName cm-special",
      },
      {
        tag: tags.definition(tags.propertyName),
        class: "cm-propertyName cm-definition",
      },
      { tag: tags.typeName, class: "cm-typeName" },
      { tag: tags.namespace, class: "cm-namespace" },
      { tag: tags.className, class: "cm-className" },
      { tag: tags.macroName, class: "cm-macroName" },
      { tag: tags.propertyName, class: "cm-propertyName" },
      { tag: tags.operator, class: "cm-operator" },
      { tag: tags.keyword, class: "cm-keyword" },
      { tag: tags.name, class: "cm-name" },
      { tag: tags.processingInstruction, class: "cm-processingInstruction" },
      { tag: tags.separator, class: "cm-separator" },
      { tag: tags.punctuation, class: "cm-punctuation" },
      { tag: tags.bracket, class: "cm-bracket" },
      { tag: tags.invalid, class: "cm-invalid" },
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
        // Basic editor features
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),

        // Language and syntax highlighting - order matters!
        markdown(),
        syntaxHighlighting(classHighlighter),
        syntaxHighlighting(markdownHighlighting),
        syntaxHighlighting(defaultHighlightStyle),

        // Keymaps
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),

        // Custom settings
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
