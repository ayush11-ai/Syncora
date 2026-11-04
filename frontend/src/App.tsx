import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

type Lang = "html" | "css" | "javascript";
type LayoutMode = "stack-left" | "row-top" | "grid-2x2" | "full-preview";

interface EditorConfig {
  id: Lang;
  label: string;
  file: string;
  color: string;
}

const EDITORS: EditorConfig[] = [
  { id: "html", label: "HTML5", file: "index.html", color: "#e34c26" },
  { id: "css", label: "CSS3", file: "styles.css", color: "#2f81f7" },
  { id: "javascript", label: "JavaScript", file: "script.js", color: "#e3b341" },
];

const DEFAULT_HTML = `<div class="box-card">
  <h2>Welcome to Syncora ✨</h2>
  <p>Collaborative coding made effortless.</p>
  <button id="cta">Get Started</button>
</div>`;

const DEFAULT_CSS = `body {
  display: grid;
  place-items: center;
  height: 100vh;
  margin: 0;
  background: #f8fafc;
  font-family: system-ui, sans-serif;
}

.box-card {
  padding: 2rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

button {
  padding: 8px 16px;
  background: #0f172a;
  color: #fff;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}`;

constt DEFAULT_JS = `document.getElementById("cta").onclick = () => {
  alert("Welcome aboard! Ready to code?");
};`;

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("syncora-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0d1117",
      "editor.lineHighlightBackground": "#161b22",
      "editorGutter.background": "#0d1117",
    },
  });
};

