import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MD = {
  p:          ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul:         ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li:         ({ children }) => <li className="text-sm">{children}</li>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  code:       ({ inline, children }) => inline
    ? <code className="bg-indigo-50 text-indigo-700 px-1 rounded text-xs font-mono">{children}</code>
    : <code>{children}</code>,
  pre:        ({ children }) => <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto mb-2">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-indigo-300 pl-3 opacity-70 italic mb-2">{children}</blockquote>,
};

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
      </svg>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <BotAvatar />}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
        isUser
          ? "bg-indigo-600 text-white rounded-br-sm shadow-sm"
          : "bg-gray-100 text-gray-800 rounded-bl-sm"
      }`}>
        {isUser ? (
          <p className="leading-relaxed">{msg.content}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <BotAvatar />
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function EmbedChat() {
  const { slug }                    = useParams();
  const [wsName, setWsName]         = useState("");
  const [starterPrompts, setStarterPrompts] = useState([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [streaming, setStreaming]   = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError]           = useState("");
  const [notFound, setNotFound]     = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    fetch(`/api/embed/${slug}/config`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setWsName(d.name); setStarterPrompts(d.starterPrompts || []); setConfigLoaded(true); })
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch(`/api/embed/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      let full      = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.chunk) { full += parsed.chunk; setStreamText(full); }
            if (parsed.done)  { setMessages(prev => [...prev, { role: "assistant", content: full }]); setStreamText(""); setStreaming(false); }
            if (parsed.error) { setError(parsed.error); setStreaming(false); }
          } catch {}
        }
      }
    } catch {
      setError("Connection error. Please try again.");
      setStreaming(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Workspace not found.</p>
      </div>
    );
  }

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* Header — indigo */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 bg-indigo-600">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{configLoaded ? wsName : ""}</p>
          <p className="text-indigo-200 text-[10px]">Powered by Open Enterprise</p>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-indigo-200 text-xs">Online</span>
        </span>
      </div>

      {/* Messages — white */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
              </svg>
            </div>
            <div>
              <p className="text-gray-800 font-semibold text-sm mb-1">How can I help you?</p>
              <p className="text-gray-400 text-xs">Ask me anything about {wsName || "this workspace"}.</p>
            </div>
            {starterPrompts.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {starterPrompts.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)}
                    className="text-left text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl px-3 py-2.5 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {streaming && streamText && (
          <div className="flex items-end gap-2 mb-3">
            <BotAvatar />
            <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{streamText}</ReactMarkdown>
            </div>
          </div>
        )}
        {streaming && !streamText && <TypingDots />}

        {error && <div className="text-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

        <div ref={bottomRef} />
      </div>

      {/* Input — indigo */}
      <div className="shrink-0 px-3 py-3 bg-indigo-600">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-5 max-h-28 overflow-y-auto"
            placeholder="Type a message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || !input.trim()}
            className="shrink-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}
