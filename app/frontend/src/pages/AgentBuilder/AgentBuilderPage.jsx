import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function extractYaml(text) {
  const match = text.match(/```yaml\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function extractLastYaml(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const yaml = extractYaml(messages[i].content);
      if (yaml) return yaml;
    }
  }
  return null;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const parts = msg.content.split(/(```yaml[\s\S]*?```)/g);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? "bg-indigo-600 text-white rounded-br-sm"
          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
      }`}>
        {parts.map((part, i) => {
          if (part.startsWith("```yaml")) {
            const code = part.replace(/^```yaml\n/, "").replace(/```$/, "");
            return (
              <div key={i} className="mt-2 mb-1">
                <div className="flex items-center justify-between px-3 py-1 bg-gray-800 rounded-t-lg">
                  <span className="text-xs text-gray-400 font-mono">agent.yaml</span>
                  <span className="text-xs text-green-400 font-medium">YAML</span>
                </div>
                <pre className="bg-gray-900 text-green-300 text-xs font-mono p-3 rounded-b-lg overflow-x-auto whitespace-pre">{code}</pre>
              </div>
            );
          }
          if (!part.trim()) return null;
          return (
            <span key={i} className="whitespace-pre-wrap">{part}</span>
          );
        })}
      </div>
    </div>
  );
}

export default function AgentBuilderPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your Agent Builder. Tell me what you want your agent to do — I'll help you design it and generate the YAML.\n\nFor example: *\"I want an agent that runs every Monday morning, connects to my SSH server to check disk usage, and sends a Slack alert if any partition is above 80%\"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const currentYaml = extractLastYaml(messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
    let assistantContent = "";
    const placeholder = { role: "assistant", content: "" };

    setMessages(prev => [...prev, placeholder]);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const token = localStorage.getItem("oe_token") || sessionStorage.getItem("oe_token");
      const res = await fetch("/api/agent-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              assistantContent += data.chunk;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
            if (data.error) {
              assistantContent += `\n\n_Error: ${data.error}_`;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "_Connection error. Please try again._" };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function stopStream() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  async function copyYaml() {
    if (!currentYaml) return;
    await navigator.clipboard.writeText(currentYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function importToWorkspace() {
    if (!currentYaml) return;
    setImportMsg("Select a workspace to import into (feature coming soon — for now, copy the YAML and use the Marketplace import).");
    setTimeout(() => setImportMsg(""), 4000);
  }

  function addToMarketplace() {
    if (!currentYaml) return;
    navigate("/marketplace");
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. Tell me about the agent you'd like to build.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left panel — Chat */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50 border-r border-gray-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Agent Builder</h1>
              <p className="text-[10px] text-gray-400 leading-none">Design agents through conversation</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          >
            Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {streaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start mb-4">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <svg className="w-3.5 h-3.5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your agent or ask a question… (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={stopStream}
                className="shrink-0 w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — YAML Preview */}
      <div className="flex flex-col w-[420px] shrink-0 bg-gray-900">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-200">agent.yaml</span>
            {currentYaml && (
              <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-medium">LIVE</span>
            )}
          </div>
          {currentYaml && (
            <button
              onClick={copyYaml}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}
        </div>

        {/* YAML content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentYaml ? (
            <pre className="text-xs font-mono text-green-300 whitespace-pre leading-relaxed">{currentYaml}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600">YAML preview will appear here once the agent design includes a YAML block.</p>
              <p className="text-xs text-gray-700 mt-2">Tell the builder what agent you want to create to get started.</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {currentYaml && (
          <div className="shrink-0 p-4 border-t border-gray-700 flex flex-col gap-2">
            {importMsg && (
              <p className="text-xs text-amber-300 bg-amber-900/30 rounded-lg px-3 py-2">{importMsg}</p>
            )}
            <button
              onClick={importToWorkspace}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import to Workspace
            </button>
            <button
              onClick={addToMarketplace}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Go to Marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