function buildDocument(html: string, css: string, js: string): string {
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html>
<head><style>${css}</style></head>
<body>
${html}
<script>
try { ${safeJs} } catch (err) { console.error(err); }
</script>
</body>
</html>`;
}

interface EditorCardProps {
  config: EditorConfig;
  value: string;
  onChange: (value: string) => void;
  onExpand?: () => void;
  onMinimize?: () => void;
}

function EditorCard({ config, value, onChange, onExpand, onMinimize }: EditorCardProps) {
  return (
    <section className="box">
      <header className="box-head">
        <div className="d-flex align-items-center gap-2">
          <span
            className="badge-tag"
            style={{
              color: config.color,
              borderColor: `${config.color}55`,
              background: `${config.color}1a`,
            }}
          >
            {config.label}
          </span>
          <span className="file-txt">{config.file}</span>
        </div>
        {(onExpand || onMinimize) && (
          <div className="d-flex gap-1">
            {onMinimize && (
              <button className="mini-btn" onClick={onMinimize}>–</button>
            )}
            {onExpand && (
              <button className="mini-btn" onClick={onExpand}>□</button>
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
            fontFamily: "monospace",
            minimap: { enabled: false },
            padding: { top: 8 },
            wordWrap: "on",
          }}
        />
      </div>
    </section>
  );
}

export default function App() {
  const [code, setCode] = useState<Record<Lang, string>>({
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    javascript: DEFAULT_JS,
  });

  const [srcDoc, setSrcDoc] = useState(() =>
    buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS)
  );
  const [runCount, setRunCount] = useState(0);

  const [layout, setLayout] = useState<LayoutMode>("stack-left");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(40);
  const [quadRowRatio, setQuadRowRatio] = useState(50);
  const [weights, setWeights] = useState<[number, number, number]>([33.33, 33.33, 33.34]);
  const [dragging, setDragging] = useState(false);

  const workRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const run = useCallback(() => {
    setSrcDoc(buildDocument(code.html, code.css, code.javascript));
    setRunCount((n) => n + 1);
  }, [code]);

  const resetCode = () => {
    setCode({ html: DEFAULT_HTML, css: DEFAULT_CSS, javascript: DEFAULT_JS });
    setSrcDoc(buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS));
    setRunCount(0);
  };

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [run]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform),
    []
  );

  const startMainResize = (e: React.PointerEvent, dir: "h" | "v") => {
    e.preventDefault();
    if (!workRef.current) return;
    setDragging(true);
    const rect = workRef.current.getBoundingClientRect();

    const move = (ev: PointerEvent) => {
      if (dir === "h") {
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setSplitRatio(Math.min(80, Math.max(20, pct)));
      } else {
        const pct = ((ev.clientY - rect.top) / rect.height) * 100;
        layout === "grid-2x2" ? setQuadRowRatio(Math.min(80, Math.max(20, pct))) : setSplitRatio(Math.min(80, Math.max(20, pct)));
      }
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startBoxResize = (e: React.PointerEvent, idx: number, dir: "v" | "h") => {
    e.preventDefault();
    if (!stackRef.current) return;
    setDragging(true);
    const rect = stackRef.current.getBoundingClientRect();
    const total = dir === "v" ? rect.height : rect.width;
    const start = dir === "v" ? e.clientY : e.clientX;
    const initW = [...weights];

    const move = (ev: PointerEvent) => {
      const curr = dir === "v" ? ev.clientY : ev.clientX;
      const diff = ((curr - start) / total) * 100;
      const sum = initW[idx] + initW[idx + 1];
      const first = Math.min(sum - 10, Math.max(10, initW[idx] + diff));
      const next = [...initW] as [number, number, number];
      next[idx] = first;
      next[idx + 1] = sum - first;
      setWeights(next);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const expandBox = (idx: number) => {
    const next: [number, number, number] = [12, 12, 12];
    next[idx] = 76;
    setWeights(next);
  };

  const minimizeBox = (idx: number) => {
    const next = [...weights] as [number, number, number];
    const freed = next[idx] - 10;
    if (freed <= 0) return;
    next[idx] = 10;
    next[(idx + 1) % 3] += freed / 2;
    next[(idx + 2) % 3] += freed / 2;
    setWeights(next);
  };

  const resetSizes = () => {
    setSplitRatio(layout === "row-top" ? 50 : 40);
    setQuadRowRatio(50);
    setWeights([33.33, 33.33, 33.34]);
  };

  const renderPreview = () => (
    <div className="preview-container">
      <iframe
        title="preview"
        className="frame"
        style={{ pointerEvents: dragging ? "none" : "auto" }}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-modals"
      />
    </div>
  );

  return (
    <div className={`app ${dragging ? "no-select" : ""}`}>
      <nav className="topnav">
        <div className="d-flex align-items-center gap-2">
          <span className="brand">⚡ Syncora</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative" ref={dropRef}>
            <button className="tool-btn" onClick={() => setViewMenuOpen(!viewMenuOpen)}>
              Change View
            </button>
            {viewMenuOpen && (
              <div className="popover-box">
                <div className="pop-title">Layout Options</div>
                <div className="pop-grid">
                  {(["stack-left", "row-top", "grid-2x2", "full-preview"] as LayoutMode[]).map((m) => (
                    <button
                      key={m}
                      className={`pop-opt ${layout === m ? "active" : ""}`}
                      onClick={() => {
                        setLayout(m);
                        setViewMenuOpen(false);
                      }}
                    >
                      {m.replace("-", " ").toUpperCase()}
                    </button>
                  ))}
                </div>
                <button className="reset-link" onClick={resetSizes}>Reset Sizes</button>
              </div>
            )}
          </div>

          <span className="shortcut">{isMac ? "⌘" : "Ctrl"} + Enter</span>
          
          <button className="reset-btn" onClick={resetCode} title="Reset code to default">
            Reset
          </button>

          <button className="run-btn" onClick={run}>▶ Run</button>
        </div>
      </nav>

      <main ref={workRef} className={`workspace layout-${layout}`}>
        {layout === "stack-left" && (
          <>
            <div ref={stackRef} className="stack-v" style={{ width: `${splitRatio}%` }}>
              {EDITORS.map((cfg, idx) => (
                <div key={cfg.id} className="flex-pane" style={{ flex: `${weights[idx]} 1 0%` }}>
                  <EditorCard
                    config={cfg}
                    value={code[cfg.id]}
                    onChange={(v) => setCode({ ...code, [cfg.id]: v })}
                    onExpand={() => expandBox(idx)}
                    onMinimize={() => minimizeBox(idx)}
                  />
                  {idx < 2 && (
                    <div className="drag-h" onPointerDown={(e) => startBoxResize(e, idx, "v")} />
                  )}
                </div>
              ))}
            </div>
            <div className="drag-v" onPointerDown={(e) => startMainResize(e, "h")} />
            <div className="pane-right">{renderPreview()}</div>
          </>
        )}

        {layout === "row-top" && (
          <>
            <div ref={stackRef} className="stack-h" style={{ height: `${splitRatio}%` }}>
              {EDITORS.map((cfg, idx) => (
                <div key={cfg.id} className="flex-pane-h" style={{ flex: `${weights[idx]} 1 0%` }}>
                  <EditorCard
                    config={cfg}
                    value={code[cfg.id]}
                    onChange={(v) => setCode({ ...code, [cfg.id]: v })}
                    onExpand={() => expandBox(idx)}
                    onMinimize={() => minimizeBox(idx)}
                  />
                  {idx < 2 && (
                    <div className="drag-v" onPointerDown={(e) => startBoxResize(e, idx, "h")} />
                  )}
                </div>
              ))}
            </div>
            <div className="drag-h" onPointerDown={(e) => startMainResize(e, "v")} />
            <div className="pane-right">{renderPreview()}</div>
          </>
        )}

        {layout === "grid-2x2" && (
          <div className="w-100 h-100 d-flex flex-column">
            <div className="d-flex" style={{ height: `${quadRowRatio}%` }}>
              <div style={{ width: `${splitRatio}%`, height: "100%" }}>
                <EditorCard config={EDITORS[0]} value={code.html} onChange={(v) => setCode({ ...code, html: v })} />
              </div>
              <div className="drag-v" onPointerDown={(e) => startMainResize(e, "h")} />
              <div className="flex-grow-1 h-100">
                <EditorCard config={EDITORS[1]} value={code.css} onChange={(v) => setCode({ ...code, css: v })} />
              </div>
            </div>
            <div className="drag-h" onPointerDown={(e) => startMainResize(e, "v")} />
            <div className="d-flex flex-grow-1">
              <div style={{ width: `${splitRatio}%`, height: "100%" }}>
                <EditorCard config={EDITORS[2]} value={code.javascript} onChange={(v) => setCode({ ...code, javascript: v })} />
              </div>
              <div className="drag-v" onPointerDown={(e) => startMainResize(e, "h")} />
              <div className="flex-grow-1 h-100">{renderPreview()}</div>
            </div>
          </div>
        )}

        {layout === "full-preview" && <div className="w-100 h-100">{renderPreview()}</div>}
      </main>
    </div>
  );
}