import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { load as yamlLoad } from "js-yaml";
import api from "../../utils/api";
import { agentToYaml } from "../../utils/agentToYaml";
import ConfirmDialog from "../../components/ConfirmDialog";
import AgentStudio from "../../components/AgentStudio";
import { Spinner, EmptyState } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { TEMPLATES } from "../../utils/agentTemplates";
import { AgentSharingSection } from "../../components/WorkspaceDrawer";

function yamlToAgentJson(y) {
  return {
    name:               y.name,
    slug:               y.slug || "",
    description:        y.description || "",
    group:              y.group || "",
    nextAgent:          y.next_agent || "",
    nextAgentCondition: y.next_agent_condition || "on_critical",
    chains:             (y.chains || []).map(c => ({ condition: c.condition || "always", nextAgent: c.next_agent || "", triggerType: c.trigger_type || "automatic" })),
    systemPrompt:       y.instructions || "",
    steps:              y.steps || [],
    triggerType:        y.trigger?.type || "manual",
    cronExpression:     y.trigger?.cron || "",
    enabled:            y.enabled !== false,
    connectors:         (y.connectors || []).map(c => ({ name: c.connection_name || c.name, type: c.connection_type || c.type, connection_id: c.connection_id || "" })),
    params:             (y.params || []).map(p => ({ name: p.name, label: p.label || "", default: p.default || "" })),
  };
}

// TEMPLATES imported from ../../utils/agentTemplates

