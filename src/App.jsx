import { useState, useEffect, useRef, useCallback } from "react";

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 400px;
    }
    h1 { color: #333; margin: 0 0 10px; }
    p { color: #666; }
    button {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 50px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
      transition: transform 0.2s;
    }
    button:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Hello World!</h1>
    <p>আমার প্রথম ওয়েবসাইট। CodeForge দিয়ে তৈরি।</p>
    <button onclick="alert('Welcome!')">Click Me!</button>
  </div>
</body>
</html>`;

const INITIAL_CSS = `/* styles.css */
body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}`;

const INITIAL_JS = `// script.js
console.log("Hello from CodeForge! 🚀");

document.addEventListener('DOMContentLoaded', () => {
  console.log("Page loaded successfully!");
});`;

const FILES = {
  "index.html": { content: INITIAL_HTML, lang: "html", icon: "🌐" },
  "styles.css": { content: INITIAL_CSS, lang: "css", icon: "🎨" },
  "script.js": { content: INITIAL_JS, lang: "javascript", icon: "⚡" },
};

// Simple syntax highlighter
function highlight(code, lang) {
  if (!code) return "";
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === "html") {
    escaped = escaped
      .replace(/(&lt;\/?[a-zA-Z][^&]*?&gt;)/g, '<span style="color:#e06c75">$1</span>')
      .replace(/(class|id|href|src|style|type|lang|charset|name|content|rel)=/g, '<span style="color:#d19a66">$1</span>=')
      .replace(/(&quot;[^&]*?&quot;)/g, '<span style="color:#98c379">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#7f848e;font-style:italic">$1</span>');
  } else if (lang === "css") {
    escaped = escaped
      .replace(/([.#]?[a-zA-Z][\w-]*)\s*\{/g, '<span style="color:#e06c75">$1</span> {')
      .replace(/([\w-]+):/g, '<span style="color:#61afef">$1</span>:')
      .replace(/(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|linear-gradient\([^)]+\))/g, '<span style="color:#98c379">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#7f848e;font-style:italic">$1</span>');
  } else if (lang === "javascript") {
    escaped = escaped
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|new|this|async|await|true|false|null|undefined)\b/g, '<span style="color:#c678dd">$1</span>')
      .replace(/('.*?'|".*?"|`[\s\S]*?`)/g, '<span style="color:#98c379">$1</span>')
      .replace(/(\/\/.*)/g, '<span style="color:#7f848e;font-style:italic">$1</span>')
      .replace(/\b(\d+)\b/g, '<span style="color:#d19a66">$1</span>');
  }
  return escaped;
}

export default function ReplitClone() {
  const [files, setFiles] = useState(FILES);
  const [activeFile, setActiveFile] = useState("index.html");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [githubModal, setGithubModal] = useState(false);
  const [githubForm, setGithubForm] = useState({ token: "", repo: "", username: "", message: "Initial commit from CodeForge" });
  const [githubStatus, setGithubStatus] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [newFileModal, setNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [tab, setTab] = useState("editor"); // editor | preview
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [running, setRunning] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const textareaRef = useRef(null);

  const currentFile = files[activeFile];

  const buildPreview = useCallback(() => {
    const html = files["index.html"]?.content || "";
    const css = files["styles.css"]?.content || "";
    const js = files["script.js"]?.content || "";

    let final = html;
    if (!html.includes("<style>") && css) {
      final = final.replace("</head>", `<style>${css}</style></head>`);
    }
    if (!html.includes("<script>") && js) {
      final = final.replace("</body>", `<script>${js}</script></body>`);
    }

    // Inject console capture
    const consoleCapture = `
<script>
(function() {
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  ['log','error','warn','info'].forEach(m => {
    console[m] = function(...args) {
      orig[m].apply(console, args);
      window.parent.postMessage({ type: 'console', method: m, args: args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e) { return String(a); }
      })}, '*');
    };
  });
  window.onerror = function(msg, src, line) {
    window.parent.postMessage({ type: 'console', method: 'error', args: [msg + ' (line ' + line + ')'] }, '*');
  };
})();
<\/script>`;

    return final.replace("<head>", "<head>" + consoleCapture);
  }, [files]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "console") {
        const colors = { log: "#abb2bf", error: "#e06c75", warn: "#e5c07b", info: "#61afef" };
        setConsoleLogs(prev => [...prev.slice(-99), {
          method: e.data.method,
          text: e.data.args.join(" "),
          color: colors[e.data.method] || "#abb2bf",
          time: new Date().toLocaleTimeString()
        }]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const runCode = () => {
    setRunning(true);
    setConsoleLogs([]);
    setPreviewKey(k => k + 1);
    setTab("preview");
    setConsoleOpen(true);
    setTimeout(() => setRunning(false), 800);
  };

  const updateContent = (val) => {
    setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], content: val } }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      updateContent(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      runCode();
    }
  };

  const handleCursorMove = (e) => {
    const ta = e.target;
    const text = ta.value.substring(0, ta.selectionStart);
    const lines = text.split("\n");
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  const addNewFile = () => {
    if (!newFileName.trim()) return;
    let name = newFileName.trim();
    const ext = name.split(".").pop();
    const langMap = { html: "html", css: "css", js: "javascript", jsx: "javascript", ts: "javascript" };
    const iconMap = { html: "🌐", css: "🎨", js: "⚡", jsx: "⚛️", ts: "🔷" };
    setFiles(prev => ({
      ...prev,
      [name]: { content: `/* ${name} */\n`, lang: langMap[ext] || "javascript", icon: iconMap[ext] || "📄" }
    }));
    setActiveFile(name);
    setNewFileModal(false);
    setNewFileName("");
  };

  const deleteFile = (fname) => {
    if (Object.keys(files).length <= 1) return;
    setFiles(prev => {
      const next = { ...prev };
      delete next[fname];
      return next;
    });
    if (activeFile === fname) {
      setActiveFile(Object.keys(files).find(f => f !== fname));
    }
  };

  const pushToGitHub = async () => {
    const { token, repo, username, message } = githubForm;
    if (!token || !repo || !username) {
      setGithubStatus({ type: "error", msg: "সব তথ্য পূরণ করুন।" });
      return;
    }
    setPushing(true);
    setGithubStatus(null);

    try {
      // Check if repo exists
      const repoRes = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
      });

      if (!repoRes.ok) {
        // Create repo
        const createRes = await fetch(`https://api.github.com/user/repos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: JSON.stringify({ name: repo, description: "Created with CodeForge", auto_init: false, private: false })
        });
        if (!createRes.ok) throw new Error("Repository তৈরি করা যায়নি।");
        await new Promise(r => setTimeout(r, 1500));
      }

      // Push all files
      const results = [];
      for (const [fname, fdata] of Object.entries(files)) {
        const content = btoa(unescape(encodeURIComponent(fdata.content)));

        // Check if file exists
        let sha = undefined;
        const existRes = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${fname}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (existRes.ok) {
          const existData = await existRes.json();
          sha = existData.sha;
        }

        const putRes = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${fname}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
          body: JSON.stringify({ message: `${message} - ${fname}`, content, ...(sha ? { sha } : {}) })
        });

        if (!putRes.ok) {
          const err = await putRes.json();
          throw new Error(`${fname}: ${err.message}`);
        }
        results.push(fname);
      }

      setGithubStatus({ type: "success", msg: `✅ ${results.length}টি ফাইল সফলভাবে push হয়েছে!\nhttps://github.com/${username}/${repo}`, url: `https://github.com/${username}/${repo}` });
    } catch (err) {
      setGithubStatus({ type: "error", msg: `❌ Error: ${err.message}` });
    } finally {
      setPushing(false);
    }
  };

  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(buildPreview())}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1a1b26", color: "#cdd6f4", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", background: "#16161e", borderBottom: "1px solid #2a2b3d", padding: "0 16px", height: 48, gap: 12, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 15, background: "linear-gradient(90deg, #7c3aed, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CodeForge</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Run Button */}
        <button onClick={runCode} disabled={running} style={{ display: "flex", alignItems: "center", gap: 6, background: running ? "#2a2b3d" : "linear-gradient(135deg, #22c55e, #16a34a)", color: "white", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
          {running ? "⏳ Running..." : "▶ Run"}
        </button>

        <button onClick={() => setGithubModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#24292e", color: "white", border: "1px solid #444", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <span>🐙</span> GitHub Push
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 200, background: "#16161e", borderRight: "1px solid #2a2b3d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #2a2b3d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "#7f849c", fontWeight: 600, letterSpacing: 1 }}>FILES</span>
              <button onClick={() => setNewFileModal(true)} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }} title="New File">+</button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {Object.entries(files).map(([fname, fdata]) => (
                <div key={fname} onClick={() => { setActiveFile(fname); setTab("editor"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", background: activeFile === fname ? "#2a2b3d" : "transparent", borderLeft: activeFile === fname ? "2px solid #7c3aed" : "2px solid transparent", transition: "all 0.15s", fontSize: 13 }}
                  onMouseEnter={e => { if (activeFile !== fname) e.currentTarget.style.background = "#1e1f2e"; }}
                  onMouseLeave={e => { if (activeFile !== fname) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{fdata.icon}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: activeFile === fname ? "#cdd6f4" : "#7f849c" }}>{fname}</span>
                  {!["index.html", "styles.css", "script.js"].includes(fname) && (
                    <button onClick={e => { e.stopPropagation(); deleteFile(fname); }} style={{ background: "none", border: "none", color: "#f38ba8", cursor: "pointer", fontSize: 12, padding: 0, opacity: 0.6 }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #2a2b3d" }}>
              <div style={{ fontSize: 11, color: "#7f849c", marginBottom: 6 }}>SHORTCUTS</div>
              <div style={{ fontSize: 11, color: "#6c7086" }}>Ctrl+Enter → Run</div>
              <div style={{ fontSize: 11, color: "#6c7086" }}>Ctrl+S → Save & Run</div>
              <div style={{ fontSize: 11, color: "#6c7086" }}>Tab → Indent</div>
            </div>
          </div>
        )}

        {/* MAIN AREA */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* TABS */}
          <div style={{ display: "flex", alignItems: "center", background: "#16161e", borderBottom: "1px solid #2a2b3d", paddingLeft: 4, height: 36, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "none", color: "#7f849c", cursor: "pointer", padding: "4px 8px", fontSize: 14 }} title="Toggle Sidebar">☰</button>
            {["editor", "preview"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? "#1a1b26" : "none", border: "none", borderTop: tab === t ? "2px solid #7c3aed" : "2px solid transparent", color: tab === t ? "#cdd6f4" : "#7f849c", cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: tab === t ? 600 : 400, fontFamily: "inherit", transition: "all 0.15s" }}>
                {t === "editor" ? "📝 Editor" : "🌐 Preview"}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {tab === "editor" && (
              <span style={{ fontSize: 11, color: "#6c7086", paddingRight: 12 }}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            )}
          </div>

          {/* EDITOR */}
          {tab === "editor" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
              {/* Line Numbers */}
              <div style={{ width: 44, background: "#13131a", borderRight: "1px solid #2a2b3d", overflow: "hidden", paddingTop: 12, textAlign: "right", paddingRight: 8, flexShrink: 0, userSelect: "none" }}>
                {(currentFile?.content || "").split("\n").map((_, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: "21px", color: "#3d3d5c", fontFamily: "inherit" }}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={currentFile?.content || ""}
                onChange={e => updateContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                spellCheck={false}
                style={{ flex: 1, background: "#13131a", color: "#cdd6f4", border: "none", outline: "none", padding: "12px 16px", fontSize: 13.5, lineHeight: "21px", fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", resize: "none", tabSize: 2, whiteSpace: "pre", overflowWrap: "normal", overflowX: "auto" }}
              />
            </div>
          )}

          {/* PREVIEW */}
          {tab === "preview" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "6px 12px", background: "#13131a", borderBottom: "1px solid #2a2b3d", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f38ba8" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f9e2af" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#a6e3a1" }} />
                </div>
                <div style={{ flex: 1, background: "#1a1b26", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#7f849c" }}>preview://localhost</div>
                <button onClick={runCode} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
              </div>
              <iframe
                key={previewKey}
                ref={previewRef}
                src={previewSrc}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                style={{ flex: 1, border: "none", background: "white" }}
                title="Preview"
              />
            </div>
          )}

          {/* CONSOLE */}
          <div style={{ borderTop: "1px solid #2a2b3d", background: "#13131a", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "4px 12px", cursor: "pointer", gap: 8 }} onClick={() => setConsoleOpen(o => !o)}>
              <span style={{ fontSize: 12, color: "#7f849c", fontWeight: 600 }}>CONSOLE</span>
              {consoleLogs.length > 0 && <span style={{ background: "#7c3aed", color: "white", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{consoleLogs.length}</span>}
              <span style={{ marginLeft: "auto", color: "#7f849c", fontSize: 12 }}>{consoleOpen ? "▼" : "▲"}</span>
              {consoleLogs.length > 0 && <button onClick={e => { e.stopPropagation(); setConsoleLogs([]); }} style={{ background: "none", border: "none", color: "#6c7086", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Clear</button>}
            </div>
            {consoleOpen && (
              <div style={{ maxHeight: 160, overflow: "auto", padding: "4px 12px 8px" }}>
                {consoleLogs.length === 0 ? (
                  <div style={{ color: "#6c7086", fontSize: 12, fontStyle: "italic" }}>Run your code to see console output...</div>
                ) : consoleLogs.map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: "20px", borderBottom: "1px solid #1a1b26", paddingBottom: 2 }}>
                    <span style={{ color: "#3d3d5c", minWidth: 60 }}>{log.time}</span>
                    <span style={{ color: "#6c7086", minWidth: 40 }}>[{log.method}]</span>
                    <span style={{ color: log.color, wordBreak: "break-all" }}>{log.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GITHUB MODAL */}
      {githubModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#1e1f2e", border: "1px solid #2a2b3d", borderRadius: 16, padding: 28, width: 440, maxWidth: "90vw", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>🐙</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>GitHub এ Push করুন</div>
                <div style={{ fontSize: 12, color: "#7f849c" }}>আপনার কোড GitHub-এ সংরক্ষণ করুন</div>
              </div>
            </div>

            {[
              { key: "username", label: "GitHub Username", placeholder: "your-username", type: "text" },
              { key: "repo", label: "Repository Name", placeholder: "my-awesome-project", type: "text" },
              { key: "token", label: "Personal Access Token", placeholder: "ghp_xxxxxxxxxxxx", type: "password" },
              { key: "message", label: "Commit Message", placeholder: "Initial commit from CodeForge", type: "text" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#7f849c", display: "block", marginBottom: 5 }}>{field.label}</label>
                <input
                  type={field.type}
                  value={githubForm[field.key]}
                  onChange={e => setGithubForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: "100%", background: "#13131a", border: "1px solid #2a2b3d", borderRadius: 8, padding: "9px 12px", color: "#cdd6f4", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ fontSize: 11, color: "#6c7086", marginBottom: 16, background: "#13131a", padding: 10, borderRadius: 8, borderLeft: "3px solid #7c3aed" }}>
              💡 Token তৈরি করুন: GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token (repo scope দিন)
            </div>

            {githubStatus && (
              <div style={{ padding: 12, borderRadius: 8, marginBottom: 14, background: githubStatus.type === "success" ? "#1a2e1a" : "#2e1a1a", border: `1px solid ${githubStatus.type === "success" ? "#22c55e33" : "#f38ba833"}`, fontSize: 13, color: githubStatus.type === "success" ? "#a6e3a1" : "#f38ba8", whiteSpace: "pre-wrap" }}>
                {githubStatus.msg}
                {githubStatus.url && <div style={{ marginTop: 6 }}><a href={githubStatus.url} target="_blank" rel="noreferrer" style={{ color: "#89dceb" }}>{githubStatus.url}</a></div>}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setGithubModal(false); setGithubStatus(null); }} style={{ flex: 1, background: "#2a2b3d", border: "none", borderRadius: 8, padding: "10px", color: "#cdd6f4", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>বাতিল</button>
              <button onClick={pushToGitHub} disabled={pushing} style={{ flex: 2, background: pushing ? "#2a2b3d" : "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 8, padding: "10px", color: "white", cursor: pushing ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
                {pushing ? "⏳ Pushing..." : "🚀 Push to GitHub"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW FILE MODAL */}
      {newFileModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1e1f2e", border: "1px solid #2a2b3d", borderRadius: 12, padding: 24, width: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📄 নতুন ফাইল তৈরি করুন</div>
            <input
              autoFocus
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addNewFile(); if (e.key === "Escape") { setNewFileModal(false); setNewFileName(""); } }}
              placeholder="filename.html, style.css, app.js..."
              style={{ width: "100%", background: "#13131a", border: "1px solid #7c3aed", borderRadius: 8, padding: "10px 12px", color: "#cdd6f4", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setNewFileModal(false); setNewFileName(""); }} style={{ flex: 1, background: "#2a2b3d", border: "none", borderRadius: 8, padding: "8px", color: "#cdd6f4", cursor: "pointer", fontFamily: "inherit" }}>বাতিল</button>
              <button onClick={addNewFile} style={{ flex: 1, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 8, padding: "8px", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>তৈরি করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
