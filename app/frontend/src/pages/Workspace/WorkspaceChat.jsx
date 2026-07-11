import React, { useState, useEffect, useRef } from "react";
import VisualizationCard from "../../components/VisualizationCard";
import { exportMD, exportPDF, exportFilename } from "../../utils/exportOutput";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import WorkspaceDrawer from "../../components/WorkspaceDrawer";
import ConfirmDialog from "../../components/ConfirmDialog";
import AgentsChatPanel from "../../components/AgentsChatPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Thread sidebar item ────────────────────────────────────────────────────────

function ThreadItem({ thread, isActive, onSelect, onRename, onDelete, onPin }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(thread.name);
  const inputRef              = useRef();

  useEffect(() => { setName(thread.name); }, [thread.name]);

  function startEdit(e) {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  }

  function commit() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== thread.name) onRename(trimmed);
    else setName(thread.name);
    setEditing(false);
  }

  function handleKey(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setName(thread.name); setEditing(false); }
    e.stopPropagation();
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {/* Pin indicator */}
      {thread.pinned ? (
        <svg className="w-3 h-3 shrink-0 text-indigo rotate-45" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-sm bg-transparent border-b border-indigo outline-none text-gray-800 min-w-0 py-0.5"
        />
      ) : (
        <span className="flex-1 text-sm truncate">{thread.name}</span>
      )}

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* Pin / Unpin */}
          <button
            onClick={e => { e.stopPropagation(); onPin(); }}
            title={thread.pinned ? "Unpin" : "Pin"}
            className={`p-0.5 rounded transition-colors ${thread.pinned ? "text-indigo hover:text-indigo/70" : "text-gray-400 hover:text-indigo"}`}
          >
            <svg className="w-3 h-3 rotate-45" fill={thread.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke={thread.pinned ? "none" : "currentColor"}>
              {thread.pinned
                ? <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
              }
            </svg>
          </button>
          {/* Rename */}
          <button onClick={startEdit} title="Rename" className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* Delete */}
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete" className="text-gray-400 hover:text-red-500 p-0.5 rounded">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Convert markdown table to TSV for Excel paste ────────────────────────────

function markdownToTSV(markdown) {
  const lines = markdown.split("\n").filter(l => l.trim().startsWith("|"));
  const dataLines = lines.filter(l => !/^\|[\s|:-]+\|$/.test(l.trim()));
  if (!dataLines.length) return null;
  return dataLines.map(line =>
    line.split("|").slice(1, -1).map(cell => cell.trim()).join("\t")
  ).join("\n");
}

// ── Strip markdown for TTS ────────────────────────────────────────────────────