function TemplatesPanel({ onClose, onUse }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Security", "Sales", "Marketing", "Integrations", "Analytics"];
  const filtered = TEMPLATES.filter(t => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Templates</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick a template to pre-fill the agent studio</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo/30" />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  activeCategory === c ? "bg-indigo text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No templates match your search.</p>
          ) : filtered.map(tpl => (
            <div key={tpl.name} className="border border-gray-200 rounded-xl p-4 hover:border-indigo/40 hover:bg-indigo/[0.02] transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tpl.color}`}>{tpl.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{tpl.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{tpl.description}</p>
                </div>
                <button onClick={() => onUse(tpl)}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-indigo border border-indigo/30 rounded-lg hover:bg-indigo hover:text-white transition-colors">
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function ApiModal({ agent, workspaceSlug: wsSlugProp, onClose, navigate }) {
  const [tab, setTab]       = useState("curl");
  const [copied, setCopied] = useState(false);
  const baseUrl    = window.location.origin;
  const wsSlug     = wsSlugProp || window.location.pathname.match(/\/workspace\/([^/]+)/)?.[1] || "";
  const endpoint   = `/api/v1/workspaces/${wsSlug}/agents/${agent.slug}/run`;
  const fullUrl    = `${baseUrl}${endpoint}`;

  const snippets = {
    curl: `curl -X POST '${fullUrl}' \\
  -H 'Authorization: Bearer emb_your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{"input": "Run"}'`,

    js: `const res = await fetch('${fullUrl}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer emb_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: 'Run' }),
});

// Response is a Server-Sent Events stream
const reader = res.body.getReader();
const decoder = new TextDecoder();
let output = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  for (const line of decoder.decode(value).split('\\n')) {
    if (!line.startsWith('data: ')) continue;
    const evt = JSON.parse(line.slice(6));
    if (evt.done)        output = evt.output;
    if (evt.tool_calls)  console.log('Tools used:', evt.tool_calls);
    if (evt.error)       console.error('Error:', evt.error);
  }
}
console.log('Output:', output);`,

    python: `import requests, json

url = '${fullUrl}'
headers = {
    'Authorization': 'Bearer emb_your_api_key_here',
    'Content-Type': 'application/json',
}

with requests.post(url, headers=headers,
                   json={'input': 'Run'},
                   stream=True) as r:
    output = ''
    for line in r.iter_lines():
        if not line.startswith(b'data: '):
            continue
        evt = json.loads(line[6:])
        if evt.get('done'):
            output = evt.get('output', '')
        elif evt.get('tool_calls'):
            print('Tools used:', evt['tool_calls'])
        elif evt.get('error'):
            print('Error:', evt['error'])
    print('Output:', output)`,

    response: `// Tool-use progress event (0 or more)
data: {"tool_calls": ["web_search", "read_file"]}

// Completion event
data: {"done": true, "output": "Agent final output text here...", "runId": 42, "pendingApprovals": 0}

// pendingApprovals > 0 means a chained agent is waiting for
// human approval in the workspace Approvals screen before it runs.

// Error event (if something went wrong)
data: {"error": "Descriptive error message"}`,
  };

  const TABS = [
    { id: "curl",     label: "cURL"       },
    { id: "js",       label: "JavaScript" },
    { id: "python",   label: "Python"     },
    { id: "response", label: "Response"   },
  ];

  function copy() {
    navigator.clipboard.writeText(snippets[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[88vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">API — {agent.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Run this agent programmatically using your API key</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-auto space-y-4">

          {/* Endpoint pill */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Endpoint</p>
            <div className="flex items-center gap-2.5 bg-gray-950 rounded-lg px-4 py-2.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-green-400 shrink-0 tracking-wide">POST</span>
              <span className="text-xs font-mono text-gray-300 whitespace-nowrap">{endpoint}</span>
            </div>
          </div>

          {/* Auth note */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            <p className="text-xs text-amber-700 leading-relaxed">
              Generate an API key in{" "}
              <button
                onClick={() => { onClose(); navigate("/developer"); }}
                className="font-semibold underline underline-offset-2 decoration-amber-600 hover:text-amber-900 transition-colors"
              >
                Developer → APIs → API Keys
              </button>
              , then replace{" "}
              <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono">emb_your_api_key_here</code>{" "}
              in the examples below.
            </p>
          </div>

          {/* Code tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? (
                  <><svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Copied</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
                )}
              </button>
            </div>
            <pre className="bg-gray-950 text-green-400 rounded-xl p-5 text-xs font-mono leading-relaxed whitespace-pre overflow-x-auto">{snippets[tab]}</pre>
          </div>

        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, running, onOpen, onRun, onStop, onApi, onDownload, onDelete }) {
  const lastRun   = agent.runs?.[0];
  const isRunning = !!running[agent.id];
  const dotColor  = isRunning                        ? "bg-amber-400 animate-pulse"
                  : lastRun?.status === "success"    ? "bg-green-400"
                  : lastRun?.status === "error"      ? "bg-red-400"
                  : lastRun?.status === "cancelled"  ? "bg-gray-400"
                  : lastRun?.status === "rejected"   ? "bg-orange-400"
                  : "bg-gray-300";

  return (
    <div onClick={onOpen} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-sm hover:border-indigo/30 transition-all duration-150 cursor-pointer">
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-bold text-gray-900 leading-snug">{agent.name}</p>
          <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotColor}`} />
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
          <button
            onClick={() => isRunning ? onStop(agent.id) : onRun(agent)}
            title={isRunning ? "Stop" : "Run"}
            className={`p-2 rounded-lg text-white transition-colors ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isRunning ? (
              <div className="relative w-4 h-4">
                <svg className="absolute inset-0 w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <svg className="absolute inset-0 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="8" y="8" width="8" height="8" rx="1"/>
                </svg>
              </div>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button onClick={() => onApi(agent)} title="API / Embed"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo hover:bg-indigo/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
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
  const [running, setRunning]           = useState({}); // { [agentId]: runId }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [yamlAgent, setYamlAgent]       = useState(null);
  const [yaml, setYaml]                 = useState("");
  const [apiAgent, setApiAgent]         = useState(null);
  const [studioAgent, setStudioAgent]   = useState(null);
  const [saving, setSaving]             = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importWarning, setImportWarning] = useState("");
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [agentSharingEnabled, setAgentSharingEnabled] = useState(false);
  const uploadRef                       = useRef(null);

  useEffect(() => {
    if (!slug) return;
    const fetchPending = () =>
      api.get(`/workspaces/${slug}/chain-approvals`)
        .then(r => setPendingApprovals((r.data.approvals || []).filter(a => a.status === "pending").length))
        .catch(() => {});
    fetchPending();
    const id = setInterval(fetchPending, 5000);
    return () => clearInterval(id);
  }, [slug]);

  useEffect(() => {
    api.get("/features").then(r => setAgentSharingEnabled(r.data.agentSharing !== false)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get(`/workspaces/${slug}`),
      api.get(`/workspaces/${slug}/agents`),
      api.get(`/workspaces/${slug}/connectors`).catch(() => ({ data: { connectors: [] } })),
    ]).then(([wsRes, agentsRes, connRes]) => {
      const agentsList = agentsRes.data.agents || [];
      setWorkspace(wsRes.data.workspace);
      setAgents(agentsList);
      setConnectors(connRes.data.connectors || []);
      const restoredRunning = {};
      agentsList.forEach(a => { if (a.runs?.[0]?.status === "running") restoredRunning[a.id] = a.runs[0].id; });
      if (Object.keys(restoredRunning).length) setRunning(restoredRunning);
    }).catch(() => setError("Workspace not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const poll = () =>
      api.get(`/workspaces/${slug}/agents`)
        .then(r => {
          const agentsList = r.data.agents || [];
          setAgents(agentsList);
          setRunning(prev => {
            const next = { ...prev };
            agentsList.forEach(a => {
              const latest = a.runs?.[0];
              if (next[a.id] && latest?.status !== "running") delete next[a.id];
              if (!next[a.id] && latest?.status === "running") next[a.id] = latest.id;
            });
            return next;
          });
        })
        .catch(() => {});
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
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

  function openFromTemplate(tpl) {
    setShowTemplates(false);
    setStudioAgent({
      isNew:          true,
      name:           tpl.name,
      slug:           tpl.slug || "",
      description:    tpl.description,
      systemPrompt:   tpl.systemPrompt,
      connectorIds:   "[]",
      workflow:       JSON.stringify(tpl.steps || []),
      params:         JSON.stringify(tpl.params || []),
      chains:         "[]",
      triggerType:    tpl.triggerType || "manual",
      cronExpression: tpl.cronExpression || null,
      enabled:        true,
      visualize:      false,
      workspace:      { id: workspace?.id, name: workspace?.name, slug },
    });
  }

  async function handleUploadFile(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImporting(true);
    setImportWarning("");
    const warnings = [];
    let successCount = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        const isYaml = file.name.endsWith(".yaml") || file.name.endsWith(".yml");
        const agentJson = isYaml ? yamlToAgentJson(yamlLoad(text)) : JSON.parse(text);
        const { data } = await api.post(`/workspaces/${slug}/agents/import`, { agentJson });
        setAgents(prev => [{ ...data.agent, _owned: true }, ...prev]);
        successCount++;
        if (data.unmatchedTypes?.length) warnings.push(`"${file.name}": ${data.unmatchedTypes.join(", ")} connector(s) not found`);
        if (data.slugRenamed) warnings.push(`"${file.name}": imported as "${data.slugRenamed}" (slug conflict)`);
      } catch (err) {
        warnings.push(`"${file.name}": ${err.response?.data?.error || "Invalid agent file"}`);
      }
    }
    setImporting(false);
    if (uploadRef.current) uploadRef.current.value = "";
    if (warnings.length) setImportWarning(`Imported ${successCount}/${files.length} — ${warnings.join("; ")}.`);
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
        workflow:       form.steps || [],
        params:         form.params || [],
        chains:         form.chains || [],
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
    setRunning(r => ({ ...r, [a.id]: null }));
    try {
      const token = localStorage.getItem("oe_token");
      const resp = await fetch(`/api/workspaces/${slug}/agents/${a.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ input: "" }),
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.runId) setRunning(r => ({ ...r, [a.id]: evt.runId }));
            if (evt.done || evt.error) {
              setRunning(r => { const n = { ...r }; delete n[a.id]; return n; });
              navigate(`/workspace/${slug}/run-logs`);
              return;
            }
          } catch { /* ignore malformed */ }
        }
      }
    } catch { /* ignore */ }
    setRunning(r => { const n = { ...r }; delete n[a.id]; return n; });
    navigate(`/workspace/${slug}/run-logs`);
  }

  async function handleStop(agentId) {
    const runId = running[agentId];
    if (runId) {
      try { await api.post(`/workspaces/${slug}/agents/${agentId}/runs/${runId}/cancel`); } catch { /* ignore */ }
    }
    setRunning(r => { const n = { ...r }; delete n[agentId]; return n; });
    navigate(`/workspace/${slug}/run-logs`);
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
              <h2 className="text-xl font-bold text-gray-900">Agents <span className="ml-2 text-xs font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full align-middle">{agents.length}</span></h2>
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
              <button onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Templates
              </button>
              <input ref={uploadRef} type="file" accept=".yaml,.yml" className="hidden" multiple onChange={handleUploadFile} />
              <button onClick={() => uploadRef.current?.click()} disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                {importing
                  ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                }
                Import
              </button>
              <button onClick={() => navigate(`/workspace/${slug}/approvals`)}
                className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approvals
                {pendingApprovals > 0 && (
                  <span className="ml-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                )}
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

          {importWarning && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <span>{importWarning}</span>
              <button onClick={() => setImportWarning("")} className="ml-auto shrink-0 text-amber-500 hover:text-amber-700">✕</button>
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
                  onStop={handleStop}
                  onApi={setApiAgent}
                  onDownload={downloadYaml}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          )}

          {agentSharingEnabled && workspace && (
            <div className="border border-gray-200 rounded-xl p-5">
              <AgentSharingSection ws={workspace} />
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
      {apiAgent  && <ApiModal  agent={apiAgent}  workspaceSlug={slug} onClose={() => setApiAgent(null)} navigate={navigate} />}
      {showTemplates && <TemplatesPanel onClose={() => setShowTemplates(false)} onUse={openFromTemplate} />}
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
