import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Spinner } from "../../components/ui";

function WorkspaceSidebar({ slug, workspace, navigate }) {
  return (
    <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-3 py-3 border-b border-gray-200">
        <button onClick={() => navigate("/workspaces")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-medium">Workspaces</span>
        </button>
      </div>
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <p className="flex-1 text-sm font-semibold text-gray-900 truncate min-w-0">{workspace?.name || "…"}</p>
        </div>
      </div>
      <div className="flex-1" />
      <div className="shrink-0 border-t border-gray-200 px-3 py-3 space-y-0.5">
        <button onClick={() => navigate(`/workspace/${slug}`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          Chat
        </button>
        <button onClick={() => navigate(`/workspace/${slug}/connectors`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          Connectors
        </button>
        <button onClick={() => navigate(`/workspace/${slug}/agents`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Agents
        </button>
      </div>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const [workspace, setWorkspace]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [error, setError]                 = useState("");

  // Agent settings
  const [maxRounds, setMaxRounds]         = useState(25);
  const [maxChainDepth, setMaxChainDepth] = useState(5);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memoryRuns, setMemoryRuns]       = useState(5);

  useEffect(() => {
    if (!slug) return;
    api.get(`/workspaces/${slug}`).then(r => {
      const ws = r.data.workspace;
      setWorkspace(ws);
      setMaxRounds(ws.defaultAgentMaxRounds ?? 25);
      setMaxChainDepth(ws.maxChainDepth ?? 5);
      setMemoryEnabled(ws.agentMemoryEnabled ?? false);
      setMemoryRuns(ws.agentMemoryRuns ?? 5);
    }).catch(() => setError("Workspace not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/workspaces/${slug}`, {
        defaultAgentMaxRounds: maxRounds,
        maxChainDepth,
        agentMemoryEnabled: memoryEnabled,
        agentMemoryRuns: memoryRuns,
      });
      setWorkspace(data.workspace);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save");
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Spinner />
    </div>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <WorkspaceSidebar slug={slug} workspace={workspace} navigate={navigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl flex flex-col gap-6">

            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/workspace/${slug}/agents`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors">
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Settings</h2>
                <p className="text-sm text-gray-400 mt-0.5">Workspace and agent configuration</p>
              </div>
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

            <form onSubmit={handleSave} className="flex flex-col gap-6">

              {/* Agent Settings */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
                <h3 className="text-sm font-semibold text-gray-800">Agent Settings</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Agent Max Rounds</label>
                  <p className="text-xs text-gray-400 mb-2">Maximum number of tool calls an agent can make per run. Simple agents need 5–10; complex agents need 25–40.</p>
                  <input
                    className="input"
                    type="number" min={1} max={100} step={1}
                    value={maxRounds}
                    onChange={e => { const v = parseInt(e.target.value); setMaxRounds(isNaN(v) ? "" : v); }}
                    onBlur={e => { const v = parseInt(e.target.value); setMaxRounds(Math.min(100, Math.max(1, isNaN(v) ? 25 : v))); }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Range: 1–100. Default: 25.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Agent Chain Depth</label>
                  <p className="text-xs text-gray-400 mb-2">How many agents can be linked in a single chain. e.g. Monitor → Remediation → Notification = 3.</p>
                  <input
                    className="input"
                    type="number" min={1} max={100} step={1}
                    value={maxChainDepth}
                    onChange={e => { const v = parseInt(e.target.value); setMaxChainDepth(isNaN(v) ? "" : v); }}
                    onBlur={e => { const v = parseInt(e.target.value); setMaxChainDepth(Math.min(100, Math.max(1, isNaN(v) ? 5 : v))); }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Range: 1–100. Default: 5.</p>
                </div>

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
                    <div>
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
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
