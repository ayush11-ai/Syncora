import Editor, { type BeforeMount } from "@monaco-editor/react";
import type { EditorConfig } from "../utils/constants";

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("syncora-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#09090b",
      "editor.lineHighlightBackground": "#18181b",
      "editorGutter.background": "#09090b",
    },
  });
};

interface EditorCardProps {
  config: EditorConfig;
  value: string;
  onChange: (value: string) => void;
  onExpand?: () => void;
  onMinimize?: () => void;
}

export default function EditorCard({ config, value, onChange, onExpand, onMinimize }: EditorCardProps) {
  return (
    <section className="box">
      <header className="box-head">
        <div className="d-flex align-items-center gap-3">
          <span
            className="badge-tag"
            style={{
              color: config.color,
              borderColor: `${config.color}50`,
              background: "transparent",
            }}
          >
            {config.label}
          </span>
          <span className="file-txt">{config.file}</span>
        </div>
        {(onExpand || onMinimize) && (
          <div className="d-flex gap-2">
            {onMinimize && (
              <button className="mini-btn" onClick={onMinimize} title="Minimize pane">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
            {onExpand && (
              <button className="mini-btn" onClick={onExpand} title="Expand pane">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
              </button>
            )}
          </div>
        )}
      </header>
      <div className="box-body">
        <Editor
          language={config.id}
          value={value}
          theme="syncora-dark"
          beforeMount={defineTheme}
          onChange={(v) => onChange(v ?? "")}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            padding: { top: 12 },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden'
            }
          }}
        />
      </div>
    </section>
  );
}