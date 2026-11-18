import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import AuthScreen from "./components/AuthScreen";
import EditorCard from "./components/EditorCard";
import {
  EDITORS,
  DEFAULT_HTML,
  DEFAULT_CSS,
  DEFAULT_JS,
  type Lang,
  type LayoutMode,
  type UserProfile
} from "./utils/constants";

function buildDocument(html: string, css: string, js: string): string {
  const closingScriptPattern = new RegExp("</script", "gi");
  const safeJs = js.replace(closingScriptPattern, "<\\/script");
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

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("syncora_token"));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("syncora_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [code, setCode] = useState<Record<Lang, string>>({
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    javascript: DEFAULT_JS,
  });

  const [srcDoc, setSrcDoc] = useState(() =>
    buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS)
  );

  const [layout, setLayout] = useState<LayoutMode>("stack-left");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(40);
  const [quadRowRatio, setQuadRowRatio] = useState(50);
  const [weights, setWeights] = useState<[number, number, number]>([33.33, 33.33, 33.34]);
  const [dragging, setDragging] = useState(false);

  const workRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleAuthenticated = (newToken: string, userProfile: UserProfile) => {
    localStorage.setItem("syncora_token", newToken);
    localStorage.setItem("syncora_user", JSON.stringify(userProfile));
    setToken(newToken);
    setUser(userProfile);
  };

  const handleSignOut = () => {
    localStorage.removeItem("syncora_token");
    localStorage.removeItem("syncora_user");
    setToken(null);
    setUser(null);
  };

  const run = useCallback(() => {
    setSrcDoc(buildDocument(code.html, code.css, code.javascript));
  }, [code]);

  const resetCode = () => {
    setCode({ html: DEFAULT_HTML, css: DEFAULT_CSS, javascript: DEFAULT_JS });
    setSrcDoc(buildDocument(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS));
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
        setSplitRatio(Math.min(85, Math.max(15, pct)));
      } else {
        const pct = ((ev.clientY - rect.top) / rect.height) * 100;
        layout === "grid-2x2"
          ? setQuadRowRatio(Math.min(85, Math.max(15, pct)))
          : setSplitRatio(Math.min(85, Math.max(15, pct)));
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

  if (!token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`app ${dragging ? "no-select" : ""}`}>
      <nav className="topnav">
       <div className="d-flex align-items-center gap-4">
        <div className="brand-group d-flex align-items-center gap-2">
                  <svg className="nav-logo" viewBox="0 0 24 24" width="22" height="22">
                 <rect width="24" height="24" rx="4" fill="#fafafa" />
                  <path d="M8.5 7.5 3.5 12l5 4.5M15.5 7.5l5 4.5-5 4.5" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="m13.5 4.5-5 8h5l-3 7 6-9h-5l2-6z" fill="#09090b" />
                 </svg>
                    <span className="brand">Syncora</span>
                 </div>
                   {user && <span className="user-chip">{user.email}</span>}
                </div>

        <div className="d-flex align-items-center gap-3">
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
                <button className="reset-link" onClick={resetSizes}>
                  Reset Sizes
                </button>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="shortcut">{isMac ? "⌘" : "Ctrl"} + Enter</span>
            <button className="tool-btn" onClick={resetCode} title="Reset code to default">
              Reset
            </button>
          </div>

          <button className="run-btn" onClick={run}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3L19 12L5 21V3Z" />
            </svg>
            Run
          </button>

          <button className="tool-btn signout" onClick={handleSignOut}>
            Sign out
          </button>
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
          <div className="w-100 h-100 d-flex flex-column overflow-hidden">
            <div className="d-flex w-100" style={{ height: `${quadRowRatio}%`, minHeight: 0 }}>
              <div style={{ width: `${splitRatio}%`, height: "100%", minWidth: 0, overflow: "hidden" }}>
                <EditorCard
                  config={EDITORS[0]}
                  value={code.html}
                  onChange={(v) => setCode({ ...code, html: v })}
                  onExpand={() => expandBox(0)}
                  onMinimize={() => minimizeBox(0)}
                />
              </div>
              <div className="drag-v" onPointerDown={(e) => startMainResize(e, "h")} />
              <div className="flex-grow-1 h-100" style={{ minWidth: 0, overflow: "hidden" }}>
                <EditorCard
                  config={EDITORS[1]}
                  value={code.css}
                  onChange={(v) => setCode({ ...code, css: v })}
                  onExpand={() => expandBox(1)}
                  onMinimize={() => minimizeBox(1)}
                />
              </div>
            </div>
            <div className="drag-h" onPointerDown={(e) => startMainResize(e, "v")} />
            <div className="d-flex flex-grow-1 w-100" style={{ minHeight: 0 }}>
              <div style={{ width: `${splitRatio}%`, height: "100%", minWidth: 0, overflow: "hidden" }}>
                <EditorCard
                  config={EDITORS[2]}
                  value={code.javascript}
                  onChange={(v) => setCode({ ...code, javascript: v })}
                  onExpand={() => expandBox(2)}
                  onMinimize={() => minimizeBox(2)}
                />
              </div>
              <div className="drag-v" onPointerDown={(e) => startMainResize(e, "h")} />
              <div className="flex-grow-1 h-100" style={{ minWidth: 0, overflow: "hidden" }}>
                {renderPreview()}
              </div>
            </div>
          </div>
        )}

        {layout === "full-preview" && <div className="w-100 h-100">{renderPreview()}</div>}
      </main>
    </div>
  );
}