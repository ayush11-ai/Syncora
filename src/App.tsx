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

const DEFAULT_HTML = `<main class="card">
  <h1>Synapse IDE</h1>
  <p>Drag any border to resize panes, or switch layouts from the top bar.</p>
  <button id="counter">Clicked 0 times</button>
</main>`;

const DEFAULT_CSS = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: #f6f8fa;
  color: #1f2328;
}

.card {
  padding: 2rem 2.5rem;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(140, 149, 159, 0.15);
}

button {
  padding: 0.5rem 1.1rem;
  border: 0;
  border-radius: 6px;
  background: #1f6feb;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}`;

const DEFAULT_JS = `const button = document.getElementById("counter");
let count = 0;

button.addEventListener("click", () => {
  count += 1;
  button.textContent = \`Clicked \${count} \${count === 1 ? "time" : "times"}\`;
});`;

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("synapse-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0d1117",
      "editor.lineHighlightBackground": "#161b22",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorGutter.background": "#0d1117",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#58a6ff",
      "editorIndentGuide.background1": "#21262d",
      "scrollbarSlider.background": "#30363d80",
      "scrollbarSlider.hoverBackground": "#484f5890",
    },
  });
};

function buildDocument(html: string, css: string, js: string): string {
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${css}</style>
</head>
<body>
${html}
<script>
try {
${safeJs}
} catch (err) {
  console.error(err);
}
</script>
</body>
</html>`;
}

interface EditorCardProps {
  config: EditorConfig;
  value: string;
  onChange: (value: string) => void;
  onFocusExpand?: () => void;
  onCollapse?: () => void;
}

function EditorCard({
  config,
  value,
  onChange,
  onFocusExpand,
  onCollapse,
}: EditorCardProps) {
  return (
    <section className="syn-card syn-editor-card">
      <header className="syn-card-header">
        <div className="d-flex align-items-center gap-2">
          <span
            className="syn-badge"
            style={{
              color: config.color,
              borderColor: `${config.color}55`,
              background: `${config.color}1a`,
            }}
          >
            {config.label}
          </span>
          <span className="syn-filename">{config.file}</span>
        </div>

        {(onFocusExpand || onCollapse) && (
          <div className="d-flex align-items-center gap-1">
            {onCollapse && (
              <button
                type="button"
                className="syn-pane-btn"
                title="Minimize box"
                onClick={onCollapse}
              >
                –
              </button>
            )}
            {onFocusExpand && (
              <button
                type="button"
                className="syn-pane-btn"
                title="Expand box"
                onClick={onFocusExpand}
              >
                □
              </button>
            )}
          </div>
        )}
      </header>
      <div className="syn-editor-body">
        <Editor
          language={config.id}
          value={value}
          theme="synapse-dark"
          beforeMount={defineTheme}
          onChange={(v) => onChange(v ?? "")}
          loading={<div className="syn-loading">Loading editor…</div>}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbersMinChars: 3,
            padding: { top: 8, bottom: 8 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            renderLineHighlight: "line",
            smoothScrolling: true,
            overviewRulerLanes: 0,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
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

  const [srcDoc, setSrcDoc] = useState<string>(() =>
    buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS)
  );
  const [runCount, setRunCount] = useState(0);

  // Left sidebar state (~6.3cm = 240px default, collapsible & resizable)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  // Layout switcher state (4 customizable views)
  const [layout, setLayout] = useState<LayoutMode>("stack-left");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  // Customizable split ratios & individual editor box weights
  const [splitRatio, setSplitRatio] = useState(40); // % for editors vs preview
  const [quadRowRatio, setQuadRowRatio] = useState(50); // % for top vs bottom in 2x2 grid
  const [editorWeights, setEditorWeights] = useState<[number, number, number]>([
    33.33, 33.33, 33.34,
  ]);
  const [isDragging, setIsDragging] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const editorsContainerRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  const run = useCallback(() => {
    setSrcDoc(buildDocument(code.html, code.css, code.javascript));
    setRunCount((n) => n + 1);
  }, [code]);

  // Keyboard shortcut: Ctrl/Cmd + Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  // Close Change View dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        viewDropdownRef.current &&
        !viewDropdownRef.current.contains(e.target as Node)
      ) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform),
    []
  );

  // Drag handler 1: Resize Left Navigation Sidebar
  const startSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const onMove = (ev: PointerEvent) => {
      const newWidth = Math.min(380, Math.max(170, ev.clientX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Drag handler 2: Resize Main Editors/Preview Split
  const startMainSplitResize = (
    e: React.PointerEvent,
    direction: "horizontal" | "vertical"
  ) => {
    e.preventDefault();
    if (!workspaceRef.current) return;
    setIsDragging(true);
    const rect = workspaceRef.current.getBoundingClientRect();

    const onMove = (ev: PointerEvent) => {
      if (direction === "horizontal") {
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setSplitRatio(Math.min(80, Math.max(20, pct)));
      } else {
        const pct = ((ev.clientY - rect.top) / rect.height) * 100;
        if (layout === "grid-2x2") {
          setQuadRowRatio(Math.min(80, Math.max(20, pct)));
        } else {
          setSplitRatio(Math.min(80, Math.max(20, pct)));
        }
      }
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Drag handler 3: Resize Individual HTML / CSS / JS Boxes
  const startEditorBoxResize = (
    e: React.PointerEvent,
    index: 0 | 1,
    axis: "vertical" | "horizontal"
  ) => {
    e.preventDefault();
    if (!editorsContainerRef.current) return;
    setIsDragging(true);

    const rect = editorsContainerRef.current.getBoundingClientRect();
    const totalSize = axis === "vertical" ? rect.height : rect.width;
    const startPos = axis === "vertical" ? e.clientY : e.clientX;
    const startWeights = [...editorWeights] as [number, number, number];

    const onMove = (ev: PointerEvent) => {
      const currentPos = axis === "vertical" ? ev.clientY : ev.clientX;
      const deltaPct = ((currentPos - startPos) / totalSize) * 100;

      const pairSum = startWeights[index] + startWeights[index + 1];
      const minWeight = 10;
      const nextFirst = Math.min(
        pairSum - minWeight,
        Math.max(minWeight, startWeights[index] + deltaPct)
      );
      const nextSecond = pairSum - nextFirst;

      const updated: [number, number, number] = [...startWeights] as [
        number,
        number,
        number,
      ];
      updated[index] = nextFirst;
      updated[index + 1] = nextSecond;
      setEditorWeights(updated);
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Quick expand/collapse helpers for individual editor cards
  const expandEditorBox = (idx: number) => {
    const next: [number, number, number] = [12, 12, 12];
    next[idx] = 76;
    setEditorWeights(next);
  };

  const collapseEditorBox = (idx: number) => {
    const next: [number, number, number] = [...editorWeights] as [
      number,
      number,
      number,
    ];
    const freed = next[idx] - 10;
    if (freed <= 0) return;
    next[idx] = 10;
    const other1 = (idx + 1) % 3;
    const other2 = (idx + 2) % 3;
    next[other1] += freed / 2;
    next[other2] += freed / 2;
    setEditorWeights(next);
  };

  const resetAllSizes = () => {
    setSplitRatio(layout === "row-top" ? 50 : 40);
    setQuadRowRatio(50);
    setEditorWeights([33.33, 33.33, 33.34]);
    setSidebarWidth(240);
  };

  const renderPreviewCard = () => (
    <section className="syn-card syn-preview-card">
      <header className="syn-card-header">
        <div className="d-flex align-items-center gap-2">
          <span className="syn-badge syn-badge-neutral">Preview</span>
          <span className="syn-filename">
            {runCount === 0 ? "Initial render" : `Run #${runCount}`}
          </span>
        </div>
        <button
          type="button"
          className="syn-pane-btn"
          title={
            layout === "full-preview" ? "Exit Full Preview" : "Full Page View"
          }
          onClick={() =>
            setLayout(layout === "full-preview" ? "stack-left" : "full-preview")
          }
        >
          {layout === "full-preview" ? "Exit Full" : "Full View"}
        </button>
      </header>
      <div className="syn-preview-body">
        <iframe
          title="Live preview"
          className="syn-iframe"
          style={{ pointerEvents: isDragging ? "none" : "auto" }}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
        />
      </div>
    </section>
  );

  return (
    <div className={`syn-app ${isDragging ? "syn-dragging" : ""}`}>
      {/* 1. Left Navigation Menu Sidebar (5-8cm customizable + dismissible) */}
      {sidebarOpen && (
        <>
          <aside
            className="syn-sidebar"
            style={{ width: `${sidebarWidth}px` }}
          >
            <div className="syn-sidebar-header">
              <div className="d-flex align-items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="6" cy="12" r="2.5" fill="#58a6ff" />
                  <circle cx="18" cy="6" r="2.5" fill="#58a6ff" />
                  <circle cx="18" cy="18" r="2.5" fill="#58a6ff" />
                  <path
                    d="M8.2 11l7.6-4M8.2 13l7.6 4"
                    stroke="#58a6ff"
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="syn-title">Synapse IDE</span>
              </div>
              <button
                type="button"
                className="syn-icon-btn"
                title="Close Sidebar"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="syn-sidebar-content">
              <div className="syn-nav-label">Menu</div>
              <nav className="syn-nav-list">
                <a href="#workspace" className="syn-nav-item active">
                  <span>Workspace</span>
                </a>
                <a href="#history" className="syn-nav-item">
                  <span>Code History</span>
                </a>
                <a href="#saved" className="syn-nav-item">
                  <span>Saved Projects</span>
                </a>
                <a href="#templates" className="syn-nav-item">
                  <span>Starter Templates</span>
                </a>
                <a href="#settings" className="syn-nav-item">
                  <span>IDE Settings</span>
                </a>
              </nav>
            </div>

            <div className="syn-sidebar-footer">
              <button type="button" className="syn-auth-btn">
                Sign In / Account
              </button>
            </div>
          </aside>

          {/* Draggable divider to resize sidebar width */}
          <div
            className="syn-resizer-vertical"
            title="Drag to resize sidebar"
            onPointerDown={startSidebarResize}
          />
        </>
      )}

      {/* 2. Right Side: Main Playground Area */}
      <div className="syn-main-area">
        {/* Top Navbar */}
        <nav className="syn-navbar">
          <div className="d-flex align-items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                className="syn-tool-btn"
                title="Open Left Menu"
                onClick={() => setSidebarOpen(true)}
              >
                ☰ Menu
              </button>
            )}
            <span className="syn-project-name">Untitled Playground</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* CodePen-Style "Change View" Switcher */}
            <div className="position-relative" ref={viewDropdownRef}>
              <button
                type="button"
                className="syn-tool-btn"
                onClick={() => setViewMenuOpen((o) => !o)}
                title="Change View & Customize Layout"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5H7V2H2.5zm5.5 12h5.5a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5H8v12z" />
                </svg>
                <span>Change View</span>
              </button>

              {viewMenuOpen && (
                <div className="syn-view-popover">
                  <div className="syn-popover-title">Change View</div>
                  <div className="syn-view-grid">
                    <button
                      type="button"
                      className={`syn-view-option ${layout === "stack-left" ? "active" : ""}`}
                      onClick={() => {
                        setLayout("stack-left");
                        setSplitRatio(40);
                      }}
                      title="Left Stack + Right Canvas"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <rect x="1" y="2" width="6" height="4" rx="1" />
                        <rect x="1" y="7" width="6" height="4" rx="1" />
                        <rect x="1" y="12" width="6" height="4" rx="1" />
                        <rect x="8.5" y="2" width="8.5" height="14" rx="1" />
                      </svg>
                      <span>Left Stack</span>
                    </button>

                    <button
                      type="button"
                      className={`syn-view-option ${layout === "row-top" ? "active" : ""}`}
                      onClick={() => {
                        setLayout("row-top");
                        setSplitRatio(48);
                      }}
                      title="Top Row (CodePen Classic)"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <rect x="1" y="2" width="4.5" height="6" rx="1" />
                        <rect x="6.75" y="2" width="4.5" height="6" rx="1" />
                        <rect x="12.5" y="2" width="4.5" height="6" rx="1" />
                        <rect x="1" y="9.5" width="16" height="6.5" rx="1" />
                      </svg>
                      <span>Top Row</span>
                    </button>

                    <button
                      type="button"
                      className={`syn-view-option ${layout === "grid-2x2" ? "active" : ""}`}
                      onClick={() => {
                        setLayout("grid-2x2");
                        setSplitRatio(50);
                      }}
                      title="2x2 Quadrant (JSFiddle)"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <rect x="1" y="2" width="7.2" height="6.2" rx="1" />
                        <rect x="9.8" y="2" width="7.2" height="6.2" rx="1" />
                        <rect x="1" y="9.8" width="7.2" height="6.2" rx="1" />
                        <rect x="9.8" y="9.8" width="7.2" height="6.2" rx="1" />
                      </svg>
                      <span>2x2 Grid</span>
                    </button>

                    <button
                      type="button"
                      className={`syn-view-option ${layout === "full-preview" ? "active" : ""}`}
                      onClick={() => setLayout("full-preview")}
                      title="Full Page Output"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <rect x="1" y="2" width="16" height="14" rx="1" />
                      </svg>
                      <span>Full Output</span>
                    </button>
                  </div>

                  <div className="syn-popover-actions">
                    <button
                      type="button"
                      className="syn-reset-btn"
                      onClick={resetAllSizes}
                    >
                      Reset Box Proportions
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="syn-hint d-none d-md-inline">
              {isMac ? "⌘" : "Ctrl"} + Enter
            </span>

            <button type="button" className="syn-run" onClick={run}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 1.2v9.6L10.5 6z" fill="currentColor" />
              </svg>
              Run
            </button>
          </div>
        </nav>

        {/* Dynamic Workspace supporting all 4 layouts + draggable resizing */}
        <main ref={workspaceRef} className={`syn-workspace layout-${layout}`}>
          {/* LAYOUT 1: Left Stacked Editors + Right Output Canvas */}
          {layout === "stack-left" && (
            <>
              <div
                ref={editorsContainerRef}
                className="syn-editors-stack"
                style={{ width: `${splitRatio}%` }}
              >
                {EDITORS.map((cfg, idx) => (
                  <div
                    key={cfg.id}
                    className="syn-resizable-box"
                    style={{ flex: `${editorWeights[idx]} 1 0%` }}
                  >
                    <EditorCard
                      config={cfg}
                      value={code[cfg.id]}
                      onChange={(v) =>
                        setCode((prev) => ({ ...prev, [cfg.id]: v }))
                      }
                      onFocusExpand={() => expandEditorBox(idx)}
                      onCollapse={() => collapseEditorBox(idx)}
                    />
                    {idx < 2 && (
                      <div
                        className="syn-resizer-horizontal"
                        title="Drag to resize editor height"
                        onPointerDown={(e) =>
                          startEditorBoxResize(e, idx as 0 | 1, "vertical")
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              <div
                className="syn-resizer-vertical"
                title="Drag to resize editors and output"
                onPointerDown={(e) => startMainSplitResize(e, "horizontal")}
              />

              <div className="syn-preview-pane" style={{ flex: 1 }}>
                {renderPreviewCard()}
              </div>
            </>
          )}

          {/* LAYOUT 2: Top Horizontal Editors (CodePen Style) + Bottom Output */}
          {layout === "row-top" && (
            <>
              <div
                ref={editorsContainerRef}
                className="syn-editors-row"
                style={{ height: `${splitRatio}%` }}
              >
                {EDITORS.map((cfg, idx) => (
                  <div
                    key={cfg.id}
                    className="syn-resizable-box-horiz"
                    style={{ flex: `${editorWeights[idx]} 1 0%` }}
                  >
                    <EditorCard
                      config={cfg}
                      value={code[cfg.id]}
                      onChange={(v) =>
                        setCode((prev) => ({ ...prev, [cfg.id]: v }))
                      }
                      onFocusExpand={() => expandEditorBox(idx)}
                      onCollapse={() => collapseEditorBox(idx)}
                    />
                    {idx < 2 && (
                      <div
                        className="syn-resizer-vertical"
                        title="Drag to resize editor width"
                        onPointerDown={(e) =>
                          startEditorBoxResize(e, idx as 0 | 1, "horizontal")
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              <div
                className="syn-resizer-horizontal"
                title="Drag to resize top editors and bottom output"
                onPointerDown={(e) => startMainSplitResize(e, "vertical")}
              />

              <div className="syn-preview-pane" style={{ flex: 1 }}>
                {renderPreviewCard()}
              </div>
            </>
          )}

          {/* LAYOUT 3: 2x2 Quadrant Grid (JSFiddle Style) */}
          {layout === "grid-2x2" && (
            <div className="syn-quad-container">
              <div
                className="syn-quad-row"
                style={{ height: `${quadRowRatio}%` }}
              >
                <div style={{ width: `${splitRatio}%`, height: "100%" }}>
                  <EditorCard
                    config={EDITORS[0]}
                    value={code.html}
                    onChange={(v) => setCode((prev) => ({ ...prev, html: v }))}
                  />
                </div>
                <div
                  className="syn-resizer-vertical"
                  onPointerDown={(e) => startMainSplitResize(e, "horizontal")}
                />
                <div style={{ flex: 1, height: "100%" }}>
                  <EditorCard
                    config={EDITORS[1]}
                    value={code.css}
                    onChange={(v) => setCode((prev) => ({ ...prev, css: v }))}
                  />
                </div>
              </div>

              <div
                className="syn-resizer-horizontal"
                onPointerDown={(e) => startMainSplitResize(e, "vertical")}
              />

              <div className="syn-quad-row" style={{ flex: 1 }}>
                <div style={{ width: `${splitRatio}%`, height: "100%" }}>
                  <EditorCard
                    config={EDITORS[2]}
                    value={code.javascript}
                    onChange={(v) =>
                      setCode((prev) => ({ ...prev, javascript: v }))
                    }
                  />
                </div>
                <div
                  className="syn-resizer-vertical"
                  onPointerDown={(e) => startMainSplitResize(e, "horizontal")}
                />
                <div style={{ flex: 1, height: "100%" }}>
                  {renderPreviewCard()}
                </div>
              </div>
            </div>
          )}

          {/* LAYOUT 4: Full-Page Output Focus Mode */}
          {layout === "full-preview" && (
            <div className="w-100 h-100">{renderPreviewCard()}</div>
          )}
        </main>
      </div>
    </div>
  );
}