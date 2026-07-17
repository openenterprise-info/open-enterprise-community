import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jsyaml from "js-yaml";

// ── YAML helpers ──────────────────────────────────────────────────────────────
function extractYaml(text) {
  const m = text.match(/```yaml\n?([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

function extractLastYaml(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const y = extractYaml(messages[i].content);
      if (y) return y;
    }
  }
  return null;
}

// ── Visual Flow ────────────────────────────────────────────────────────────────
const TRIGGER_COLORS = {
  manual:    { bg: "bg-blue-900/60",   border: "border-blue-500",   text: "text-blue-300",   label: "Manual" },
  scheduled: { bg: "bg-purple-900/60", border: "border-purple-500", text: "text-purple-300", label: "Scheduled" },
  chat:      { bg: "bg-teal-900/60",   border: "border-teal-500",   text: "text-teal-300",   label: "Chat" },
};
const CONNECTOR_ICONS = {
  ssh: "🖥", smtp: "📧", imap: "📬", gdrive: "📂", slack: "💬",
  http: "🌐", postgres: "🐘", mysql: "🐬", mongodb: "🍃",
  notion: "📝", jira: "🎯", github: "🐙",
};

function FlowArrow() {
  return (
    <div className="flex justify-center my-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-gray-600" />
        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21l-8-8h5V3h6v10h5z" />
        </svg>
      </div>
    </div>
  );
}

function TriggerNode({ trigger }) {
  const type = trigger?.type || "manual";
  const c = TRIGGER_COLORS[type] || TRIGGER_COLORS.manual;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3 mx-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>Trigger</span>
        <span className={`ml-auto text-xs font-semibold ${c.text}`}>{c.label}</span>
      </div>
      {trigger?.cron && (
        <div className="mt-1 text-[11px] font-mono text-gray-400">{trigger.cron}</div>
      )}
    </div>
  );
}

function StepNode({ step, index }) {
  return (
    <div className="rounded-xl border border-gray-600 bg-gray-800/70 px-4 py-3 mx-2">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-gray-200 truncate">{step.name || `Step ${index + 1}`}</span>
      </div>
      {step.content && (
        <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed line-clamp-2 ml-7">
          {String(step.content).trim().replace(/\n/g, " ")}
        </p>
      )}
    </div>
  );
}

function ConnectorNode({ connector }) {
  const icon = CONNECTOR_ICONS[connector.type] || "🔌";
  return (
    <div className="rounded-xl border border-green-800 bg-green-950/50 px-4 py-2.5 mx-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-green-300">{connector.name || connector.type}</div>
          {connector.type && <div className="text-[10px] text-green-600 uppercase tracking-wide">{connector.type}</div>}
        </div>
      </div>
    </div>
  );
}

function ChainNode({ chain }) {
  return (
    <div className="rounded-xl border border-violet-700 bg-violet-950/50 px-4 py-2.5 mx-2">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Chain to</div>
          <div className="text-xs font-semibold text-violet-300">{chain.agent || chain}</div>
        </div>
      </div>
    </div>
  );
}

function ParamNode({ param }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 mx-2">
      <span className="text-[10px] text-amber-400 font-mono">{param.name}</span>
      {param.label && <span className="text-[10px] text-gray-500">→ {param.label}</span>}
      {param.default !== undefined && param.default !== "" && (
        <span className="ml-auto text-[10px] font-mono text-gray-600">default: {param.default}</span>
      )}
    </div>
  );
}

function VisualFlow({ yamlText }) {
  let parsed = null;
  try { parsed = jsyaml.load(yamlText); } catch { /* bad yaml */ }

  if (!parsed || typeof parsed !== "object") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2">
        <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-xs text-gray-600">Could not parse YAML for visual flow.</p>
      </div>
    );
  }

  const trigger    = parsed.trigger    || {};
  const steps      = Array.isArray(parsed.steps)      ? parsed.steps      : [];
  const connectors = Array.isArray(parsed.connectors) ? parsed.connectors : [];
  const chains     = Array.isArray(parsed.chains)     ? parsed.chains     : [];
  const params     = Array.isArray(parsed.params)     ? parsed.params     : [];

  return (
    <div className="overflow-y-auto h-full py-4 flex flex-col gap-0">
      {/* Agent name */}
      {parsed.name && (
        <div className="mx-2 mb-3 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Agent</div>
          <div className="text-sm font-bold text-white">{parsed.name}</div>
          {parsed.description && (
            <div className="text-[11px] text-gray-400 mt-0.5">{parsed.description}</div>
          )}
        </div>
      )}

      {/* Trigger */}
      <TriggerNode trigger={trigger} />

      {/* Connectors section */}
      {connectors.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Connectors</div>
            <div className="flex flex-col gap-1.5">
              {connectors.map((c, i) => <ConnectorNode key={i} connector={c} />)}
            </div>
          </div>
        </>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Steps</div>
            <div className="flex flex-col gap-1.5">
              {steps.map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <FlowArrow />}
                  <StepNode step={s} index={i} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Chain */}
      {chains.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Chains</div>
            <div className="flex flex-col gap-1.5">
              {chains.map((c, i) => <ChainNode key={i} chain={c} />)}
            </div>
          </div>
        </>
      )}

      {/* Params */}
      {params.length > 0 && (
        <div className="mx-2 mt-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Parameters</div>
          <div className="flex flex-col gap-1">
            {params.map((p, i) => <ParamNode key={i} param={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chat bubble ────────────────────────────────────────────────────────────────
function Bubble({ msg, isActive }) {
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
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const WELCOME = {
  role: "assistant",
  isWelcome: true,
  content: "Hi! I'm your Agent Builder. Tell me what you want your agent to do and I'll help you design it and generate the YAML.\n\nFor example: \"I want an agent that runs every Monday, SSHs into my server to check disk usage, then sends a Slack alert if any partition is above 80%.\"",
};

export default function AgentBuilderPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rightTab, setRightTab] = useState("yaml");
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState("");
  const endRef = useRef(null);
  const textRef = useRef(null);
  const abortRef = useRef(null);

  const lastYaml = extractLastYaml(messages);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  // Switch to visual flow tab automatically when YAML first appears
  useEffect(() => { if (lastYaml) setRightTab("flow"); }, [!!lastYaml]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    const apiMsgs = [...messages, userMsg]
      .filter(m => !m.isWelcome)
      .map(({ role, content }) => ({ role, content }));

    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
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
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: `Error ${res.status}: ${txt}` };
          return u;
        });
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
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: snap };
                return u;
              });
            }
            if (evt.error) {
              const snap = `Error: ${evt.error}`;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: snap };
                return u;
              });
            }
          } catch { /* partial or SSE comment */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: `Connection error: ${err.message}` };
          return u;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      textRef.current?.focus();
    }
  }

  function stop() { abortRef.current?.abort(); }
  function clear() { setMessages([WELCOME]); setInput(""); setRightTab("yaml"); }
  async function copy() {
    if (!lastYaml) return;
    await navigator.clipboard.writeText(lastYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Chat panel ── */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50 border-r border-gray-200">
        <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agent Builder</h1>
              <p className="text-sm text-gray-400 mt-0.5">Design agents through conversation</p>
            </div>
          </div>
          <button onClick={clear} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors mt-1">Clear</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <Bubble
              key={i}
              msg={m}
              isActive={streaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex gap-2 items-end">
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

      {/* ── Right panel ── */}
      <div className="flex flex-col w-[420px] shrink-0 bg-gray-900">
        {/* Tab bar */}
        <div className="shrink-0 flex items-center gap-0 bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => setRightTab("yaml")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === "yaml"
                ? "border-indigo-400 text-indigo-300 bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            YAML
            {lastYaml && <span className="text-[9px] bg-green-900 text-green-400 px-1 py-px rounded font-bold">LIVE</span>}
          </button>

          <button
            onClick={() => setRightTab("flow")}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === "flow"
                ? "border-indigo-400 text-indigo-300 bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0h6m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H9m6 0V7m0 10a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Visual Flow
          </button>

          {/* Copy button (only on YAML tab) */}
          {rightTab === "yaml" && lastYaml && (
            <button onClick={copy} className="ml-auto mr-3 text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              {copied
                ? <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-green-400">Copied!</span></>
                : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
              }
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {rightTab === "yaml" ? (
            <div className="h-full overflow-y-auto p-4">
              {lastYaml
                ? <pre className="text-xs font-mono text-green-300 whitespace-pre leading-relaxed">{lastYaml}</pre>
                : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                    <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">YAML preview will appear once the AI designs an agent.</p>
                  </div>
                )
              }
            </div>
          ) : (
            <div className="h-full">
              {lastYaml
                ? <VisualFlow yamlText={lastYaml} />
                : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                    <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0h6m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H9m6 0V7m0 10a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <p className="text-sm text-gray-500">Visual flow will appear once the AI generates a YAML agent.</p>
                  </div>
                )
              }
            </div>
          )}
        </div>

        {/* Action buttons */}
        {lastYaml && (
          <div className="shrink-0 p-4 border-t border-gray-700 flex flex-col gap-2">
            {hint && <p className="text-xs text-amber-300 bg-amber-900/30 rounded-lg px-3 py-2">{hint}</p>}
            <button
              onClick={() => { setHint("Workspace import picker coming soon — copy the YAML and use Marketplace import for now."); setTimeout(() => setHint(""), 4000); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import to Workspace
            </button>
            <button
              onClick={() => navigate("/marketplace")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Go to Marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
