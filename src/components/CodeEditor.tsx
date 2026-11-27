import { useEffect, useRef } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  minHeight?: number;
}

const monochromeHighlightStyle = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.controlKeyword,
      t.operatorKeyword,
      t.definitionKeyword,
      t.moduleKeyword,
      t.modifier,
    ],
    color: '#000000',
    fontWeight: '600',
  },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: '#777777',
    fontStyle: 'italic',
  },
  {
    tag: [t.string, t.special(t.string), t.regexp],
    color: '#333333',
  },
  {
    tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom],
    color: '#222222',
    fontWeight: '500',
  },
  {
    tag: [t.variableName, t.propertyName, t.attributeName, t.labelName],
    color: '#111111',
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)],
    color: '#000000',
  },
  {
    tag: [t.typeName, t.className],
    color: '#111111',
    fontWeight: '500',
  },
  {
    tag: [t.operator, t.punctuation, t.bracket, t.paren, t.brace, t.separator],
    color: '#525252',
  },
]);

const monochromeEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#f8f8f8',
    color: '#111111',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '12px 0',
    caretColor: '#111111',
  },
  '.cm-gutters': {
    backgroundColor: '#f2f2f2',
    color: '#888888',
    borderRight: '1px solid #e0e0e0',
    paddingRight: '4px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e9e9e9',
    color: '#111111',
  },
  '.cm-activeLine': {
    backgroundColor: '#efefef',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#111111',
    borderLeftWidth: '1.5px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#e0e0e0 !important',
  },
  '.cm-line': {
    paddingLeft: '12px',
    paddingRight: '16px',
  },
});

export function CodeEditor({ value, onChange, onRun, minHeight = 140 }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const runShortcut = Prec.highest(
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
      ])
    );

    const state = EditorState.create({
      doc: value,
      extensions: [
        runShortcut,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        EditorState.allowMultipleSelections.of(true),
        javascript(),
        syntaxHighlighting(monochromeHighlightStyle),
        monochromeEditorTheme,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      className="code-editor-shell"
      style={{ minHeight: `${minHeight}px` }}
      ref={hostRef}
      aria-label="JavaScript CDP-WASM code editor"
    />
  );
}
