import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import SourcesPanel from "./SourcesPanel";
import ConnectorsPanel, { EnterpriseConnectorsPanel } from "./ConnectorsPanel";
import ConfirmDialog from "./ConfirmDialog";

function Spinner() {
  return <div className="w-6 h-6 border-4 border-indigo border-t-transparent rounded-full animate-spin" />;
}

function EmptyState({ message }) {
  return <div className="py-10 text-center text-gray-400 text-sm">{message}</div>;
}

function RoleBadge({ role }) {
  const styles = {
    admin:   "bg-indigo/10 text-indigo",
    manager: "bg-amber-100 text-amber-700",
    user:    "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.user}`}>
      {role}
    </span>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────

function UserCombobox({ users, onSelect }) {
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [active, setActive]     = useState(-1);
  const [selected, setSelected] = useState(null);
  const inputRef  = useRef();
  const listRef   = useRef();

  const filtered = query.trim()
    ? users.filter(u => {
        const q = query.toLowerCase();
        return (u.name || "").toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q)
          || u.role.toLowerCase().includes(q);
      }).slice(0, 50)
    : users.slice(0, 50);

  function pick(u) {
    setSelected(u);
    setQuery(u.name || u.email);
    setOpen(false);
    setActive(-1);
    onSelect(u);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    onSelect(null);
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (!open && e.key !== "Escape") { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && filtered[active]) pick(filtered[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  useEffect(() => {
    if (active >= 0 && listRef.current) {
      listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  const ROLE_COLOR = { admin: "bg-indigo/10 text-indigo", manager: "bg-amber-100 text-amber-700", user: "bg-gray-100 text-gray-500" };

  return (
    <div className="relative flex-1">
      <div className={`flex items-center input py-0 pr-1 gap-1 ${open ? "ring-2 ring-indigo/30" : ""}`}>
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="flex-1 text-sm py-1.5 bg-transparent outline-none placeholder:text-gray-400 min-w-0"
          placeholder="Search by name, email or role…"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); onSelect(null); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        {query && (
          <button onClick={clear} className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none shrink-0">&times;</button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1"
        >
          {filtered.map((u, i) => (
            <li
              key={u.id}
              onMouseDown={() => pick(u)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${i === active ? "bg-indigo/5" : "hover:bg-gray-50"}`}
            >
              <div className="w-7 h-7 rounded-full bg-indigo/10 flex items-center justify-center text-[11px] font-bold text-indigo shrink-0">
                {(u.name?.[0] || u.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.name || "—"}</p>
                <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLOR[u.role] || ROLE_COLOR.user}`}>
                {u.role}
              </span>
            </li>
          ))}
          {users.length > 50 && query.trim() === "" && (
            <li className="px-3 py-2 text-[11px] text-gray-400 text-center">Type to search all {users.length} users</li>
          )}
        </ul>
      )}
    </div>
  );
}

function MembersTab({ ws, setWs, allUsers, setError }) {
  const [selectedUser, setSelectedUser]   = useState(null);
  const [adding, setAdding]               = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving]           = useState(false);

  const memberIds  = new Set(ws.users.map(wu => wu.user.id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  async function addMember() {
    if (!selectedUser) return;
    setAdding(true);
    try {
      await api.post(`/admin/workspaces/${ws.id}/members`, { userId: selectedUser.id });
      setWs(prev => ({
        ...prev,
        users: [...prev.users, { user: selectedUser, createdAt: new Date().toISOString() }]
      }));
      setSelectedUser(null);
    } catch { setError("Failed to add member"); }
    finally { setAdding(false); }
  }

  async function doRemoveMember() {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await api.delete(`/admin/workspaces/${ws.id}/members/${confirmRemove.userId}`);
      setWs(prev => ({ ...prev, users: prev.users.filter(wu => wu.user.id !== confirmRemove.userId) }));
      setConfirmRemove(null);
    } catch { setError("Failed to remove member"); }
    finally { setRemoving(false); }
  }

  return (
    <div className="px-6 py-5 space-y-4">
      {nonMembers.length > 0 && (
        <div className="flex gap-2 items-start">
          <UserCombobox users={nonMembers} onSelect={setSelectedUser} />
          <button
            type="button"
            onClick={addMember}
            disabled={!selectedUser || adding}
            className="btn-primary px-4 py-1.5 text-sm whitespace-nowrap"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}
      {nonMembers.length === 0 && ws.users.length > 0 && (
        <p className="text-xs text-gray-400 text-center py-1">All users are already members of this workspace.</p>
      )}

      {ws.users.length === 0 ? (
        <EmptyState message="No members yet. Add users above." />
      ) : (
        <div className="space-y-1">
          {ws.users.map(wu => (
            <div
              key={wu.user.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center text-xs font-bold text-indigo shrink-0">
                  {wu.user.name?.[0]?.toUpperCase() || wu.user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{wu.user.name}</p>
                  <p className="text-xs text-gray-400">{wu.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RoleBadge role={wu.user.role} />
                <button
                  onClick={() => setConfirmRemove({ userId: wu.user.id, userEmail: wu.user.email, name: wu.user.name })}
                  className="text-xs text-red-400 hover:text-red-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove Member"
          message="Remove from this workspace?"
          detail={confirmRemove.name || confirmRemove.userEmail}
          confirmLabel="Remove"
          variant="warning"
          loading={removing}
          onConfirm={doRemoveMember}
          onCancel={() => !removing && setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

// ── Agent Sharing section (inside Chat Settings) ──────────────────────────────

export function AgentSharingSection({ ws }) {
  const [shares, setShares]       = useState([]);
  const [agents, setAgents]       = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [selAgent, setSelAgent]   = useState("");
  const [selWorkspace, setSelWorkspace] = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/workspaces/${ws.slug}/agent-shares`),
      api.get(`/workspaces/${ws.slug}/agents`),
      api.get("/admin/workspaces"),
    ]).then(([sRes, aRes, wRes]) => {
      setShares(sRes.data.shares || []);
      setAgents((aRes.data.agents || []).filter(a => a._owned !== false));
      setWorkspaces((wRes.data.workspaces || []).filter(w => w.slug !== ws.slug));
    }).catch(() => setError("Failed to load")).finally(() => setLoading(false));
  }, [ws.slug]);

  async function addShare() {
    if (!selAgent || !selWorkspace) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/workspaces/${ws.slug}/agent-shares`, {
        agentId: parseInt(selAgent),
        grantedWorkspaceId: parseInt(selWorkspace),
      });
      setShares(s => [...s, data.share]);
      setShowAdd(false); setSelAgent(""); setSelWorkspace("");
    } catch (e) { setError(e.response?.data?.error || "Failed to share"); }
    finally { setSaving(false); }
  }

  async function removeShare(id) {
    try {
      await api.delete(`/workspaces/${ws.slug}/agent-shares/${id}`);
      setShares(s => s.filter(x => x.id !== id));
      setConfirmRemove(null);
    } catch { setError("Failed to remove"); }
  }

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-700">Agent Sharing</label>
          <p className="text-xs text-gray-400 mt-0.5">Share agents from this workspace with other workspaces.</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="text-xs px-3 py-1.5 bg-indigo text-white rounded-lg hover:bg-indigo/90 font-medium transition-colors">
          + Add
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {showAdd && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <select value={selAgent} onChange={e => setSelAgent(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo">
            <option value="">Select agent…</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.slug ? ` (@${a.slug})` : ""}</option>)}
          </select>
          <select value={selWorkspace} onChange={e => setSelWorkspace(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo">
            <option value="">Select workspace…</option>
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={addShare} disabled={!selAgent || !selWorkspace || saving}
              className="text-xs px-3 py-1.5 bg-indigo text-white rounded-lg hover:bg-indigo/90 disabled:opacity-40 font-medium">
              {saving ? "Sharing…" : "Share"}
            </button>
            <button onClick={() => { setShowAdd(false); setSelAgent(""); setSelWorkspace(""); }}
              className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {shares.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400 text-center py-2">No agents shared yet.</p>
      )}

      {shares.length > 0 && (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {shares.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{s.agent.name}</p>
                <p className="text-[10px] text-gray-400">→ {s.grantedWorkspace.name}</p>
              </div>
              {s.agent.slug && <span className="text-[9px] font-mono text-indigo bg-indigo/8 px-1.5 py-0.5 rounded-md shrink-0">@{s.agent.slug}</span>}
              <button onClick={() => setConfirmRemove(s)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove Agent Share"
          message="Stop sharing this agent?"
          detail={`${confirmRemove.agent?.name}${confirmRemove.grantedWorkspace ? ` → ${confirmRemove.grantedWorkspace.name}` : ""}`}
          confirmLabel="Remove"
          variant="warning"
          onConfirm={() => removeShare(confirmRemove.id)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

// ── Chat Settings tab ─────────────────────────────────────────────────────────

function ChatSettingsTab({ ws, setWs, setError, onUpdated }) {
  const DEFAULT_SYSTEM_PROMPT =
`You are a knowledgeable assistant for this workspace. Follow these rules strictly:

- Answer questions ONLY based on the documents provided in the context below.
- Do NOT use any general knowledge or outside information.
- Provide thorough, complete, and well-structured answers.
- Include all relevant details, steps, lists, or explanations present in the source documents.
- Do not truncate or summarise unnecessarily.
- If a process has multiple steps, list every step in full.
- Use bullet points or numbered lists when the answer contains multiple items or steps.`;

  const [systemPrompt, setSystemPrompt] = useState(ws.systemPrompt || DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature]             = useState(ws.temperature ?? 0.7);
  const [chatHistory, setChatHistory]             = useState(ws.chatHistory ?? 20);
  const [queryRefusalResponse, setQueryRefusalResponse] = useState(ws.queryRefusalResponse || "");
  const [prompts, setPrompts]       = useState(() => { try { return JSON.parse(ws.starterPrompts || "[]"); } catch { return []; } });
  const [promptInput, setPromptInput] = useState("");
  const [embedEnabled, setEmbedEnabled] = useState(ws.embedEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  function addPrompt() {
    const text = promptInput.trim();
    if (!text || prompts.includes(text)) return;
    setPrompts(p => [...p, text]);
    setPromptInput("");
  }

  async function handleSave(e) {
    e.preventDefault();
    const pending = promptInput.trim();
    const finalPrompts = pending && !prompts.includes(pending)
      ? [...prompts, pending]
      : prompts;
    if (pending) { setPrompts(finalPrompts); setPromptInput(""); }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/workspaces/${ws.id}`, {
        systemPrompt,
        temperature,
        chatHistory,
        queryRefusalResponse,
        starterPrompts: finalPrompts,
        embedEnabled,
      });
      setWs(prev => ({ ...prev, ...data.workspace }));
      onUpdated?.(data.workspace);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to save settings"); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSave} className="px-6 py-5 space-y-5">

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt <span className="text-xs font-normal text-gray-400">(Workspace Guardrails)</span></label>
        <p className="text-xs text-gray-400 mb-2">
          Defines how the AI responds in this workspace. Leave blank to use the default RAG prompt.
        </p>
        <textarea
          className="input resize-none text-sm"
          rows={6}
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          placeholder=""
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">LLM Temperature</label>
        <p className="text-xs text-gray-400 mb-3">
          Controls response creativity. 0 = focused &amp; deterministic · 1 = creative &amp; varied. Default: 0.7.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={1} step={0.1}
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            className="flex-1 accent-indigo h-1.5 rounded-full cursor-pointer"
          />
          <span className="text-sm font-mono font-bold text-indigo w-8 text-right shrink-0">
            {Number(temperature).toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>Focused</span><span>Balanced</span><span>Creative</span>
        </div>
      </div>

      {/* Chat History */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Chat History</label>
        <p className="text-xs text-gray-400 mb-2">
          Number of previous message pairs included as context. Higher = more tokens used. Range: 1–45. Default: 20.
        </p>
        <input
          className="input"
          type="number" min={1} max={45} step={1}
          value={chatHistory}
          onChange={e => setChatHistory(parseInt(e.target.value) || 1)}
        />
      </div>

      {/* Query Refusal Response */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Query Refusal Response</label>
        <p className="text-xs text-gray-400 mb-2">
          Message returned when no relevant context is found in this workspace's documents for a query.
        </p>
        <textarea
          className="input resize-none text-sm"
          rows={2}
          value={queryRefusalResponse}
          onChange={e => setQueryRefusalResponse(e.target.value)}
          placeholder="There is no relevant information in this workspace to answer your query."
        />
      </div>

      {/* Starter Prompts */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Starter Prompts</label>
        <p className="text-xs text-gray-400 mb-2">
          Example questions shown to users on an empty chat. Click to send instantly.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="input flex-1 text-sm"
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPrompt(); } }}
            placeholder="e.g. What is our refund policy?"
          />
          <button type="button" onClick={addPrompt} className="btn-secondary px-3 py-1.5 text-sm whitespace-nowrap">
            Add
          </button>
        </div>
        {prompts.length > 0 && (
          <div className="space-y-1.5">
            {prompts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-gray-700 leading-snug">{p}</span>
                <button
                  type="button"
                  onClick={() => setPrompts(ps => ps.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public Embed Access */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3.5 bg-gray-50">
        <div>
          <p className="text-sm font-medium text-slate-700">Public Embed Access</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Allow this workspace to be embedded on external websites without login. Visible in Developer → Embed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEmbedEnabled(v => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            embedEnabled ? "bg-indigo" : "bg-gray-300"
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            embedEnabled ? "translate-x-5" : "translate-x-0"
          }`} />
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
        <button type="submit" className="btn-primary px-5 py-2" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Knowledge Base tab (Documents / Databases / Integrations / Ingestion Logs) ─

// ── Agents tab ────────────────────────────────────────────────────────────────

function AgentsTab({ ws, setWs, setError, onUpdated, agentSharingEnabled = false }) {
  const [maxRounds, setMaxRounds]         = useState(ws.defaultAgentMaxRounds ?? 25);
  const [maxChainDepth, setMaxChainDepth] = useState(ws.maxChainDepth ?? 5);
  const [memoryEnabled, setMemoryEnabled] = useState(ws.agentMemoryEnabled ?? false);
  const [memoryRuns, setMemoryRuns]       = useState(ws.agentMemoryRuns ?? 5);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/workspaces/${ws.id}`, { defaultAgentMaxRounds: Math.min(100, Math.max(1, parseInt(maxRounds) || 25)), maxChainDepth: Math.min(100, Math.max(1, parseInt(maxChainDepth) || 5)), agentMemoryEnabled: memoryEnabled, agentMemoryRuns: memoryRuns });
      setWs(prev => ({ ...prev, ...data.workspace }));
      onUpdated?.(data.workspace);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }


  return (
    <form onSubmit={handleSave} className="px-6 py-5 space-y-6">
      {/* Max Rounds */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Default Agent Max Rounds</label>
        <p className="text-xs text-gray-400 mb-2">
          Maximum number of tool calls an agent can make per run in this workspace.
          Each SSH command, API call, or email counts as one round.
          Simple agents need 5–10; agents with many steps (e.g. 20 SSH checks) need 25–40.
        </p>
        <input
          className="input"
          type="number" min={1} max={100} step={1}
          value={maxRounds}
          onChange={e => { const v = parseInt(e.target.value); setMaxRounds(isNaN(v) ? "" : v); }}
          onBlur={e => { const v = parseInt(e.target.value); setMaxRounds(Math.min(100, Math.max(1, isNaN(v) ? 25 : v))); }}
        />
        <p className="text-[10px] text-gray-400 mt-1">Range: 1–100. Default: 25.</p>
      </div>

      {/* Max Chain Depth */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Max Agent Chain Depth</label>
        <p className="text-xs text-gray-400 mb-2">
          How many agents can be linked in a single chain. e.g. Monitor → Remediation → Notification = 3.
        </p>
        <input
          className="input"
          type="number" min={1} max={100} step={1}
          value={maxChainDepth}
          onChange={e => { const v = parseInt(e.target.value); setMaxChainDepth(isNaN(v) ? "" : v); }}
          onBlur={e => { const v = parseInt(e.target.value); setMaxChainDepth(Math.min(100, Math.max(1, isNaN(v) ? 5 : v))); }}
        />
        <p className="text-[10px] text-gray-400 mt-1">Range: 1–100. Default: 5.</p>
      </div>

      {/* Agent Memory */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700">Agent Memory</label>
          <button
            type="button"
            onClick={() => setMemoryEnabled(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${memoryEnabled ? "bg-indigo" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${memoryEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-2">
          When enabled, each agent automatically receives context from its last N runs before executing.
        </p>
        {memoryEnabled && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Runs to remember</label>
            <input
              className="input"
              type="number" min={1} max={20} step={1}
              value={memoryRuns}
              onChange={e => setMemoryRuns(parseInt(e.target.value) || 5)}
            />
            <p className="text-[10px] text-gray-400 mt-1">Default: 5. Max: 20.</p>
          </div>
        )}
      </div>

      {/* Agent Sharing */}
      {agentSharingEnabled && <AgentSharingSection ws={ws} />}

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
        <button type="submit" className="btn-primary px-5 py-2" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}



function VectorDBTab({ ws, setWs, setError, isAdmin, onInsertMention, chatOnly = false }) {
  const [subTab, setSubTab]                 = useState("documents");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleIngestionStarted() {
    setRefreshTrigger(t => t + 1);
    setTimeout(() => setSubTab("ingestion-logs"), 0);
  }

  const SUB_TABS = [
    { id: "documents",      label: "Documents" },
    ...(!chatOnly ? [
      { id: "databases",    label: "Databases" },
      { id: "integrations", label: "Connectors" },
    ] : []),
    { id: "ingestion-logs", label: "Ingestion Logs" },

  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-100 px-6 shrink-0 bg-gray-50/50">
        {SUB_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              subTab === id
                ? "border-indigo text-indigo"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {subTab === "documents" && (
          <>
            <ConnectorsPanel
              workspaceSlug={ws.slug}
              onDocumentAdded={handleIngestionStarted}
              refreshTrigger={refreshTrigger}
            />
            <SourcesPanel
              workspaceSlug={ws.slug}
              workspaceId={ws?.id}
              sharingOnly={true}
            />
          </>
        )}

        {subTab === "databases" && (
          <EnterpriseConnectorsPanel
            workspaceId={ws?.id}
            workspaceSlug={ws?.slug}
            onIngestionStarted={handleIngestionStarted}
            onInsertMention={onInsertMention}
            section="databases"
          />
        )}

        {subTab === "integrations" && (
          <EnterpriseConnectorsPanel
            workspaceId={ws?.id}
            workspaceSlug={ws?.slug}
            onIngestionStarted={handleIngestionStarted}
            onInsertMention={onInsertMention}
            section="integrations"
          />
        )}

        {subTab === "ingestion-logs" && (
          <SourcesPanel
            workspaceSlug={ws.slug}
            workspaceId={ws?.id}
            refreshTrigger={refreshTrigger}
            onDocumentDeleted={() => setRefreshTrigger(t => t + 1)}
            hideSharing={true}
          />
        )}

      </div>
    </div>
  );
}

// ── Agents placeholder ────────────────────────────────────────────────────────

const AGENT_SKILLS = [
  {
    name: "RAG Document Search",
    description: "Search and retrieve context from this workspace's knowledge base during a conversation.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: "View & Summarize Documents",
    description: "Read and summarize documents already uploaded to this workspace on demand.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    name: "Scrape Website",
    description: "Visit a URL and extract its content for use in the current conversation.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
  },
  {
    name: "Web Search",
    description: "Search the internet in real time and include live results in responses.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
      </svg>
    ),
  },
  {
    name: "SQL Connector",
    description: "Connect to a database and let the AI query it using natural language.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
      </svg>
    ),
  },
  {
    name: "File System",
    description: "Read and write files on the server's file system during a session.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L11 7h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    name: "Code Interpreter",
    description: "Write and execute code snippets in a sandboxed environment to answer technical questions.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    name: "Chart & Visualisation",
    description: "Generate charts and graphs from data in your documents or database queries.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function AgentsPanel({ workspaceId }) {
  const [agents, setAgents]           = useState([]);
  const [connectors, setConnectors]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editAgent, setEditAgent]     = useState(null);
  const [form, setForm]               = useState({ name: "", systemPrompt: "", connectorIds: [], triggerType: "manual", cronExpression: "", enabled: true });
  const [saving, setSaving]           = useState(false);
  const [running, setRunning]         = useState(null);
  const [runInput, setRunInput]       = useState("");
  const [runOutput, setRunOutput]     = useState({});
  const [runHistory, setRunHistory]   = useState({});
  const [showHistory, setShowHistory] = useState(null);
  const [confirmDel, setConfirmDel]   = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      api.get(`/admin/workspaces/${workspaceId}/agents`),
      api.get(`/admin/workspaces/${workspaceId}/connectors`),
    ]).then(([ar, cr]) => {
      setAgents(ar.data.agents || []);
      setConnectors((cr.data.connectors || []).filter(c => c.status === "active"));
    }).catch(() => setError("Failed to load agents"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  function openCreate() {
    setEditAgent(null);
    setForm({ name: "", systemPrompt: "", connectorIds: [], triggerType: "manual", cronExpression: "", enabled: true });
    setShowForm(true);
  }

  function openEdit(agent) {
    setEditAgent(agent);
    setForm({
      name:           agent.name,
      systemPrompt:   agent.systemPrompt || "",
      connectorIds:   JSON.parse(agent.connectorIds || "[]"),
      triggerType:    agent.triggerType || "manual",
      cronExpression: agent.cronExpression || "",
      enabled:        agent.enabled !== false,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editAgent) {
        const { data } = await api.put(`/admin/workspaces/${workspaceId}/agents/${editAgent.id}`, form);
        setAgents(a => a.map(x => x.id === editAgent.id ? { ...x, ...data.agent } : x));
      } else {
        const { data } = await api.post(`/admin/workspaces/${workspaceId}/agents`, form);
        setAgents(a => [data.agent, ...a]);
      }
      setShowForm(false);
    } catch (e) { setError(e.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/workspaces/${workspaceId}/agents/${id}`);
      setAgents(a => a.filter(x => x.id !== id));
    } catch { setError("Failed to delete agent"); }
    setConfirmDel(null);
  }

  async function handleRun(agent) {
    setRunning(agent.id);
    setRunOutput(o => ({ ...o, [agent.id]: "" }));
    try {
      const token = localStorage.getItem("oe_token");
      const res = await fetch(
        `/api/admin/workspaces/${workspaceId}/agents/${agent.id}/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ input: runInput }),
        }
      );
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.done)  { setRunOutput(o => ({ ...o, [agent.id]: evt.output || "" })); setAgents(a => a.map(x => x.id === agent.id ? { ...x, runs: [{ status: "success", startedAt: new Date() }] } : x)); }
            if (evt.error) { setRunOutput(o => ({ ...o, [agent.id]: `Error: ${evt.error}` })); }
          } catch { /* */ }
        }
      }
    } catch (e) { setRunOutput(o => ({ ...o, [agent.id]: `Error: ${e.message}` })); }
    finally { setRunning(null); setRunInput(""); }
  }

  async function loadHistory(agentId) {
    try {
      const { data } = await api.get(`/admin/workspaces/${workspaceId}/agents/${agentId}/runs`);
      setRunHistory(h => ({ ...h, [agentId]: data.runs || [] }));
      setShowHistory(agentId);
    } catch { setError("Failed to load history"); }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Spinner /></div>;

  return (
    <div className="px-4 pt-3 pb-6 space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 flex items-center justify-between">
          {error} <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Saved agents run tasks using your connected data sources and integrations.</p>
        <button onClick={openCreate} className="text-[10px] font-semibold text-indigo hover:underline shrink-0 ml-2">+ New Agent</button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="border border-indigo/30 rounded-xl p-3 space-y-2.5 bg-indigo/5">
          <p className="text-xs font-semibold text-gray-700">{editAgent ? "Edit Agent" : "New Agent"}</p>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Name *</label>
            <input className="input text-xs py-1.5 w-full" placeholder="e.g. Daily Email Summary"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Instructions (System Prompt)</label>
            <textarea rows={3} className="input text-xs py-1.5 w-full resize-none"
              placeholder="e.g. You are an assistant that checks my inbox and sends a daily summary email to my manager."
              value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))} />
          </div>
          {connectors.length > 0 && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Connectors</label>
              <div className="space-y-1">
                {connectors.map(c => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={form.connectorIds.includes(c.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        connectorIds: e.target.checked ? [...f.connectorIds, c.id] : f.connectorIds.filter(id => id !== c.id)
                      }))} />
                    <span className="text-[10px] text-gray-700">
                      {c.name} <span className="text-gray-400">({c.type})</span>
                      {c.slug && <span className="ml-1.5 font-mono text-indigo">@{c.slug}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Trigger */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Trigger</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {["manual", "scheduled"].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, triggerType: t }))}
                  className={`flex-1 py-1.5 text-[10px] font-semibold capitalize transition-colors ${form.triggerType === t ? "bg-indigo text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {t === "manual" ? "Manual" : "Scheduled"}
                </button>
              ))}
            </div>
          </div>

          {form.triggerType === "scheduled" && (
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Schedule</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Every hour",     cron: "0 * * * *"   },
                    { label: "Every day 9am",  cron: "0 9 * * *"   },
                    { label: "Every day 6pm",  cron: "0 18 * * *"  },
                    { label: "Every Mon 9am",  cron: "0 9 * * 1"   },
                    { label: "Every 6 hours",  cron: "0 */6 * * *" },
                    { label: "Custom cron…",   cron: "__custom__"  },
                  ].map(({ label, cron }) => (
                    <button key={cron} type="button"
                      onClick={() => setForm(f => ({ ...f, cronExpression: cron === "__custom__" ? "" : cron }))}
                      className={`text-[10px] px-2 py-1.5 rounded-lg border text-left transition-colors ${
                        form.cronExpression === cron || (cron === "__custom__" && !["0 * * * *","0 9 * * *","0 18 * * *","0 9 * * 1","0 */6 * * *"].includes(form.cronExpression))
                          ? "border-indigo bg-indigo/10 text-indigo font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Cron expression</label>
                <input className="input text-xs py-1.5 w-full font-mono"
                  placeholder="0 9 * * *"
                  value={form.cronExpression}
                  onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))} />
                <p className="text-[10px] text-gray-400 mt-0.5">Runs in server local time. <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-indigo underline">crontab.guru →</a></p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-700">{form.enabled ? "Active" : "Paused"}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${form.enabled ? "bg-indigo" : "bg-gray-200"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${form.enabled ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-1.5 text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim() || (form.triggerType === "scheduled" && !form.cronExpression.trim())}
              className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-50">
              {saving ? "Saving…" : "Save Agent"}
            </button>
          </div>
        </div>
      )}

      {/* Agent list */}
      {agents.length === 0 && !showForm && (
        <div className="text-center py-10 text-xs text-gray-400">No agents yet. Click + New Agent to create one.</div>
      )}

      <div className="space-y-4">
      {["scheduled", "manual"].map(section => {
        const sectionAgents = agents.filter(a => (a.triggerType || "manual") === section);
        if (!sectionAgents.length) return null;
        return (
          <div key={section} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-600">
                {section === "scheduled" ? "⏱ Scheduled" : "▶ Manual"}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400">{sectionAgents.length}</span>
            </div>
            {sectionAgents.map(agent => {
        const lastRun  = agent.runs?.[0];
        const output   = runOutput[agent.id];
        const isRunning = running === agent.id;

        return (
          <div key={agent.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Agent header */}
            <div className="flex items-start gap-3 px-3 py-2.5 bg-gray-50/60">
              <div className="w-7 h-7 rounded-lg bg-indigo flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[9px] font-bold">{agent.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{agent.name}</p>
                {agent.triggerType === "scheduled" && (
                  <p className="text-[10px] text-indigo mt-0.5">
                    ⏱ {agent.cronExpression} {!agent.enabled && <span className="text-gray-400">(paused)</span>}
                  </p>
                )}
                {lastRun && (
                  <p className={`text-[10px] mt-0.5 ${lastRun.status === "success" ? "text-green-600" : lastRun.status === "error" ? "text-red-500" : "text-gray-400"}`}>
                    Last run: {lastRun.status} · {new Date(lastRun.startedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(agent)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">Edit</button>
                <button onClick={() => setConfirmDel(agent)} className="text-[10px] text-red-400 hover:text-red-600 px-1">Delete</button>
              </div>
            </div>

            {/* Run section — manual only */}
            <div className={`px-3 py-2 border-t border-gray-100 bg-white space-y-2 ${agent.triggerType === "scheduled" ? "hidden" : ""}`}>
              <textarea rows={2} className="input text-xs py-1.5 w-full resize-none"
                placeholder="Optional input / instructions for this run…"
                value={isRunning ? runInput : (runInput || "")}
                onChange={e => setRunInput(e.target.value)} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRun(agent)}
                  disabled={isRunning}
                  className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50 flex items-center gap-1.5">
                  {isRunning ? <><Spinner /><span>Running…</span></> : "▶ Run"}
                </button>
                <button onClick={() => loadHistory(agent.id)} className="text-[10px] text-gray-400 hover:text-gray-600">History</button>
              </div>

              {/* Output */}
              {output !== undefined && output !== "" && (
                <div className={`text-[11px] rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed ${output.startsWith("Error:") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"}`}>
                  {output}
                </div>
              )}
            </div>

            {/* Scheduled agent — history link */}
            {agent.triggerType === "scheduled" && (
              <div className="px-3 py-1.5 border-t border-gray-100 bg-white">
                <button onClick={() => loadHistory(agent.id)} className="text-[10px] text-gray-400 hover:text-gray-600">View run history</button>
              </div>
            )}

            {/* Run history */}
            {showHistory === agent.id && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-500">Run History</p>
                  <button onClick={() => setShowHistory(null)} className="text-[10px] text-gray-400">Close</button>
                </div>
                {(runHistory[agent.id] || []).length === 0
                  ? <p className="text-[10px] text-gray-400">No runs yet.</p>
                  : (runHistory[agent.id] || []).map(run => (
                    <div key={run.id} className="py-1.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${run.status === "success" ? "text-green-600" : run.status === "error" ? "text-red-500" : "text-gray-400"}`}>
                          {run.status}
                        </span>
                        <span className="text-[10px] text-gray-400">{new Date(run.startedAt).toLocaleString()}</span>
                      </div>
                      {run.input  && <p className="text-[10px] text-gray-500 mt-0.5">Input: {run.input}</p>}
                      {run.output && <p className="text-[10px] text-gray-600 mt-0.5 whitespace-pre-wrap">{run.output.slice(0, 300)}{run.output.length > 300 ? "…" : ""}</p>}
                      {run.error  && <p className="text-[10px] text-red-500 mt-0.5">{run.error}</p>}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        );
      })}
          </div>
        );
      })}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Delete Agent"
          message="Delete this agent and all its run history?"
          detail={confirmDel.name}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

// mode: "chat" = Knowledge Base + Chat Settings (default, used inside WorkspaceChat)
//       "connectors" = Databases + Connectors as main tabs (opened from workspace card)
//       "agents"     = Agents settings only (opened from workspace card)
export default function WorkspaceDrawer({ workspaceId, mode = "chat", initialTab, isAdmin = false, onClose, onDeleted, onUpdated, onInsertMention }) {
  const defaultTab = initialTab ?? (mode === "connectors" ? "databases" : mode === "agents" ? "agents" : "sources");

  const [ws, setWs]             = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState(defaultTab);
  const [error, setError]       = useState("");
  const [features, setFeatures] = useState({ kbSharing: false, agentSharing: false });

  useEffect(() => {
    Promise.all([
      api.get(`/admin/workspaces/${workspaceId}`),
      api.get("/admin/users"),
      api.get("/features"),
    ])
      .then(([wsRes, usersRes, featRes]) => {
        setWs(wsRes.data.workspace);
        setAllUsers(usersRes.data.users || []);
        setFeatures(featRes.data);
      })
      .catch(() => setError("Failed to load workspace"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const TABS =
    mode === "connectors" ? [["databases", "Databases"], ["integrations", "Connectors"]] :
    mode === "agents"     ? [["agents", "Agents"]] :
    /* chat */              [["sources", "Knowledge Base"], ["chat", "Chat Settings"], ["members", "Members"]];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-[520px] bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Spinner /></div>
        ) : !ws ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-500 text-sm">{error || "Workspace not found"}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">{ws.name}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{ws.slug}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 shrink-0 overflow-x-auto">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    tab === id
                      ? "border-indigo text-indigo"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 shrink-0">
                {error}
                <button onClick={() => setError("")} className="ml-2 font-bold">&times;</button>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* chat mode */}
              {tab === "sources" && (
                <VectorDBTab ws={ws} setWs={setWs} setError={setError} isAdmin={isAdmin} onInsertMention={onInsertMention} chatOnly />
              )}
              {tab === "chat" && (
                <ChatSettingsTab ws={ws} setWs={setWs} setError={setError} onUpdated={onUpdated} />
              )}
              {tab === "members" && (
                <MembersTab ws={ws} setWs={setWs} allUsers={allUsers} setError={setError} />
              )}
              {/* connectors mode — render EnterpriseConnectorsPanel directly as top-level tabs */}
              {tab === "databases" && (
                <EnterpriseConnectorsPanel workspaceId={ws?.id} workspaceSlug={ws?.slug} onIngestionStarted={() => {}} onDocumentAdded={() => {}} section="databases" refreshTrigger={0} />
              )}
              {tab === "integrations" && (
                <EnterpriseConnectorsPanel workspaceId={ws?.id} workspaceSlug={ws?.slug} onIngestionStarted={() => {}} onDocumentAdded={() => {}} section="integrations" refreshTrigger={0} />
              )}
              {/* agents mode */}
              {tab === "agents" && (
                <AgentsTab ws={ws} setWs={setWs} setError={setError} onUpdated={onUpdated} agentSharingEnabled={features.agentSharing} />
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
