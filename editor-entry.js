// editor-entry.js — bundled by esbuild into vendor/editor.bundle.js.
// Exposes a tiny factory on window so popup.js can create the editor without
// importing ES modules (MV3 popup scripts are classic scripts).

import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";

function create({ parent, doc = "", onChange }) {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && typeof onChange === "function") {
      onChange(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      history(),
      closeBrackets(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      html(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      EditorView.lineWrapping,
      updateListener,
    ],
  });

  const view = new EditorView({ state, parent });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (value) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    },
    view,
  };
}

window.GmailHtmlEditor = { create };
