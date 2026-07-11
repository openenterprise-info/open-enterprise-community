import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../utils/api";
import { agentToYaml } from "../../utils/agentToYaml";
import ConfirmDialog from "../../components/ConfirmDialog";
import AgentStudio from "../../components/AgentStudio";
import { Spinner, EmptyState } from "../../components/ui";

// ── Stat bar ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
      <div className={`w-2 h-2 rounded-full shrink-0 ${accent}`} />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-base font-bold text-gray-900">{value}</span>
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function TriggerBadge({ type, cron }) {
  const scheduled = type === "scheduled";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${scheduled ? "bg-amber-100 text-amber-700" : "bg-indigo/10 text-indigo"}`}>
      {scheduled ? (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ) : (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      )}
      {scheduled ? (cron || "Scheduled") : "Manual"}
    </span>
  );
}

function AgentCard({ agent, running, onOpen, onRun, onYaml, onDownload, onDelete }) {
  const lastRun = agent.runs?.[0];

  return (
    <div onClick={onOpen} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-sm hover:border-indigo/30 transition-all duration-150 cursor-pointer">
      {/* Body */}
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

      {/* Footer */}
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
            <p className="text-xs text-gray-400 mt-0.5">{agent.workspace?.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={copy} title="Copy YAML"
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

// ── New Agent modal ───────────────────────────────────────────────────────────

function NewAgentModal({ workspaces, onOpen, onClose }) {
  const [wsId, setWsId] = useState(workspaces[0]?.id ?? "");
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const ws = workspaces.find(w => String(w.id) === String(wsId));
    if (!ws || !name.trim()) return;
    onOpen({ ws, name: name.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-4">New Agent</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Agent Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="My Agent" className="input py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Workspace</label>
            <select value={wsId} onChange={e => setWsId(e.target.value)} className="input py-2 text-sm w-full">
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={!name.trim() || !wsId} className="btn-primary flex-1 py-2 text-sm">Open Studio</button>
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const navigate = useNavigate();

  const [agents, setAgents]             = useState([]);
  const [workspacesAll, setWorkspacesAll] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [selectedWs, setSelectedWs]     = useState("all");
  const [running, setRunning]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [yamlAgent, setYamlAgent]       = useState(null);
  const [yaml, setYaml]                 = useState("");
  const [studioAgent, setStudioAgent]   = useState(null);
  const [studioConnectors, setStudioConnectors] = useState([]);
  const [saving, setSaving]             = useState(false);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const uploadRef                       = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/agents"),
      api.get("/admin/workspaces"),
    ]).then(([agentsRes, wsRes]) => {
      setAgents(agentsRes.data.agents || []);
      setWorkspacesAll(wsRes.data.workspaces || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Derived workspace list from agents
  const workspaces = useMemo(() => {
    const map = new Map();
    agents.forEach(a => {
      if (a.workspace && !map.has(a.workspace.id)) {
        map.set(a.workspace.id, { id: a.workspace.id, name: a.workspace.name, count: 0 });
      }
      if (a.workspace) map.get(a.workspace.id).count++;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [agents]);

  const filtered = useMemo(() => {
    let list = selectedWs === "all" ? agents : agents.filter(a => String(a.workspace?.id) === selectedWs);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.workspace?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [agents, selectedWs, search]);

  // Stats
  const totalRuns = agents.reduce((s, a) => s + (a._count?.runs ?? 0), 0);
  const scheduled   = agents.filter(a => a.triggerType === "scheduled").length;
  const manual      = agents.filter(a => a.triggerType !== "scheduled").length;

  async function openNewAgentStudio({ ws, name }) {
    setShowNewAgent(false);
    const connRes = await api.get(`/workspaces/${ws.slug}/connectors`).catch(() => ({ data: { connectors: [] } }));
    setStudioConnectors(connRes.data.connectors || []);
    setStudioAgent({
      isNew: true,
      name,
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
      workspace: ws,
    });
  }

  function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const get = (key) => {
        const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
      };
      const parsed = {
        name:           get('name') || file.name.replace(/\.(yaml|yml)$/i, ''),
        description:    get('description') || '',
        triggerType:    get('triggerType') || get('trigger_type') || 'manual',
        cronExpression: get('cronExpression') || get('cron') || null,
        enabled:        get('enabled') !== 'false',
      };
      // Pick first workspace; user can change inside Studio
      const ws = workspacesAll[0];
      if (!ws) return;
      const connRes = await api.get(`/workspaces/${ws.slug}/connectors`).catch(() => ({ data: { connectors: [] } }));
      setStudioConnectors(connRes.data.connectors || []);
      setStudioAgent({
        isNew: true,
        ...parsed,
        connectorIds: "[]",
        workflow: "[]",
        params: "[]",
        chains: "[]",
        visualize: false,
        workspace: ws,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function openStudio(a) {
    try {
      const [exportRes, connRes] = await Promise.all([
        api.get(`/workspaces/${a.workspace.slug}/agents/${a.id}/export`),
        api.get(`/workspaces/${a.workspace.slug}/connectors`).catch(() => ({ data: { connectors: [] } })),
      ]);
      const full = exportRes.data;
      setStudioConnectors(connRes.data.connectors || []);
      setStudioAgent({
        ...full,
        id:             a.id,
        workspace:      a.workspace,
        workflow:       full.workflow       ? (typeof full.workflow === "string" ? full.workflow : JSON.stringify(full.steps || [])) : JSON.stringify(full.steps || []),
        connectorIds:   full.connectorIds   ? (typeof full.connectorIds === "string" ? full.connectorIds : JSON.stringify(full.connectorIds || [])) : "[]",
        params:         full.params         ? (typeof full.params === "string" ? full.params : JSON.stringify(full.params || [])) : "[]",
        chains:         full.chains         ? (typeof full.chains === "string" ? full.chains : JSON.stringify(full.chains || [])) : "[]",
      });
    } catch { /* silent */ }
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
        const { data } = await api.post(`/workspaces/${studioAgent.workspace.slug}/agents`, payload);
        setAgents(prev => [data.agent, ...prev]);
      } else {
        const { data } = await api.put(`/workspaces/${studioAgent.workspace.slug}/agents/${studioAgent.id}`, payload);
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
      const { data } = await api.get(`/workspaces/${a.workspace.slug}/agents/${a.id}/export`);
      setYaml(agentToYaml(data));
    } catch { setYaml("Failed to load YAML"); }
  }

  async function downloadYaml(a) {
    try {
      const { data } = await api.get(`/workspaces/${a.workspace.slug}/agents/${a.id}/export`);
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
      await api.post(`/workspaces/${a.workspace.slug}/agents/${a.id}/run`, { input: "" });
      navigate("/agent-runs");
    } catch {}
    setRunning(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await api.delete(`/admin/agents/${confirmDelete.id}`);
      setAgents(prev => prev.filter(x => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {}
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-5 h-full">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Studio</h2>
          <p className="text-sm text-gray-400 mt-0.5">Build, manage and run agents across your workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          {/* New Agent */}
          <button onClick={() => setShowNewAgent(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo rounded-lg hover:bg-indigo/90 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Agent
          </button>
          {/* Upload YAML */}
          <input ref={uploadRef} type="file" accept=".yaml,.yml" className="hidden" onChange={handleUploadFile} />
          <button onClick={() => uploadRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </button>
          {/* Approvals */}
          <Link to="/approvals"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Approvals
          </Link>
          {/* Run Logs */}
          <Link to="/agent-runs"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Run Logs
          </Link>
        </div>
      </div>

      {/* Stat bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatPill label="Total"      value={agents.length} accent="bg-indigo"    />
        <StatPill label="Scheduled"  value={scheduled}     accent="bg-amber-400" />
        <StatPill label="Manual"     value={manual}        accent="bg-slate-400" />
        <StatPill label="Total Runs" value={totalRuns}     accent="bg-green-400" />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 flex-1">

        {/* Search + workspace dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative w-1/2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="input pl-8 py-2 text-sm w-full"
            />
          </div>
          <select
            value={selectedWs}
            onChange={e => setSelectedWs(e.target.value)}
            className="w-1/2 input py-2 text-sm"
          >
            <option value="all">All Agents ({agents.length})</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={String(ws.id)}>{ws.name} ({ws.count})</option>
            ))}
          </select>
        </div>

          {/* Cards */}
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : agents.length === 0 ? (
            <EmptyState message="No agents found. Create agents from workspace settings." />
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
                  onYaml={openYaml}
                  onDownload={downloadYaml}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          )}
      </div>

      {/* Modals */}
      {showNewAgent && (
        <NewAgentModal workspaces={workspacesAll} onOpen={openNewAgentStudio} onClose={() => setShowNewAgent(false)} />
      )}
      {studioAgent && (
        <AgentStudio
          initialAgent={studioAgent}
          connectors={studioConnectors}
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
