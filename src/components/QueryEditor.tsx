import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { defaultKeymap, indentWithTab, history } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import { lintGutter } from '@codemirror/lint';

interface QueryEditorProps {
  query: string;
  onQueryChange: (value: string) => void;
  selectedLine: number | null;
  onLineSelect: (line: number | null) => void;
  onExecute: () => void;
}

const queryTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#24292e',
    selection: '#b3d4fc',
    selectionMatch: '#e5e5e5',
    lineHighlight: '#f8f8f8',
  },
  styles: [
    { tag: t.comment, color: '#6a737d', fontStyle: 'italic' },
    { tag: t.keyword, color: '#d73a49' },
    { tag: t.string, color: '#032f62' },
    { tag: t.number, color: '#005cc5' },
    { tag: t.operator, color: '#d73a49' },
    { tag: t.punctuation, color: '#24292e' },
  ]
});

const QueryEditor: React.FC<QueryEditorProps> = ({
  query,
  onQueryChange,
  selectedLine,
  onLineSelect,
  onExecute
}) => {

  // Función para manejar la selección de la línea actual
  const updateSelectedLine = (view: EditorView) => {
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.head);
    onLineSelect(line.number - 1); // Índices 0-based
  };

  // Configurar extensiones de CodeMirror
  const extensions = [
    // Sintaxis SQL y resaltado
    sql(),
    syntaxHighlighting(defaultHighlightStyle),
    bracketMatching(),
    // Historia (undo/redo)
    history(),
    // Autocompletado
    autocompletion(),
    // Sangría con Tab
    keymap.of([indentWithTab]),
    // Gutter para linting
    lintGutter(),
    // Tema personalizado
    queryTheme,
    // Atajos de teclado personalizados
    keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onExecute();
          return true;
        }
      },
      {
        key: "Ctrl-Enter",
        run: () => {
          onExecute();
          return true;
        }
      },
      ...defaultKeymap
    ])
  ];

  return (
    <div className="h-full w-full">
      <CodeMirror
        value={query}
        height="100%"
        width="100%"
        theme={queryTheme}
        extensions={[
          ...extensions,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { 
              maxHeight: '300px'
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '14px',
              lineHeight: '1.5',
              padding: '8px 0'
            },
            '.cm-gutters': {
              backgroundColor: '#f8f8f8',
              borderRight: '1px solid #ddd',
              minWidth: '40px',
              position: 'sticky',
              left: 0,
              zIndex: 1
            },
            '.cm-lineNumbers': {
              fontSize: '12px',
              color: '#666'
            },
            '.cm-line': {
              padding: '0 8px'
            },
            '.cm-activeLine': {
              backgroundColor: '#f0f7ff'
            },
            '.cm-selectionBackground': {
              backgroundColor: '#e3f2fd !important'
            },
            '.cm-focused .cm-selectionBackground': {
              backgroundColor: '#bbdefb !important'
            },
            '.cm-activeLine.cm-line': {
              backgroundColor: '#e3f2fd'
            }
          })
        ]}
        onChange={(value) => {
          onQueryChange(value);
        }}
        onUpdate={(viewUpdate) => {
          if (viewUpdate.selectionSet) {
            updateSelectedLine(viewUpdate.view);
          }
        }}
      />
    </div>
  );
};

export default QueryEditor;