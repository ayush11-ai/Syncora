export type Lang = "html" | "css" | "javascript";
export type LayoutMode = "stack-left" | "row-top" | "grid-2x2" | "full-preview";
export type AuthMode = "signin" | "signup";

export interface UserProfile {
  id: string;
  email: string;
}

export interface EditorConfig {
  id: Lang;
  label: string;
  file: string;
  color: string;
}

export const API_BASE_URL = "http://localhost:5000/api/auth";

export const EDITORS: EditorConfig[] = [
  { id: "html", label: "HTML5", file: "index.html", color: "#e34c26" },
  { id: "css", label: "CSS3", file: "styles.css", color: "#2f81f7" },
  { id: "javascript", label: "JavaScript", file: "script.js", color: "#e3b341" },
];

export const DEFAULT_HTML = `<div class="box-card">
  <h2>Welcome to Syncora ✨</h2>
  <p>Collaborative coding made effortless.</p>
  <button id="cta">Get Started</button>
</div>`;

export const DEFAULT_CSS = `body {
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

export const DEFAULT_JS = `document.getElementById("cta").onclick = () => {
  alert("Welcome aboard! Ready to code?");
};`;