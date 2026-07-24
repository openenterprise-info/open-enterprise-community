import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { exportMD, exportPDF } from "../../utils/exportOutput";
import { load as yamlLoad } from "js-yaml";

// ── helpers ───────────────────────────────────────────────────────────────────
const CONVOS_KEY = "oe_agent_builder_convos";
const ACTIVE_KEY = "oe_agent_builder_active";

const WELCOME = {
  role: "assistant",
  isWelcome: true,
  content: "Hi! I'm your Agent Builder. Tell me what you want your agent to do and I'll help you design it and generate the YAML.\n\nFor example: \"I want an agent that SSHs into my server to check disk usage, then sends a Slack alert if any partition is above 80%.\"",
};

function extractYaml(content) {
  const match = content?.match(/```yaml\n?([\s\S]*?)\n?```/);
  return match ? match[1].trim() : null;
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function newConvo() {
  return { id: Date.now().toString(), name: "New Conversation", messages: [WELCOME], createdAt: Date.now() };
}

function loadConvos() {
  try {
    const raw = localStorage.getItem(CONVOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupt */ }
  const c = newConvo();
  return [c];
}

function saveConvos(convos) {
  try { localStorage.setItem(CONVOS_KEY, JSON.stringify(convos)); } catch { /* full */ }
}

// ── Response Action Buttons ───────────────────────────────────────────────────
function AgentResponseActions({ content, onSave, navigate }) {
  const yaml = extractYaml(content);
  const [saveLabel, setSaveLabel] = useState("Save to My Agents");
  const [dlYamlLabel, setDlYamlLabel] = useState("Download YAML");
  const [copiedCmd, setCopiedCmd] = useState(null);

  let agentFilename = "agent";
  try { const p = yamlLoad(yaml); if (p?.name) agentFilename = p.name.toLowerCase().replace(/\s+/g, "-"); } catch { /* */ }

  const cmds = [
    { label: "Win",   cmd: `oe-runtime-win.exe ${agentFilename}.yaml --config oe-config.json` },
    { label: "Mac",   cmd: `oe-runtime-macos ${agentFilename}.yaml --config oe-config.json` },
    { label: "Linux", cmd: `oe-runtime-linux ${agentFilename}.yaml --config oe-config.json` },
  ];

  function copyCmd(key, text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  }

  function flash(setter, ok, reset) {
    setter(ok);
    setTimeout(() => setter(reset), 2200);
  }

  function handleSave() {
    if (!yaml) { flash(setSaveLabel, "No YAML found", "Save to My Agents"); return; }
    let parsed = {};
    try { parsed = yamlLoad(yaml) || {}; } catch { /* use empty */ }
    const entry = {
      name:         parsed.name         || "Untitled Agent",
      description:  parsed.description  || "",
      instructions: parsed.instructions || "",
      steps:        parsed.steps        || [],
      connectors:   parsed.connectors   || [],
      params:       parsed.params       || [],
      yaml,
      savedAt: Date.now(),
      source: "builder",
    };
    try {
      const existing = JSON.parse(localStorage.getItem("oe_marketplace_saved") || "[]");
      const idx = existing.findIndex(s => s.name === entry.name);
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      localStorage.setItem("oe_marketplace_saved", JSON.stringify(existing));
      flash(setSaveLabel, "Saved to My Agents ✓", "Save to My Agents");
      if (onSave) onSave();
    } catch { flash(setSaveLabel, "Save failed", "Save to My Agents"); }
  }

  function handleDownloadYaml() {
    if (!yaml) { flash(setDlYamlLabel, "No YAML found", "Download YAML"); return; }
    let name = "agent";
    try { const p = yamlLoad(yaml); if (p?.name) name = p.name.toLowerCase().replace(/\s+/g, "-"); } catch { /* */ }
    downloadFile(`${name}.yaml`, yaml);
    flash(setDlYamlLabel, "Downloading…", "Download YAML");
  }

  function handleDownloadConfig() {
    navigate("/connectors-library");
  }

  const btnBase = "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border";
  const saveErr = saveLabel.includes("failed") || saveLabel.includes("No YAML");

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
      {/* Save — indigo */}
      <button onClick={handleSave} className={`${btnBase} ${
        saveLabel.includes("✓")
          ? "border-green-300 text-green-700 bg-green-50"
          : saveErr
          ? "border-red-200 text-red-600 bg-red-50"
          : "border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
      }`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {saveLabel}
      </button>

      {/* Download YAML — teal */}
      <button onClick={handleDownloadYaml} className={`${btnBase} ${
        dlYamlLabel !== "Download YAML"
          ? "border-green-300 text-green-700 bg-green-50"
          : "border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100"
      }`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {dlYamlLabel}
      </button>

      {/* Connector Config — amber → goes to Connectors Library */}
      <button onClick={handleDownloadConfig} className={`${btnBase} border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Download Config
      </button>
      {/* Runtime commands */}
      <div className="w-full mt-1 rounded-lg overflow-hidden bg-gray-950 divide-y divide-gray-800">
        {cmds.map(({ label, cmd }) => (
          <button
            key={label}
            onClick={() => copyCmd(label, cmd)}
            title="Click to copy"
            className="group flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors"
          >
            <span className="text-[10px] font-bold text-gray-500 w-9 shrink-0">{label}</span>
            <span className="text-green-400 font-mono text-xs flex-1 truncate">$ {cmd}</span>
            <span className={`text-[10px] font-medium shrink-0 transition-colors ${copiedCmd === label ? "text-green-400" : "text-gray-600 group-hover:text-gray-300"}`}>
              {copiedCmd === label ? "Copied!" : "Copy"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg, isActive, onSave, navigate }) {
  const isUser = msg.role === "user";
  const content = msg.content || "";

  const renderContent = () => {
    if (!content && isActive) {
      return (
        <div className="flex gap-1 py-0.5">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      );
    }
    const parts = content.split(/(```yaml[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```yaml")) {
        const code = part.replace(/^```yaml\n?/, "").replace(/\n?```$/, "");
        return (
          <div key={i} className="mt-2 mb-1 text-left">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-t-lg">
              <span className="text-xs text-gray-400 font-mono">agent.yaml</span>
              <span className="ml-auto text-[10px] text-green-400 font-semibold uppercase tracking-wide">YAML</span>
            </div>
            <pre className="bg-gray-950 text-green-300 text-xs font-mono p-3 rounded-b-lg overflow-x-auto whitespace-pre">{code}</pre>
          </div>
        );
      }
      return part ? <span key={i} className="whitespace-pre-wrap">{part}</span> : null;
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[76%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-indigo-600 text-white rounded-br-sm"
          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
      }`}>
        {renderContent()}
        {!isUser && !msg.isWelcome && !isActive && extractYaml(content) && (
          <AgentResponseActions content={content} onSave={onSave} navigate={navigate} />
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AgentBuilderPage() {
  const navigate = useNavigate();
  const [convos, setConvos]       = useState(loadConvos);
  const [activeId, setActiveId]   = useState(() => {
    try { return localStorage.getItem(ACTIVE_KEY) || loadConvos()[0].id; } catch { return loadConvos()[0].id; }
  });
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showExport, setShowExport]     = useState(false);
  const [showHistory, setShowHistory]   = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const endRef   = useRef(null);
  const textRef  = useRef(null);
  const abortRef = useRef(null);

  const active = convos.find(c => c.id === activeId) || convos[0];
  const messages = active?.messages || [WELCOME];

  useEffect(() => { saveConvos(convos); }, [convos]);
  useEffect(() => { try { localStorage.setItem(ACTIVE_KEY, activeId); } catch { /* */ } }, [activeId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function updateMessages(id, updater) {
    setConvos(prev => prev.map(c => c.id === id ? { ...c, messages: updater(c.messages) } : c));
  }

  function autoName(id, text) {
    const name = text.replace(/\s+/g, " ").trim().slice(0, 48);
    setConvos(prev => prev.map(c => c.id === id && c.name === "New Conversation" ? { ...c, name } : c));
  }

  function createConvo() {
    const c = newConvo();
    setConvos(prev => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
  }

  function deleteConvo(id) {
    setConvos(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const c = newConvo();
        setActiveId(c.id);
        return [c];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const id = active.id;
    const userMsg = { role: "user", content: text };
    const apiMsgs = [...messages, userMsg]
      .filter(m => !m.isWelcome)
      .map(({ role, content }) => ({ role, content }));

    updateMessages(id, prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    autoName(id, text);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const token = localStorage.getItem("oe_token") || sessionStorage.getItem("oe_token");

    try {
      const res = await fetch("/api/agent-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: apiMsgs }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        updateMessages(id, prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `Error ${res.status}: ${txt}` }; return u; });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop();
        for (const part of parts) {
          const line = part.startsWith("data: ") ? part : part.split("\n").find(l => l.startsWith("data: "));
          if (!line) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.chunk) {
              accumulated += evt.chunk;
              const snap = accumulated;
              updateMessages(id, prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: snap }; return u; });
            }
            if (evt.error) {
              updateMessages(id, prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `Error: ${evt.error}` }; return u; });
            }
          } catch { /* partial */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        updateMessages(id, prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `Connection error: ${err.message}` }; return u; });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      textRef.current?.focus();
    }
  }

  function stop() { abortRef.current?.abort(); }

  function doExportMD() {
    const content = messages.filter(m => !m.isWelcome).map(m => `**${m.role === "user" ? "You" : "Agent Builder"}:** ${m.content}`).join("\n\n---\n\n");
    exportMD(content, `agent-builder-${active.name.toLowerCase().replace(/\s+/g, "-")}`);
    setShowExport(false);
  }

  function doExportPDF() {
    const content = messages.filter(m => !m.isWelcome).map(m => `${m.role === "user" ? "You" : "Agent Builder"}:\n${m.content}`).join("\n\n---\n\n");
    exportPDF(content, `agent-builder-${active.name.toLowerCase().replace(/\s+/g, "-")}`);
    setShowExport(false);
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar: conversations ── */}
      <div className="w-60 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-900">Agent Builder</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Design agents through conversation</p>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Conversations</p>
            <button
              onClick={createConvo}
              className="flex items-center gap-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>

          {convos.map(c => (
            <div
              key={c.id}
              onClick={() => { setActiveId(c.id); setInput(""); }}
              className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                c.id === activeId ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="flex-1 text-xs truncate">{c.name}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteConvo(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-gray-900 text-[15px]">Agent Builder</h1>
            {active && <>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500 truncate">{active.name}</span>
            </>}
          </div>

          <div className="flex items-center gap-1 relative">
            {/* Conversation history */}
            {messages.filter(m => !m.isWelcome && m.role === "user").length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowHistory(v => !v); setShowExport(false); }}
                  title="Conversation"
                  className={`p-1.5 rounded-lg transition-colors ${showHistory ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                  </svg>
                </button>
                {showHistory && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => { setShowHistory(false); setHistorySearch(""); }} />
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Conversation</p>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {messages.filter(m => !m.isWelcome && m.role === "user").length} messages
                        </span>
                      </div>
                      <div className="px-3 py-2 border-b border-gray-100">
                        <input
                          type="text"
                          value={historySearch}
                          onChange={e => setHistorySearch(e.target.value)}
                          placeholder="Search conversation…"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 outline-none focus:border-indigo/40 focus:bg-white transition-colors"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto max-h-[340px] py-1">
                        {messages
                          .filter(m => !m.isWelcome && m.role === "user" && (!historySearch || m.content?.toLowerCase().includes(historySearch.toLowerCase())))
                          .map((msg, idx) => (
                            <div key={idx} className="w-full text-left flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                              <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-500">
                                {idx + 1}
                              </span>
                              <p className="text-sm text-gray-700 leading-snug line-clamp-2 flex-1">{msg.content}</p>
                            </div>
                          ))
                        }
                        {historySearch && messages.filter(m => !m.isWelcome && m.role === "user" && m.content?.toLowerCase().includes(historySearch.toLowerCase())).length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">No messages found</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Export */}
            {messages.filter(m => !m.isWelcome).length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowExport(v => !v); setShowHistory(false); }}
                  title="Export conversation"
                  className={`p-1.5 rounded-lg transition-colors ${showExport ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {showExport && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowExport(false)} />
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
                      <button onClick={doExportMD}  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Export as MD</button>
                      <button onClick={doExportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Export as PDF</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-8 space-y-4">
            {messages.map((m, i) => (
              <Bubble
                key={i}
                msg={m}
                isActive={streaming && i === messages.length - 1 && m.role === "assistant"}
                onSave={() => {}}
                navigate={navigate}
              />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-5 pt-3 bg-white border-t border-gray-100">
          <div className="max-w-[720px] mx-auto flex gap-2 items-end">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              disabled={streaming}
              placeholder="Describe your agent… (Enter to send, Shift+Enter for newline)"
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {streaming ? (
              <button onClick={stop} className="shrink-0 w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
              </button>
            ) : (
              <button onClick={send} disabled={!input.trim()} className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