function stripMarkdown(text = "") {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/(\*\*\*|___)([^*_]+)\1/g, "$2")
    .replace(/(\*\*|__)([^*_]+)\1/g, "$2")
    .replace(/(\*|_)([^*_\n]+)\1/g, "$2")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const preRef = React.useRef(null);

  function handleCopy() {
    const text = preRef.current?.innerText || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative my-3 group">
      <pre ref={preRef} className="bg-gray-900 text-gray-100 text-[13px] rounded-xl px-4 py-3 overflow-x-auto font-mono leading-relaxed">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-medium px-2 py-1 rounded-md"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

const MD_COMPONENTS = {
  p:          ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  h1:         ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
  h2:         ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>,
  h3:         ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
  ul:         ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:         ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-3 text-gray-600 italic">{children}</blockquote>,
  hr:         () => <hr className="my-4 border-gray-200" />,
  a:          ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo underline hover:opacity-80">{children}</a>,
  code:       ({ inline, children }) => inline
    ? <code className="bg-gray-100 text-gray-800 text-[13px] px-1.5 py-0.5 rounded font-mono">{children}</code>
    : <code className="block">{children}</code>,
  pre:        ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table:      ({ children }) => <div className="overflow-x-auto my-3"><table className="text-sm border-collapse w-full">{children}</table></div>,
  th:         ({ children }) => <th className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-semibold text-left">{children}</th>,
  td:         ({ children }) => <td className="border border-gray-200 px-3 py-1.5">{children}</td>,
};

function MarkdownContent({ content }) {
  return (
    <div className="text-[15px] text-gray-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Chat message ──────────────────────────────────────────────────────────────

function ChatMessage({ msg, ttsSettings, onShowSources }) {
  const isUser = msg.role === "user";
  const [speaking, setSpeaking]   = React.useState(false);
  const [copied, setCopied]       = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const audioRef = React.useRef(null);

  const isAgentMsg = /^\*\*@/.test(msg.content);

  function getExportContent() {
    // Strip **@slug** — prefix and trailing chain note
    return msg.content
      .replace(/^\*\*@[^*]+\*\*\s*(\(chained\)\s*)?—\s*/, "")
      .replace(/\n\n\*🔗 Chaining to[^*]+…\*$/, "")
      .trim();
  }

  function getExportFilename() {
    const slug = (msg.content.match(/^\*\*@([^*]+)\*\*/) || [])[1] || "agent-output";
    const date = new Date().toISOString().slice(0, 10);
    return `${slug}-${date}`;
  }

  function doExportMD() { exportMD(getExportContent(), getExportFilename()); setExportOpen(false); }
  function doExportPDF() { exportPDF(getExportContent(), getExportFilename()); setExportOpen(false); }
  function doExportCSV() {
    const csv = `"Role","Message","Date"\n"${msg.role}","${getExportContent().replace(/"/g,'""')}","${msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}"`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}));
    a.download = getExportFilename()+".csv"; a.click(); setExportOpen(false);
  }

  function stopSpeech() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  async function toggleSpeak() {
    if (speaking) { stopSpeech(); return; }
    const text = stripMarkdown(msg.content);
    if (!text) return;

    if (ttsSettings?.tts_provider && ttsSettings.tts_provider !== "native") {
      try {
        setSpeaking(true);
        const res = await fetch(`/api/audio/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
          body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); };
        audio.play();
      } catch { setSpeaking(false); }
    } else {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  }

  async function copyText() {
    try {
      const hasTable = /\|.+\|/.test(msg.content);
      const tsv = hasTable ? markdownToTSV(msg.content) : null;
      await navigator.clipboard.writeText(tsv || msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }

  // ── User message ──
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#f4f4f4] rounded-3xl px-5 py-3 text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  // ── Assistant message ──
  return (
    <div className="group flex gap-4">
      {/* Logo avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5">
        E
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <MarkdownContent content={msg.content} />

        {/* Tool calls */}
        {msg.toolCalls?.length > 0 && (
          <details className="mt-2 group/tc">
            <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 w-fit select-none">
              <svg className="w-3 h-3 transition-transform group-open/tc:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              🔧 {msg.toolCalls.length} tool call{msg.toolCalls.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-1.5 ml-1 flex flex-col gap-1">
              {Object.entries(msg.toolCalls.reduce((acc, tc) => {
                const name = tc.name || tc;
                acc[name] = (acc[name] || 0) + 1;
                return acc;
              }, {})).map(([name, count]) => (
                <div key={name} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-green-500 text-sm leading-none">✅</span>
                  <span className="font-mono">{name}</span>
                  {count > 1 && <span className="text-gray-400">×{count}</span>}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Visualization card */}
        {msg.visualization && <VisualizationCard visualization={msg.visualization} />}

        {/* Action bar */}
        <div className="flex items-center gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy */}
          <button onClick={copyText} title="Copy" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Read aloud */}
          <button onClick={toggleSpeak} title={speaking ? "Stop" : "Read aloud"} className={`p-1.5 rounded-lg transition-colors ${speaking ? "text-indigo bg-indigo/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>
            {speaking ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12m-3.536-9.536a5 5 0 000 7.072" />
              </svg>
            )}
          </button>

          {/* Sources */}
          {msg.sources?.length > 0 && (
            <button
              onClick={() => onShowSources(msg.sources)}
              className="flex items-center gap-1.5 ml-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sources ({msg.sources.length})
            </button>
          )}

          {/* Export — agent messages only */}
          {isAgentMsg && (
            <div className="relative ml-1">
              <button
                onClick={() => setExportOpen(o => !o)}
                title="Export"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {exportOpen && (
                <div className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36 z-50">
                  <button onClick={doExportCSV} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span className="font-mono text-gray-400">.csv</span> CSV
                  </button>
                  <button onClick={doExportMD} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span className="font-mono text-gray-400">.md</span> Markdown
                  </button>
                  <button onClick={doExportPDF} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <span className="font-mono text-gray-400">.pdf</span> PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sources panel ─────────────────────────────────────────────────────────────

function SourcesPanel({ sources, onClose }) {
  return (
    <div className="w-[340px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-sm text-gray-900">Sources</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{sources.length}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sources.map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">{i + 1}</span>
              <p className="text-xs font-medium text-gray-500 truncate flex-1">
                {s.metadata?.filename || s.metadata?.source || `Chunk ${i + 1}`}
              </p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-6">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceChat() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace]       = useState(null);
  const [starterPrompts, setStarterPrompts] = useState([]);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState("");
  const [streaming, setStreaming]         = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [activeRunId, setActiveRunId]     = useState(null);
  const activeRunIdRef                    = useRef(null);
  const [showExport, setShowExport]     = useState(false);

  // Threads
  const [threads, setThreads]               = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [creatingThread, setCreatingThread] = useState(false);
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(null);
  const [deletingThread, setDeletingThread] = useState(false);

  // Sources panel
  const [activeSources, setActiveSources] = useState(null);

  // DLP interactive prompt (warn / redact)
  const [dlpPrompt, setDlpPrompt] = useState(null);
  // { type: "warn"|"redact", policyNames: [], originalText: "", redactedText: "" }

  // History search
  const [historySearch, setHistorySearch] = useState("");

  // History breadcrumbs
  const [showHistory, setShowHistory] = useState(false);
  const messageRefs = useRef(new Map());

  // Agents panel
  const [showAgentsPanel, setShowAgentsPanel] = useState(true);
  const [agents, setAgents]                   = useState([]);
  const [connectors, setConnectors]           = useState([]);
  const [mentionSearch, setMentionSearch]     = useState(null); // null = closed, string = filtering

  // Drawer
  const [drawerWorkspaceId, setDrawerWorkspaceId] = useState(null);
  const [drawerInitialTab, setDrawerInitialTab]   = useState("chat");

  // Audio
  const [ttsSettings, setTtsSettings] = useState({});
  const [listening, setListening]     = useState(false);
  const recognitionRef                = useRef(null);

  const canManageDocs = user?.role === "admin" || user?.role === "manager";
  const bottomRef = useRef();
  const inputRef  = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    setActiveThreadId(null);
    setMessages([]);
    setThreads([]);
    api.get(`/workspaces/${slug}`)
      .then(r => {
        setWorkspace(r.data.workspace);
        try {
          const p = JSON.parse(r.data.workspace.starterPrompts || "[]");
          setStarterPrompts(Array.isArray(p) ? p : []);
        } catch { setStarterPrompts([]); }
      })
      .catch(() => navigate("/"));
    api.get(`/threads/${slug}`)
      .then(r => {
        const loaded = r.data.threads || [];
        setThreads(loaded);
        if (loaded.length > 0) {
          const saved = localStorage.getItem(`oe_thread_${slug}`);
          const preferred = saved ? loaded.find(t => t.uid === saved) : null;
          setActiveThreadId((preferred || loaded[0]).uid);
        }
      })
      .catch(() => {});
    api.get("/settings")
      .then(r => setTtsSettings(r.data.settings || {}))
      .catch(() => {});
    api.get(`/workspaces/${slug}/agents`)
      .then(r => setAgents((r.data.agents || []).filter(a => a.slug)))
      .catch(() => {});
    api.get(`/workspaces/${slug}/connectors`)
      .then(r => setConnectors((r.data.connectors || []).filter(c => c.slug)))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    const refresh = () => api.get(`/workspaces/${slug}/agents`)
      .then(r => setAgents((r.data.agents || []).filter(a => a.slug)))
      .catch(() => {});
    window.addEventListener("agents-changed", refresh);
    return () => window.removeEventListener("agents-changed", refresh);
  }, [slug]);

  const reloadMessages = () => {
    if (!activeThreadId) return;
    api.get(`/chat/${slug}/history?threadId=${activeThreadId}`)
      .then(r => setMessages(r.data.messages))
      .catch(() => {});
  };

  useEffect(() => {
    if (!activeThreadId) { setMessages([]); return; }
    reloadMessages();
  }, [slug, activeThreadId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  // Auto-grow textarea
  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function scrollToMessage(id) {
    const el = messageRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleMic() {
    const sttProvider = ttsSettings?.stt_provider || "native";

    if (sttProvider !== "native") {
      if (listening) { recognitionRef.current?.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        const recorder = new MediaRecorder(stream);
        recognitionRef.current = recorder;
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          setListening(false);
          const blob = new Blob(chunks, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          try {
            const res = await fetch("/api/audio/stt", {
              method: "POST",
              headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
              body: form
            });
            const { transcript } = await res.json();
            if (transcript) {
              setInput(prev => (prev ? prev + " " : "") + transcript);
              setTimeout(() => autoGrow(textareaRef.current), 0);
            }
          } catch { /* silent */ }
        };
        recorder.start();
        setListening(true);
      } catch { setListening(false); }
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = e => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? prev + " " : "") + transcript);
      setTimeout(() => autoGrow(textareaRef.current), 0);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function exportThreadMD() {
    const thread = threads.find(t => t.uid === activeThreadId);
    const content = messages.map(m => `**${m.role === "user" ? "You" : "Assistant"}**\n\n${m.content || ""}`).join("\n\n---\n\n");
    const filename = exportFilename(thread?.name || workspace?.name, new Date());
    exportMD(content, filename);
    setShowExport(false);
  }

  function exportThreadCSV() {
    const thread = threads.find(t => t.uid === activeThreadId);
    const headers = ["Role", "Message", "Date"];
    const rows = messages.map(m => [
      m.role === "user" ? "User" : "Assistant",
      m.content || "",
      m.createdAt ? new Date(m.createdAt).toLocaleString() : ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = exportFilename(thread?.name || workspace?.name, new Date());
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `${filename}.csv`; a.click();
    setShowExport(false);
  }

  function exportPDF() {
    const thread = threads.find(t => t.uid === activeThreadId);
    const win = window.open("", "_blank");
    const html = `<!DOCTYPE html><html><head>
      <title>${workspace?.name || "Chat"}</title>
      <style>
        body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111}
        h1{font-size:22px;margin-bottom:4px}
        .meta{color:#666;font-size:13px;margin-bottom:32px}
        .msg{margin-bottom:20px}
        .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px}
        .label.user{color:#4f46e5}
        .bubble{background:#f5f5f5;border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap}
        .bubble.assistant{background:#fff;border:1px solid #e5e7eb}
      </style></head><body>
      <h1>${workspace?.name || "Chat"}</h1>
      <p class="meta">Thread: ${thread?.name || ""} &bull; Exported ${new Date().toLocaleString()}</p>
      ${messages.map(m => `<div class="msg"><div class="label ${m.role}">${m.role === "user" ? "You" : "Assistant"}</div><div class="bubble ${m.role}">${(m.content || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div></div>`).join("")}
      </body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
    setShowExport(false);
  }

  function openDrawer(tab) {
    if (!workspace) return;
    setDrawerInitialTab(tab);
    setDrawerWorkspaceId(workspace.id);
  }

  function selectThread(uid) {
    if (uid === activeThreadId) return;
    setActiveThreadId(uid);
    localStorage.setItem(`oe_thread_${slug}`, uid);
    setMessages([]);
    setActiveSources(null);
  }

  async function createThread() {
    if (creatingThread) return;
    setCreatingThread(true);
    try {
      const { data } = await api.post(`/threads/${slug}`, { name: "New Thread" });
      setThreads(t => [data.thread, ...t]);
      setActiveThreadId(data.thread.uid);
      localStorage.setItem(`oe_thread_${slug}`, data.thread.uid);
      setMessages([]);
    } catch { /* silent */ }
    finally { setCreatingThread(false); }
  }

  async function renameThread(uid, name) {
    try {
      const { data } = await api.put(`/threads/${slug}/${uid}`, { name });
      setThreads(t => t.map(th => th.uid === uid ? { ...th, name: data.thread.name } : th));
    } catch { /* silent */ }
  }

  async function togglePin(uid) {
    try {
      const { data } = await api.put(`/threads/${slug}/${uid}/pin`);
      setThreads(t => {
        const updated = t.map(th => th.uid === uid ? { ...th, pinned: data.thread.pinned } : th);
        return [...updated.filter(th => th.pinned), ...updated.filter(th => !th.pinned)];
      });
    } catch { /* silent */ }
  }

  async function doDeleteThread() {
    if (!confirmDeleteThread) return;
    setDeletingThread(true);
    try {
      await api.delete(`/threads/${slug}/${confirmDeleteThread.uid}`);
      setThreads(t => t.filter(th => th.uid !== confirmDeleteThread.uid));
      if (activeThreadId === confirmDeleteThread.uid) { setActiveThreadId(null); setMessages([]); }
      setConfirmDeleteThread(null);
    } catch { /* silent */ }
    finally { setDeletingThread(false); }
  }

  async function sendMessage(e, overrideText, opts = {}) {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const { bypassDlp, silent } = opts;

    if (!silent) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setMessages(m => [...m, { id: Date.now(), role: "user", content: text }]);
    }
    setStreaming(true);
    setStreamingText("");
    setActiveSources(null);

    try {
      const token = localStorage.getItem("oe_token");
      const res = await fetch(`/api/chat/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, threadId: activeThreadId || undefined, bypassDlp })
      });
      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let finalSources = [];
      let finalVisualization = null;
      let allToolCalls = [];
      let sseBuffer = "";
      let dlpIntercepted = false;

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
            if (evt.dlp && evt.dlp.action === "warn") {
              dlpIntercepted = true;
              // Add the saved warn notice to chat immediately (already in DB)
              setMessages(m => [...m, { id: Date.now() + 1, role: "assistant", content: evt.dlp.message }]);
              setDlpPrompt({ type: "warn", policyNames: evt.dlp.policyNames, originalText: text });
            }
            if (evt.run_id) { setActiveRunId(evt.run_id); activeRunIdRef.current = evt.run_id; }
            if (evt.tool_calls) {
              allToolCalls = allToolCalls.map(t => ({ ...t, done: true }));
              evt.tool_calls.forEach(name => allToolCalls.push({ name, done: false }));
              setActiveToolCalls([...allToolCalls]);
            }
            if (evt.chunk) { accumulated += evt.chunk; setStreamingText(accumulated); setActiveToolCalls(allToolCalls.map(t => ({ ...t, done: true }))); }
            if (evt.done)  { finalSources = evt.sources || []; finalVisualization = evt.visualization || null; if (evt.content) accumulated = evt.content; }
            if (evt.error) { accumulated = `*Error: ${evt.error}*`; }
          } catch { /* partial */ }
        }
      }

      if (!dlpIntercepted) {
        const finalToolCalls = allToolCalls.map(t => ({ ...t, done: true }));
        setMessages(m => [...m, { id: Date.now() + 1, role: "assistant", content: accumulated, sources: finalSources, toolCalls: finalToolCalls.length ? finalToolCalls : undefined, visualization: finalVisualization }]);
        // Auto-rename thread from first message
        const currentThread = threads.find(t => t.uid === activeThreadId);
        if (!silent && currentThread && currentThread.name === "New Thread" && messages.length === 0) {
          const autoName = text.replace(/\s+/g, " ").trim().slice(0, 50);
          renameThread(activeThreadId, autoName);
        }
      }
      setStreamingText("");
      setActiveToolCalls([]);
      setActiveRunId(null);
      activeRunIdRef.current = null;
    } catch {
      setMessages(m => [...m, { id: Date.now() + 1, role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setStreaming(false);
      setActiveToolCalls([]);
      setActiveRunId(null);
      activeRunIdRef.current = null;
      inputRef.current?.focus();
    }
  }

  function acceptDlp() {
    if (!dlpPrompt) return;
    const { type, originalText, redactedText } = dlpPrompt;
    setDlpPrompt(null);
    const msgToSend = type === "redact" ? redactedText : originalText;
    sendMessage(null, msgToSend, { bypassDlp: type, silent: true });
  }

  function declineDlp() {
    setDlpPrompt(null);
  }

  const hasMic = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition || navigator.mediaDevices);

  return (
    <div className="flex h-full bg-white overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">

        {/* Back nav */}
        <div className="px-3 py-3 border-b border-gray-200">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </button>
        </div>

        {/* Workspace name */}
        <div className="px-3 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="flex-1 text-sm font-semibold text-gray-900 truncate min-w-0">{workspace?.name || "…"}</p>
            {canManageDocs && (
              <button
                onClick={() => openDrawer("sources")}
                title="Workspace settings"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-5 pb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Threads</p>
            <button
              onClick={createThread}
              disabled={creatingThread}
              className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Thread
            </button>
          </div>

          {threads.length === 0 && (
            <div className="px-5 py-4 text-xs text-gray-400 text-center leading-relaxed">
              No threads yet.<br />Click "New Thread" to create one.
            </div>
          )}

          {threads.map(thread => (
            <ThreadItem
              key={thread.uid}
              thread={thread}
              isActive={activeThreadId === thread.uid}
              onSelect={() => selectThread(thread.uid)}
              onRename={name => renameThread(thread.uid, name)}
              onDelete={() => setConfirmDeleteThread(thread)}
              onPin={() => togglePin(thread.uid)}
            />
          ))}
        </div>
      </div>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-gray-900 text-[15px] truncate">{workspace?.name || "…"}</h1>
            {activeThreadId && <>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-500 truncate">{threads.find(t => t.uid === activeThreadId)?.name}</span>
            </>}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Agents panel toggle */}
            <button
              onClick={() => setShowAgentsPanel(v => !v)}
              title="Agents"
              className={`p-1.5 rounded-lg transition-colors ${showAgentsPanel ? "bg-indigo/10 text-indigo" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
              </svg>
            </button>
            {/* History breadcrumbs button */}
            {messages.filter(m => m.role === "user").length > 0 && (
              <button
                onClick={() => setShowHistory(h => !h)}
                title="Conversation history"
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                </svg>
              </button>
            )}

            {/* Export button */}
            {messages.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowExport(v => !v)}
                  title="Export chat"
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
                      <button onClick={exportThreadCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Export as CSV</button>
                      <button onClick={exportThreadMD} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Export as MD</button>
                      <button onClick={exportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Export as PDF</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Floating history panel */}
          {showHistory && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => { setShowHistory(false); setHistorySearch(""); }} />
              <div className="absolute right-4 top-full mt-1 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Conversation</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {messages.filter(m => m.role === "user").length} messages
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
                  {messages.filter(m => m.role === "user" && (!historySearch || m.content?.toLowerCase().includes(historySearch.toLowerCase()))).map((msg, idx) => (
                    <button
                      key={msg.id}
                      onClick={() => { scrollToMessage(msg.id); setShowHistory(false); setHistorySearch(""); }}
                      className="w-full text-left flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                    >
                      <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-500 transition-colors">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-gray-700 leading-snug line-clamp-2 flex-1">{msg.content}</p>
                    </button>
                  ))}
                  {historySearch && messages.filter(m => m.role === "user" && m.content?.toLowerCase().includes(historySearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No messages found</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-8 space-y-6">

            {!activeThreadId && (
              <div className="flex flex-col items-center justify-center pt-20 text-center">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{workspace?.name || "Open Enterprise"}</h2>
                <p className="text-gray-500 text-[15px] max-w-sm leading-relaxed mb-6">
                  Select a thread from the sidebar or create a new one to start chatting.
                </p>
                <button
                  onClick={createThread}
                  disabled={creatingThread}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {creatingThread ? "Creating…" : "New Thread"}
                </button>
              </div>
            )}

            {activeThreadId && messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center pt-20 text-center">
                <p className="text-gray-400 text-[15px]">Ask questions grounded in the workspace documents.</p>
                {starterPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
                    {starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(null, prompt)}
                        disabled={streaming}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-indigo hover:text-indigo hover:bg-indigo/5 transition-colors text-left disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                ref={el => { if (el) messageRefs.current.set(msg.id, el); else messageRefs.current.delete(msg.id); }}
              >
                <ChatMessage
                  msg={msg}
                  ttsSettings={ttsSettings}
                  onShowSources={setActiveSources}
                />
              </div>
            ))}

            {/* Streaming */}
            {streaming && streamingText && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5">E</div>
                <div className="flex-1 min-w-0">
                  <MarkdownContent content={streamingText} />
                  <span className="inline-block w-0.5 h-[18px] bg-gray-700 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5">E</div>
                <div className="flex flex-col gap-1.5 mt-1">
                  {activeToolCalls.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {activeToolCalls.map((tc, i) => {
                        const label = tc.name || tc;
                        const isDone = tc.done;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs font-medium">
                            {isDone
                              ? <span className="text-green-500 text-sm leading-none">✅</span>
                              : <div className="w-3.5 h-3.5 border-2 border-indigo border-t-transparent rounded-full animate-spin shrink-0" />
                            }
                            <span className={isDone ? "text-gray-400" : "text-indigo"}>{label}{isDone ? "" : "…"}</span>
                          </div>
                        );
                      })}
                      {activeRunId && (
                        <button onClick={async () => {
                            const runId = activeRunIdRef.current;
                            if (!runId) return;
                            try { await api.post(`/workspaces/${slug}/agents/0/runs/${runId}/cancel`); }
                            catch (err) { console.error("Stop failed:", err?.response?.data || err.message); }
                          }}
                          className="mt-1 self-start flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors">
                          ⏹ Stop
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar — ChatGPT style */}
        <div className="px-6 pb-5 pt-3 bg-white">
          <div className="max-w-[720px] mx-auto relative">
            {/* @mention autocomplete dropdown */}
            {mentionSearch !== null && (() => {
              const filteredAgents = agents.filter(a => a.slug?.startsWith(mentionSearch));
              const filteredConns  = connectors.filter(c => c.slug?.startsWith(mentionSearch));
              const hasResults = filteredAgents.length > 0 || filteredConns.length > 0;
              function pickMention(slug) {
                setInput(input.replace(/@[\w-]*$/, `@${slug} `));
                setMentionSearch(null);
                setTimeout(() => inputRef.current?.focus(), 0);
              }
              return (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
                  {!hasResults && (
                    <p className="text-sm text-gray-400 px-3 py-3">No matching agents or connectors</p>
                  )}
                  {filteredAgents.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Agents</p>
                      {filteredAgents.map(a => (
                        <button key={a.id} type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo/5 text-left transition-colors"
                          onMouseDown={e => { e.preventDefault(); pickMention(a.slug); }}>
                          <span className="w-7 h-7 rounded-full bg-indigo flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {a.name?.[0]?.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                            <p className="text-xs text-indigo font-mono">@{a.slug}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredConns.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Connectors</p>
                      {filteredConns.map(c => (
                        <button key={c.id} type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 text-left transition-colors"
                          onMouseDown={e => { e.preventDefault(); pickMention(c.slug); }}>
                          <span className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {c.name?.[0]?.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                            <p className="text-xs text-emerald-600 font-mono">@{c.slug}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
            {/* DLP warn prompt */}
            {dlpPrompt?.type === "warn" && (
              <div className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Do you want to send this message anyway?</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Your message was flagged by the <strong>"{dlpPrompt.policyNames?.join('", "')}"</strong> policy and has been logged.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={declineDlp}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                        Decline
                      </button>
                      <button type="button" onClick={acceptDlp}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                        Send Anyway
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={sendMessage}>
              <div className={`flex items-end gap-2 bg-white rounded-2xl border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] px-3 py-2 ${
                streaming ? "border-gray-200 opacity-80" : "border-gray-300 focus-within:border-gray-400 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
              }`}>

                {/* + attachment button */}
                {canManageDocs && (
                  <button
                    type="button"
                    onClick={() => openDrawer("sources")}
                    title="Add documents"
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mb-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}

                {/* Textarea */}
                <textarea
                  ref={el => { inputRef.current = el; textareaRef.current = el; }}
                  rows={1}
                  value={input}
                  onChange={e => {
                    const val = e.target.value;
                    setInput(val);
                    autoGrow(e.target);
                    const m = val.match(/@([\w-]*)$/);
                    setMentionSearch(m ? m[1] : null);
                  }}
                  onKeyDown={e => {
                    if (mentionSearch !== null && e.key === "Escape") { setMentionSearch(null); return; }
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder={activeThreadId ? "Ask anything — or type @ to run an agent" : "Select a thread to start chatting…"}
                  disabled={streaming || !activeThreadId}
                  className="flex-1 resize-none bg-transparent text-[15px] text-gray-900 placeholder-gray-400 outline-none py-1.5 leading-relaxed overflow-hidden disabled:opacity-60"
                  style={{ minHeight: "36px", maxHeight: "160px" }}
                />

                {/* Mic + Send */}
                <div className="flex-shrink-0 flex items-center gap-1 mb-0.5">
                  {hasMic && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      title={listening ? "Stop recording" : "Voice input"}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        listening
                          ? "bg-red-100 text-red-500 animate-pulse"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={streaming || !input.trim() || !activeThreadId}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            <p className="text-xs text-center text-gray-400 mt-2">
              Open Enterprise can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>

      {/* ── Agents right panel ─────────────────────────────────────────────── */}
      {showAgentsPanel && (
        <AgentsChatPanel
          slug={slug}
          isManager={canManageDocs}
          onClose={() => setShowAgentsPanel(false)}
          onApprovalDecided={reloadMessages}
        />
      )}

      {/* ── Sources panel (right) ──────────────────────────────────────────── */}
      {activeSources && (
        <SourcesPanel sources={activeSources} onClose={() => setActiveSources(null)} />
      )}

      {/* ── WorkspaceDrawer ────────────────────────────────────────────────── */}
      {drawerWorkspaceId && (
        <WorkspaceDrawer
          workspaceId={drawerWorkspaceId}
          initialTab={drawerInitialTab}
          isAdmin={user?.role === "admin"}
          onClose={() => setDrawerWorkspaceId(null)}
          onDeleted={() => navigate("/")}
          onUpdated={updated => setWorkspace(w => ({ ...w, ...updated }))}
          onInsertMention={text => {
            setInput(prev => (prev ? prev + " " : "") + text + " ");
            setTimeout(() => {
              if (inputRef.current) { inputRef.current.focus(); autoGrow(inputRef.current); }
            }, 50);
          }}
        />
      )}

      {/* ── Delete thread confirm ──────────────────────────────────────────── */}
      {confirmDeleteThread && (
        <ConfirmDialog
          title="Delete Thread"
          message="Permanently delete thread and all its messages?"
          detail={confirmDeleteThread.name}
          confirmLabel="Delete"
          variant="danger"
          loading={deletingThread}
          onConfirm={doDeleteThread}
          onCancel={() => !deletingThread && setConfirmDeleteThread(null)}
        />
      )}
    </div>
  );
}
