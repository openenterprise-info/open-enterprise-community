import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { agentToYaml } from "../../utils/agentToYaml";
import ConfirmDialog from "../../components/ConfirmDialog";
import AgentStudio from "../../components/AgentStudio";
import { Spinner, EmptyState } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, running, onOpen, onRun, onDownload, onDelete }) {
  const lastRun = agent.runs?.[0];
  return (
    <div onClick={onOpen} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-sm hover:border-indigo/30 transition-all duration-150 cursor-pointer">
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-bold text-gray-900 leading-snug">{agent.name}</p>
          <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${lastRun?.status === "success" ? "bg-green-400" : lastRun?.status === "error" ? "bg-red-400" : "bg-gray-300"}`} />
        </div>
        {agent.slug && <p className="text-xs font-mono text-indigo mb-1.5">@{agent.slug}</p>}
        {agent.description
          ? <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{agent.description}</p>
          : <p className="text-xs text-gray-300 italic">No description</p>
        }
      </div>
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-1">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agent.triggerType === "scheduled" ? "bg-amber-50 text-amber-600" : "bg-indigo/8 text-indigo"}`}>
          {agent.triggerType === "scheduled" ? "Scheduled" : "Manual"}
        </span>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onRun(agent)} disabled={running === agent.id} title="Run"
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors">
            {running === agent.id
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button onClick={() => onDownload(agent)} title="Export YAML"
            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={() => onDelete(agent)} title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── YAML modal ────────────────────────────────────────────────────────────────

function YamlModal({ agent, yaml, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(yaml); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{agent.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              {copied ? "Copied!" : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
              )}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto">
          <pre className="bg-gray-950 text-green-400 rounded-xl p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap">{yaml}</pre>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkspaceAgentsPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [workspace, setWorkspace]       = useState(null);
  const [agents, setAgents]             = useState([]);
  const [connectors, setConnectors]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [running, setRunning]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [yamlAgent, setYamlAgent]       = useState(null);
  const [yaml, setYaml]                 = useState("");
  const [studioAgent, setStudioAgent]   = useState(null);
  const [saving, setSaving]             = useState(false);
  const uploadRef                       = useRef(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get(`/workspaces/${slug}`),
      api.get(`/workspaces/${slug}/agents`),
      api.get(`/workspaces/${slug}/connectors`).catch(() => ({ data: { connectors: [] } })),
    ]).then(([wsRes, agentsRes, connRes]) => {
      setWorkspace(wsRes.data.workspace);
      setAgents(agentsRes.data.agents || []);
      setConnectors(connRes.data.connectors || []);
    }).catch(() => setError("Workspace not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q)
    );
  }, [agents, search]);

  async function openStudio(a) {
    try {
      const { data: full } = await api.get(`/workspaces/${slug}/agents/${a.id}/export`);
      setStudioAgent({
        ...full,
        id:           a.id,
        workspace:    { id: workspace?.id, name: workspace?.name, slug },
        workflow:     full.workflow     ? (typeof full.workflow === "string" ? full.workflow : JSON.stringify(full.steps || [])) : JSON.stringify(full.steps || []),
        connectorIds: full.connectorIds ? (typeof full.connectorIds === "string" ? full.connectorIds : JSON.stringify(full.connectorIds || [])) : "[]",
        params:       full.params       ? (typeof full.params === "string" ? full.params : JSON.stringify(full.params || [])) : "[]",
        chains:       full.chains       ? (typeof full.chains === "string" ? full.chains : JSON.stringify(full.chains || [])) : "[]",
      });
    } catch { /* silent */ }
  }

  function openNewAgentStudio() {
    setStudioAgent({
      isNew: true,
      name: "",
      description: "",
      systemPrompt: "",
      connectorIds: "[]",
      workflow: "[]",
      params: "[]",
      chains: "[]",
      triggerType: "manual",
      cronExpression: null,
      enabled: true,
      visualize: false,
      workspace: { id: workspace?.id, name: workspace?.name, slug },
    });
  }

  function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const get = (key) => {
        const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
      };
      setStudioAgent({
        isNew: true,
        name:           get('name') || file.name.replace(/\.(yaml|yml)$/i, ''),
        description:    get('description') || '',
        triggerType:    get('triggerType') || get('trigger_type') || 'manual',
        cronExpression: get('cronExpression') || get('cron') || null,
        enabled:        get('enabled') !== 'false',
        connectorIds: "[]",
        workflow: "[]",
        params: "[]",
        chains: "[]",
        visualize: false,
        workspace: { id: workspace?.id, name: workspace?.name, slug },
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleStudioSave(form) {
    if (!studioAgent) return;
    setSaving(true);
    try {
      const payload = {
        name:           form.name,
        description:    form.description || null,
        systemPrompt:   form.systemPrompt || null,
        connectorIds:   form.connectorIds || [],
        triggerType:    form.triggerType,
        cronExpression: form.cronExpression || null,
        enabled:        form.enabled,
        visualize:      form.visualize || false,
        workflow:       JSON.stringify(form.steps || []),
        params:         JSON.stringify(form.params || []),
        chains:         JSON.stringify(form.chains || []),
      };
      if (studioAgent.isNew) {
        const { data } = await api.post(`/workspaces/${slug}/agents`, payload);
        setAgents(prev => [data.agent, ...prev]);
      } else {
        const { data } = await api.put(`/workspaces/${slug}/agents/${studioAgent.id}`, payload);
        setAgents(prev => prev.map(a => a.id === studioAgent.id ? { ...a, ...data.agent } : a));
      }
      setStudioAgent(null);
    } catch { /* silent */ }
    setSaving(false);
  }

  async function openYaml(a) {
    setYamlAgent(a);
    setYaml("Loading…");
    try {
      const { data } = await api.get(`/workspaces/${slug}/agents/${a.id}/export`);
      setYaml(agentToYaml(data));
    } catch { setYaml("Failed to load YAML"); }
  }

  async function downloadYaml(a) {
    try {
      const { data } = await api.get(`/workspaces/${slug}/agents/${a.id}/export`);
      const blob = new Blob([agentToYaml(data)], { type: "text/yaml" });
      const url  = URL.createObjectURL(blob);
      const el   = document.createElement("a");
      el.href    = url;
      el.download = `${a.name.toLowerCase().replace(/\s+/g, "-")}.yaml`;
      el.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleRun(a) {
    setRunning(a.id);
    try {
      await api.post(`/workspaces/${slug}/agents/${a.id}/run`, { input: "" });
    } catch {}
    setRunning(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await api.delete(`/workspaces/${slug}/agents/${confirmDelete.id}`);
      setAgents(prev => prev.filter(x => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {}
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={() => navigate("/workspaces")} className="btn-primary px-4 py-2 text-sm">Back to Workspaces</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0">

        <div className="px-3 py-3 border-b border-gray-200">
          <button
            onClick={() => navigate("/workspaces")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Workspaces</span>
          </button>
        </div>

        <div className="px-3 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="flex-1 text-sm font-semibold text-gray-900 truncate min-w-0">{workspace?.name || "…"}</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="shrink-0 border-t border-gray-200 px-3 py-3 space-y-0.5">
          <button onClick={() => navigate(`/workspace/${slug}`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          <button onClick={() => navigate(`/workspace/${slug}/connectors`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connectors
          </button>
          <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm bg-indigo/10 text-indigo font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Agents
          </button>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Agents</h2>
              <p className="text-sm text-gray-400 mt-0.5">Build, manage, and run agents in this workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openNewAgentStudio}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo rounded-lg hover:bg-indigo/90 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Agent
              </button>
              <input ref={uploadRef} type="file" accept=".yaml,.yml" className="hidden" onChange={handleUploadFile} />
              <button onClick={() => uploadRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </button>
              <button onClick={() => navigate(`/workspace/${slug}/approvals`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approvals
              </button>
              <button onClick={() => navigate(`/workspace/${slug}/run-logs`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Run Logs
              </button>
              <button onClick={() => navigate(`/workspace/${slug}/settings`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>
          </div>

          {/* Search */}
          {agents.length > 0 && (
            <div className="relative w-80">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search agents…"
                className="input pl-8 py-2 text-sm w-full"
              />
            </div>
          )}

          {/* Cards */}
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No agents yet</p>
              <p className="text-xs text-gray-400 mb-4">Create your first agent to automate tasks in this workspace</p>
              <button onClick={openNewAgentStudio} className="btn-primary px-4 py-2 text-sm">New Agent</button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No agents match your search." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(a => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  running={running}
                  onOpen={() => openStudio(a)}
                  onRun={handleRun}
                  onDownload={downloadYaml}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {studioAgent && (
        <AgentStudio
          initialAgent={studioAgent}
          connectors={connectors}
          agents={agents}
          saving={saving}
          onSave={handleStudioSave}
          onClose={() => setStudioAgent(null)}
        />
      )}
      {yamlAgent && <YamlModal agent={yamlAgent} yaml={yaml} onClose={() => setYamlAgent(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Agent" message="Delete agent" detail={confirmDelete.name}
          confirmLabel="Delete" variant="danger" loading={!!deleting}
          onConfirm={handleDelete} onCancel={() => !deleting && setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
