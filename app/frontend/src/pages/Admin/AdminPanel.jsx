import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { load as yamlLoad } from "js-yaml";
import { PROVIDERS, EMBEDDING_PROVIDERS, VECTOR_DBS, TAG_COLOR } from "../../config/providers";
import WorkspaceDrawer from "../../components/WorkspaceDrawer";
import ConfirmDialog from "../../components/ConfirmDialog";
import UserMenu from "../../components/UserMenu";
import { exportMD, exportPDF, exportFilename } from "../../utils/exportOutput";

// ── Shared helpers ────────────────────────────────────────────────────────────

function agentToYaml(a) {
  const lines = [
    `name: "${a.name || "Untitled Agent"}"`,
    ...(a.slug        ? [`slug: "${a.slug}"`]               : []),
    ...(a.description ? [`description: "${a.description}"`] : []),
    `enabled: ${a.enabled !== false}`,
    `trigger:`,
    `  type: ${a.trigger?.type || a.triggerType || "manual"}`,
  ];
  const cron = a.trigger?.cron || a.cronExpression;
  if (cron) lines.push(`  cron: "${cron}"`);
  if (a.group?.trim()) lines.push(`group: "${a.group.trim()}"`);
  const chains = a.chains ? (typeof a.chains === "string" ? JSON.parse(a.chains) : a.chains) : [];
  if (chains.length) {
    lines.push(`chains:`);
    chains.filter(c => c.nextAgent).forEach(c => {
      lines.push(`  - next_agent: "${c.nextAgent}"`);
      if (c.condition && c.condition !== "always") lines.push(`    condition: ${c.condition}`);
      if (c.triggerType && c.triggerType !== "automatic") lines.push(`    trigger_type: ${c.triggerType}`);
    });
  }
  const instructions = a.instructions || a.systemPrompt;
  if (instructions) {
    lines.push(`instructions: |`);
    instructions.split("\n").forEach(l => lines.push(`  ${l}`));
  }
  const steps = a.steps || (a.workflow ? (typeof a.workflow === "string" ? JSON.parse(a.workflow) : a.workflow) : []);
  if (steps?.length) {
    lines.push(`steps:`);
    steps.forEach(s => {
      lines.push(`  - name: "${s.name || ""}"`);
      if (s.content?.trim()) {
        lines.push(`    content: |`);
        s.content.split("\n").forEach(l => lines.push(`      ${l}`));
      }
    });
  }
  const conns = a.connectors || [];
  if (conns.length) {
    lines.push(`connectors:`);
    conns.forEach(c => lines.push(`  - name: "${c.name}"\n    type: ${c.type}`));
  }
  const params = a.params || [];
  if (params.length) {
    lines.push(`params:`);
    params.forEach(p => {
      lines.push(`  - name: ${p.name}`);
      if (p.label)   lines.push(`    label: "${p.label}"`);
      if (p.default) lines.push(`    default: "${p.default}"`);
    });
  }
  return lines.join("\n");
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-6 h-6 border-4 border-indigo border-t-transparent rounded-full animate-spin" />;
}

function EmptyState({ message, action, actionLabel }) {
  return (
    <div className="py-14 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
      {action && (
        <button onClick={action} className="mt-3 text-xs font-medium text-indigo hover:text-indigo/80 border border-indigo/30 px-3 py-1.5 rounded-lg transition-colors">
          {actionLabel || "Get started →"}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message, onClose }) {
  return (
    <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
      {message}
      <button onClick={onClose} className="ml-4 font-bold text-red-400 hover:text-red-600">&times;</button>
    </div>
  );
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

// ── Main layout ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Workspace",
    color: "text-indigo",
    items: [
      {
        id: "workspaces", label: "Workspaces",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
      },
      {
        id: "chats", label: "Chat History", adminOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />,
      },
    ],
  },
  {
    label: "Agents",
    color: "text-teal-600",
    items: [
      {
        id: "agents", label: "All Agents", sub: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.25 48.25 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />,
      },
      {
        id: "agent-runs", label: "Agent Runs", sub: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />,
      },
    ],
  },
  {
    label: "Users",
    color: "text-violet-500",
    adminOnly: true,
    items: [
      {
        id: "users", label: "Users",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0zM3 17a3 3 0 016 0" />,
      },
    ],
  },
  {
    label: "Developer",
    color: "text-emerald-600",
    adminOnly: true,
    items: [
      {
        id: "api-keys", label: "APIs",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
      },
      {
        id: "embed", label: "Embed",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
      },
    ],
  },
  {
    label: "Settings",
    color: "text-slate-500",
    adminOnly: true,
    items: [
      {
        id: "settings", label: "Instance Settings",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
      },
      {
        id: "maintenance", label: "Maintenance",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
      },
      {
        id: "vectors", label: "Vectors", adminOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      },
    ],
  },
];

// ── Vectors section ───────────────────────────────────────────────────────────

function VectorsSection() {
  const [tables, setTables]     = useState([]);
  const [allWs, setAllWs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [confirmDrop, setConfirmDrop] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [assignTarget, setAssignTarget] = useState("");
  const [assignBusy, setAssignBusy]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { fetchTables(); }, []);

  async function fetchTables() {
    setLoading(true);
    try {
      const [vRes, wRes] = await Promise.all([
        api.get("/admin/vectors"),
        api.get("/admin/workspaces"),
      ]);
      setTables(vRes.data.tables || []);
      setAllWs(wRes.data.workspaces || []);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load vector tables");
    } finally { setLoading(false); }
  }

  async function dropTable() {
    if (!confirmDrop) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/vectors/${confirmDrop}`);
      setTables(t => t.filter(tbl => tbl.name !== confirmDrop));
    } catch (e) {
      setError(e.response?.data?.error || "Failed to drop table");
    } finally { setDeleting(false); setConfirmDrop(null); }
  }

  async function assignTable(name) {
    if (!assignTarget) return;
    setAssignBusy(true);
    try {
      const { data } = await api.post(`/admin/vectors/${name}/assign`, { targetWorkspaceSlug: assignTarget });
      setError("");
      await fetchTables();
      setAssigning(null);
      setAssignTarget("");
    } catch (e) {
      setError(e.response?.data?.error || "Failed to assign table");
    } finally { setAssignBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Vectors</h2>
      <p className="text-sm text-gray-500 mb-6">
        LanceDB vector tables, one per workspace. Orphaned tables have no workspace — assign them to an existing workspace or drop them.
      </p>

      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">{tables.length} table{tables.length !== 1 ? "s" : ""}</p>
          <button onClick={fetchTables} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg transition-colors">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : tables.length === 0 ? (
          <EmptyState message="No vector tables found." />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Table</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Shared with</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tables.map(tbl => (
                <tr key={tbl.name} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{tbl.name}</td>
                  <td className="px-6 py-4">
                    {tbl.workspace ? (
                      <div>
                        <p className="text-sm font-medium text-gray-800">{tbl.workspace.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{tbl.workspace.slug}</p>
                      </div>
                    ) : assigning === tbl.name ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={assignTarget}
                          onChange={e => setAssignTarget(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo/30 bg-white"
                        >
                          <option value="">Pick workspace…</option>
                          {allWs.map(w => <option key={w.id} value={w.slug}>{w.name}</option>)}
                        </select>
                        <button
                          onClick={() => assignTable(tbl.name)}
                          disabled={!assignTarget || assignBusy}
                          className="text-xs px-2.5 py-1.5 bg-indigo text-white rounded-lg hover:bg-indigo/90 font-medium disabled:opacity-40 transition-colors"
                        >
                          {assignBusy ? "Moving…" : "Assign"}
                        </button>
                        <button
                          onClick={() => { setAssigning(null); setAssignTarget(""); }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Orphaned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tbl.shares.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {tbl.shares.map(s => (
                          <span key={s.id} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {s.targetWorkspace.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!tbl.workspace && assigning !== tbl.name && (
                        <button
                          onClick={() => { setAssigning(tbl.name); setAssignTarget(""); }}
                          className="text-xs px-3 py-1.5 border border-indigo/30 text-indigo rounded-lg hover:bg-indigo/5 font-medium transition-colors"
                        >
                          Assign
                        </button>
                      )}
                      <button
                        onClick={() => { setConfirmDrop(tbl.name); setAssigning(null); }}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors"
                      >
                        Drop
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDrop && (
        <ConfirmDialog
          title="Drop Vector Table"
          message="Permanently delete vector table"
          detail={confirmDrop}
          confirmLabel="Drop"
          variant="danger"
          loading={deleting}
          onConfirm={dropTable}
          onCancel={() => !deleting && setConfirmDrop(null)}
        />
      )}
    </div>
  );
}

// ── Maintenance section ────────────────────────────────────────────────────────

function MaintenanceSection() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selWs, setSelWs]           = useState("all");
  const [purging, setPurging]       = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [result, setResult]         = useState(null);

  useEffect(() => {
    api.get("/admin/workspaces").then(r => setWorkspaces(r.data.workspaces || []));
  }, []);

  const PURGE_TYPES = [
    { id: "chats",          label: "Chat History",    desc: "All chat messages in threads"                          },
    { id: "agent-runs",     label: "Agent Runs",      desc: "All agent run logs and outputs"                        },
    { id: "agent-memory",   label: "Agent Memory",    desc: "Clears run outputs used as memory (keeps run history)" },
    { id: "threads",        label: "Threads",         desc: "All threads (and their chat history)"                  },
  ];

  async function doPurge(type) {
    setPurging(type);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (selWs !== "all") params.set("workspaceId", selWs);
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate)   params.set("to",   new Date(toDate + "T23:59:59").toISOString());
      const qs = params.toString() ? `?${params}` : "";
      const { data } = await api.delete(`/admin/purge/${type}${qs}`);
      setResult({ ok: true, msg: data.message });
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.error || "Purge failed" });
    } finally { setPurging(null); setConfirm(null); setFromDate(""); setToDate(""); }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Maintenance</h2>
      <p className="text-sm text-gray-500 mb-6">Purge logs and history data. This action is irreversible.</p>

      {/* Workspace filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope</label>
        <select value={selWs} onChange={e => { setSelWs(e.target.value); setResult(null); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo/30 w-64">
          <option value="all">All Workspaces</option>
          {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {result && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium ${result.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {result.msg}
        </div>
      )}

      <div className="space-y-3">
        {PURGE_TYPES.map(pt => (
          <div key={pt.id} className="flex items-center justify-between px-5 py-4 rounded-xl border border-gray-200 bg-white">
            <div>
              <p className="text-sm font-semibold text-gray-800">{pt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{pt.desc}</p>
            </div>
            {confirm === pt.id ? (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo/30" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo/30" />
                </div>
                <button onClick={() => doPurge(pt.id)} disabled={!!purging}
                  className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50">
                  {purging === pt.id ? "Purging…" : "Confirm"}
                </button>
                <button onClick={() => { setConfirm(null); setFromDate(""); setToDate(""); }}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => { setConfirm(pt.id); setResult(null); }}
                className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">
                Purge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Users section ─────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function groupForSection(sectionId) {
    for (const g of NAV_GROUPS) {
      if (g.items.some(i => i.id === sectionId)) return g.label;
    }
    return null;
  }

  const initialSection = "workspaces";
  const [activeSection, setActiveSection]   = useState(initialSection);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const grp = groupForSection(initialSection);
    const defaults = new Set(["Workspace", "Agents"]);
    if (grp) defaults.add(grp);
    return defaults;
  });

  function toggleGroup(label) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  function navTo(sectionId, groupLabel) {
    setActiveSection(sectionId);
    setExpandedGroups(prev => new Set([...prev, groupLabel]));
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <nav className="shrink-0 flex items-center justify-between px-6 py-3" style={{
        background: "linear-gradient(145deg, #13103a 0%, #1e1b4b 40%, #2e2a80 80%, #4f46e5 100%)",
        borderBottom: "1px solid rgba(99,102,241,0.25)",
        boxShadow: "0 1px 24px rgba(79,70,229,0.12)"
      }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow: "0 0 12px rgba(99,102,241,0.5)"
            }}>
              <span className="text-white font-black text-sm">E</span>
            </div>
            <span className="text-white font-semibold text-base tracking-tight">Open Enterprise</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a5b4fc"
            }}>v{__APP_VERSION__}</span>
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <span className="text-sm font-medium" style={{ color: "rgba(203,213,225,0.7)" }}>{user?.role === "admin" ? "Admin Panel" : user?.role === "manager" ? "Manager Panel" : "Dashboard"}</span>
        </div>
        <UserMenu user={user} logout={logout} />
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <nav className="p-3 flex-1">
            {NAV_GROUPS.filter(g => {
              if (g.adminOnly) return user?.role === "admin";
              if (g.managerOnly) return user?.role === "admin" || user?.role === "manager";
              return true;
            }).map(group => {
              const isOpen = expandedGroups.has(group.label);
              return (
                <div key={group.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo">{group.label}</span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 mb-3">
                      {group.items.filter(item => {
                        if (item.adminOnly) return user?.role === "admin";
                        if (item.managerOnly) return user?.role === "admin" || user?.role === "manager";
                        return true;
                      }).map(item => (
                        <button
                          key={item.id}
                          onClick={() => navTo(item.id, group.label)}
                          className={`w-full flex items-center gap-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                            item.sub ? "pl-5 pr-3 py-1.5" : "px-3 py-2"
                          } ${activeSection === item.id ? "bg-indigo/10 text-indigo" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                        >
                          <svg className={`shrink-0 fill-none ${item.sub ? "w-3.5 h-3.5" : "w-4 h-4"}`} viewBox="0 0 24 24" stroke="currentColor">
                            {item.icon}
                          </svg>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div>
            {activeSection === "users"       && <UsersSection currentUser={user} />}
            {activeSection === "workspaces"  && <WorkspacesSection navigate={navigate} currentUser={user} />}
            {activeSection === "chats"       && <ChatsSection />}
            {activeSection === "settings"    && <SettingsSection />}

            {activeSection === "api-keys"    && <ApiKeysSection />}
            {activeSection === "embed"       && <EmbedSection />}
            {activeSection === "agents"      && <AgentsSection onRunComplete={() => setActiveSection("agent-runs")} />}
            {activeSection === "agent-runs"  && <AgentRunsSection />}
            {activeSection === "maintenance" && <MaintenanceSection />}
            {activeSection === "vectors"     && <VectorsSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

function UsersSection({ currentUser }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [editingUser, setEditingUser]   = useState(null);
  const [editForm, setEditForm]         = useState({ name: "", role: "user", password: "" });
  const [saving, setSaving]             = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase();
        return (u.name || "").toLowerCase().includes(q)
          || u.email.toLowerCase().includes(q)
          || u.role.toLowerCase().includes(q);
      })
    : users;

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/admin/users", form);
      setUsers(u => [...u, data.user]);
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "user" });
    } catch (err) { setError(err.response?.data?.error || "Failed to create user"); }
    finally { setCreating(false); }
  }

  function toggleSuspend(id, suspended, name) {
    setConfirmAction({ type: "suspend", id, suspended, name });
  }

  function deleteUser(id, name) {
    setConfirmAction({ type: "delete", id, name });
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction.type === "suspend") {
        const { data } = await api.put(`/admin/users/${confirmAction.id}`, { suspended: !confirmAction.suspended });
        setUsers(u => u.map(usr => usr.id === confirmAction.id ? data.user : usr));
      } else if (confirmAction.type === "delete") {
        await api.delete(`/admin/users/${confirmAction.id}`);
        setUsers(u => u.filter(usr => usr.id !== confirmAction.id));
      }
      setConfirmAction(null);
    } catch { setError("Failed to update user"); }
    finally { setConfirmLoading(false); }
  }

  function openEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name || "", email: u.email || "", role: u.role, password: "" });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    const isSuperAdmin = currentUser.id === 0;
    const isSelf       = editingUser.id === currentUser.id;
    try {
      const payload = { name: editForm.name };
      if (isSuperAdmin || !isSelf) payload.role = editForm.role;
      if (editForm.password) payload.password = editForm.password;
      if ((isSuperAdmin || !isSelf) && editForm.email !== editingUser.email) payload.email = editForm.email;
      const { data } = await api.put(`/admin/users/${editingUser.id}`, payload);
      setUsers(u => u.map(usr => usr.id === editingUser.id ? { ...usr, ...data.user } : usr));
      setEditingUser(null);
    } catch (err) { setError(err.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">Users</h2>
            <p className="text-gray-500 text-sm mt-0.5">{filteredUsers.length}{search.trim() ? ` of ${users.length}` : ""} total</p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className="input pl-8 py-1.5 text-sm w-full"
              />
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">+ Add User</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : users.length === 0 ? (
          <EmptyState message="No users found." action={() => setShowCreate(true)} actionLabel="Add the first user →" />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo/10 flex items-center justify-center text-xs font-bold text-indigo">
                        {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.name} {u.id === currentUser.id && <span className="text-xs text-gray-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.suspended ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.suspended ? "bg-red-500" : "bg-green-500"}`} />
                      {u.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-indigo hover:text-indigo/80 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      {u.id !== currentUser.id && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => toggleSuspend(u.id, u.suspended, u.name)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                          >
                            {u.suspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => deleteUser(u.id, u.name)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="Add User" onClose={() => setShowCreate(false)}>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input className="input" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} minLength={8} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select className="input" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="user">User — chat only in assigned workspaces</option>
                <option value="manager">Manager — manage workspaces &amp; chat history</option>
                {currentUser.id === 0 && (
                  <option value="admin">Admin — full access including instance settings</option>
                )}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-2">Cancel</button>
              <button type="submit" className="btn-primary flex-1 py-2" disabled={creating}>
                {creating ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (() => {
        const isSuperAdmin = currentUser.id === 0;
        const isSelf       = editingUser.id === currentUser.id;
        const canEditEmailRole = isSuperAdmin || !isSelf;
        return (
        <Modal title={`Edit — ${editingUser.name || editingUser.email}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                className="input"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={e => canEditEmailRole && setEditForm(f => ({ ...f, email: e.target.value }))}
                readOnly={!canEditEmailRole}
                style={!canEditEmailRole ? { background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" } : {}}
                required
              />
              {!canEditEmailRole && <p className="text-xs text-gray-400 mt-1">You cannot change your own email.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              {canEditEmailRole ? (
                <select
                  className="input"
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User — chat only in assigned workspaces</option>
                  <option value="manager">Manager — manage workspaces &amp; chat history</option>
                  <option value="admin">Admin — full access including instance settings</option>
                </select>
              ) : (
                <p className="text-xs text-gray-400 italic py-1">You cannot change your own role.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                className="input"
                type="password"
                value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to keep current password"
                minLength={editForm.password ? 8 : undefined}
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary flex-1 py-2">Cancel</button>
              <button type="submit" className="btn-primary flex-1 py-2" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
        );
      })()}

      {confirmAction?.type === "delete" && (
        <ConfirmDialog
          title="Delete User"
          message="Permanently delete user"
          detail={confirmAction.name}
          confirmLabel="Delete"
          variant="danger"
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => !confirmLoading && setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === "suspend" && (
        <ConfirmDialog
          title={confirmAction.suspended ? "Unsuspend User" : "Suspend User"}
          message={confirmAction.suspended ? "Restore access for" : "Suspend access for"}
          detail={confirmAction.name}
          confirmLabel={confirmAction.suspended ? "Unsuspend" : "Suspend"}
          variant="warning"
          loading={confirmLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => !confirmLoading && setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ── Workspaces section ────────────────────────────────────────────────────────


function WorkspacesSection({ navigate, currentUser }) {
  const [workspaces, setWorkspaces]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [showCreate, setShowCreate]       = useState(false);
  const [newName, setNewName]             = useState("");
  const [creating, setCreating]           = useState(false);
  const [drawerWsId, setDrawerWsId]       = useState(null);

  const filteredWorkspaces = search.trim()
    ? workspaces.filter(ws => {
        const q = search.toLowerCase();
        return ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q);
      })
    : workspaces;

  useEffect(() => { fetchWorkspaces(); }, []);

  async function fetchWorkspaces() {
    try {
      const { data } = await api.get("/admin/workspaces");
      setWorkspaces(data.workspaces);
    } catch { setError("Failed to load workspaces"); }
    finally { setLoading(false); }
  }

  async function createWorkspace(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/admin/workspaces", { name: newName.trim() });
      setWorkspaces(w => [data.workspace, ...w]);
      setNewName(""); setShowCreate(false);
    } catch (err) { setError(err.response?.data?.error || "Failed to create workspace"); }
    finally { setCreating(false); }
  }

  function handleDeleted(id) {
    setWorkspaces(w => w.filter(ws => ws.id !== id));
  }

  function handleUpdated(updated) {
    setWorkspaces(w => w.map(ws => ws.id === updated.id ? { ...ws, ...updated } : ws));
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">Workspaces</h2>
            <p className="text-gray-500 text-sm mt-0.5">{filteredWorkspaces.length}{search.trim() ? ` of ${workspaces.length}` : ""} total</p>
          </div>
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workspaces…"
              className="input pl-8 py-1.5 text-sm w-full"
            />
          </div>
          {currentUser?.role !== "user" && (showCreate ? (
            <form onSubmit={createWorkspace} className="flex items-center gap-2">
              <input
                className="input py-1.5 text-sm w-52"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Workspace name…"
                autoFocus
              />
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={creating}>
                {creating ? "…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">
              + New Workspace
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            message="No workspaces yet."
            action={currentUser?.role !== "user" ? () => setShowCreate(true) : undefined}
            actionLabel="Create your first workspace →"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredWorkspaces.map((ws) => (
              <div
                key={ws.id}
                className="cursor-pointer bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo/30 hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => navigate(`/workspace/${ws.slug}`)}
              >
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo flex items-center justify-center text-base font-bold text-white shrink-0">
                    {ws.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{ws.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{ws.slug}</p>
                  </div>
                </div>
                <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
                  {[
                    { v: ws._count.documents,       label: "docs"        },
                    { v: ws._count.chats,           label: "chats"       },
                    { v: ws._count.users,           label: "members"     },
                    { v: ws._count.agents ?? 0,     label: "agents"      },
                    { v: ws._count.connectors ?? 0, label: "connections" },
                  ].map(s => (
                    <span key={s.label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {s.v} {s.label}
                    </span>
                  ))}
                </div>
                <div className="px-4 pt-2 pb-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{ws.createdBy ? (ws.createdBy.name || ws.createdBy.email) : ""}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(ws.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setDrawerWsId(ws.id); }}
                      className="text-gray-400 hover:text-indigo transition-colors p-0.5 rounded"
                      title="Workspace settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawerWsId && (
        <WorkspaceDrawer
          workspaceId={drawerWsId}
          isAdmin={currentUser?.role === "admin"}
          onClose={() => setDrawerWsId(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

// ── Chat History section ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >← Prev</button>
        <span className="px-3 py-1 text-xs font-medium">Page {page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >Next →</button>
      </div>
    </div>
  );
}

const CHAT_PERIODS = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function ChatsSection() {
  const [workspaces, setWorkspaces]   = useState([]);
  const [selectedWsId, setSelectedWsId] = useState("");
  const [chats, setChats]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [period, setPeriod]           = useState("7d");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    api.get("/admin/workspaces").then(r => setWorkspaces(r.data.workspaces || []));
  }, []);

  useEffect(() => { setPage(1); }, [selectedWsId, period]);
  useEffect(() => { fetchChats(); }, [selectedWsId, page, period]);

  async function fetchChats() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (selectedWsId) params.set("workspaceId", selectedWsId);
      if (period === "7d")  params.set("since", new Date(Date.now() - 7  * 86400000).toISOString());
      if (period === "30d") params.set("since", new Date(Date.now() - 30 * 86400000).toISOString());
      const { data } = await api.get(`/admin/chats?${params}`);
      setChats(data.chats || []);
      setTotal(data.total || 0);
    } catch { setError("Failed to load chats"); }
    finally { setLoading(false); }
  }


  const fmt = dt => dt ? new Date(dt).toLocaleString() : "—";

  const exportCSV = () => {
    const headers = ["Workspace", "Role", "User", "Message", "Date"];
    const rows = chats.map(c => [
      c.workspace?.name || "", c.role, c.role === "user" ? (c.user?.name || "User") : "AI",
      c.content, fmt(c.createdAt)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `chat-history-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const exportMD = () => {
    const lines = [`# Chat History`, `*Generated: ${new Date().toLocaleString()} — ${total} message${total !== 1 ? "s" : ""}*`, ""];
    chats.forEach((c, i) => {
      const who = c.role === "user" ? (c.user?.name || "User") : "AI";
      lines.push(`## ${i + 1}. ${who} (${c.role})`);
      lines.push(`- **Workspace:** ${c.workspace?.name || "—"}`);
      lines.push(`- **Time:** ${fmt(c.createdAt)}`);
      lines.push(`- **Message:** ${c.content}`);
      lines.push("", "---", "");
    });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
    a.download = `chat-history-${new Date().toISOString().slice(0,10)}.md`; a.click();
  };

  const exportPDF = () => {
    const escape = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = chats.map((c, i) => {
      const who = c.role === "user" ? (c.user?.name || "User") : "AI";
      return `<tr>
        <td>${i + 1}</td>
        <td>${escape(c.workspace?.name || "—")}</td>
        <td><span class="role ${c.role}">${escape(who)}</span></td>
        <td>${escape(c.content)}</td>
        <td>${escape(fmt(c.createdAt))}</td>
      </tr>`;
    }).join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Chat History</title><style>
      body{font-family:system-ui,sans-serif;font-size:13px;padding:32px;color:#111;max-width:1100px;margin:auto}
      h1{font-size:18px;margin-bottom:4px} .sub{color:#888;font-size:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#f9fafb;padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#6b7280}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
      .role{font-weight:600;font-size:10px;text-transform:uppercase;padding:2px 6px;border-radius:9999px}
      .role.user{background:#dbeafe;color:#1d4ed8} .role.assistant{background:#ede9fe;color:#6d28d9}
      @media print{table{page-break-inside:auto} tr{page-break-inside:avoid}}
    </style></head><body>
      <h1>Chat History</h1>
      <p class="sub">Generated: ${new Date().toLocaleString()} · ${total} message${total !== 1 ? "s" : ""}</p>
      <table><thead><tr><th>#</th><th>Workspace</th><th>Role</th><th>Message</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div>
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900">Chat History</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {total > 0 ? `${total} message${total !== 1 ? "s" : ""}` : "No messages"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="input py-1.5 text-sm"
              value={selectedWsId}
              onChange={e => setSelectedWsId(e.target.value)}
            >
              <option value="">All workspaces</option>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {CHAT_PERIODS.map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={fetchChats} className="text-xs text-indigo hover:text-indigo/80 font-medium px-2">↻</button>
            {chats.length > 0 && (
              <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">.csv</button>
                <button onClick={exportMD}  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.md</button>
                <button onClick={exportPDF} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.pdf</button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : chats.length === 0 ? (
          <EmptyState message="No chat history found." />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {chats.map(chat => (
                <tr key={chat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">{chat.workspace?.name || "—"}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      chat.role === "user" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                    }`}>
                      {chat.role === "user" ? (chat.user?.name || "User") : "AI"}
                    </span>
                  </td>
                  <td className="px-6 py-3 max-w-sm">
                    <p className="text-sm text-gray-600 truncate">{chat.content}</p>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(chat.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

    </div>
  );
}

// ── Activity Log section ──────────────────────────────────────────────────────

const ACTION_META = {
  "user.created":            { label: "User Created",          color: "bg-blue-100 text-blue-700" },
  "user.deleted":            { label: "User Deleted",          color: "bg-blue-100 text-blue-700" },
  "user.suspended":          { label: "User Suspended",        color: "bg-blue-100 text-blue-700" },
  "user.unsuspended":        { label: "User Unsuspended",      color: "bg-blue-100 text-blue-700" },
  "user.role_changed":       { label: "Role Changed",          color: "bg-blue-100 text-blue-700" },
  "workspace.created":       { label: "Workspace Created",     color: "bg-green-100 text-green-700" },
  "workspace.deleted":       { label: "Workspace Deleted",     color: "bg-green-100 text-green-700" },
  "workspace.updated":       { label: "Workspace Updated",     color: "bg-green-100 text-green-700" },
  "workspace.member_added":  { label: "Member Added",          color: "bg-green-100 text-green-700" },
  "workspace.member_removed":{ label: "Member Removed",        color: "bg-green-100 text-green-700" },
  "settings.updated":        { label: "Settings Updated",      color: "bg-amber-100 text-amber-700" },
  "chat.cleared":            { label: "Chat History Cleared",  color: "bg-red-100 text-red-600" },
  "connector.created":       { label: "Connector Created",     color: "bg-teal-100 text-teal-700" },
  "connector.deleted":       { label: "Connector Deleted",     color: "bg-teal-100 text-teal-700" },
  "agent.created":           { label: "Agent Created",         color: "bg-violet-100 text-violet-700" },
  "agent.deleted":           { label: "Agent Deleted",         color: "bg-violet-100 text-violet-700" },
  "agent.run":               { label: "Agent Run",             color: "bg-violet-100 text-violet-700" },
};

function formatDetails(detailsJson) {
  if (!detailsJson) return null;
  try {
    const d = JSON.parse(detailsJson);
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" · ");
  } catch { return detailsJson; }
}

// ── Token Usage ───────────────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtCost(n) {
  if (!n || n === 0) return null;
  return `$${n.toFixed(4)}`;
}

function UsageBar({ used, limit, label, formatUsed, formatLimit }) {
  const infinite = limit === null || limit === undefined || !isFinite(limit);
  const pct      = infinite ? 0 : Math.min(100, (used / limit) * 100);
  const danger   = pct >= 90;
  const warn     = pct >= 70;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${danger ? "text-red-600" : warn ? "text-amber-600" : "text-gray-500"}`}>
          {formatUsed(used)} / {infinite ? "Unlimited" : formatLimit(limit)}
        </span>
      </div>
      {!infinite && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${danger ? "bg-red-500" : warn ? "bg-amber-400" : "bg-indigo"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Instance Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Configure LLM, embedding, vector database, text splitting, and audio</p>
      </div>
      <div className="px-6 py-5">
        <SettingsForm />
      </div>
    </div>
  );
}

// ── Settings form ─────────────────────────────────────────────────────────────

function ModelSelect({ providerId, triggerValue, currentModel, defaultModel, onChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (triggerValue && triggerValue !== "********") {
          if (providerId === "ollama") params.set("baseUrl", triggerValue.replace(/\/v1$/, ""));
          else params.set("apiKey", triggerValue);
        }
        const { data } = await api.get(`/models/${providerId}?${params}`);
        if (!cancelled) {
          setModels(data.models || []);
          if (data.models?.length && !data.models.includes(currentModel)) {
            const pick = data.models.find(m => m === defaultModel) || data.models[0];
            onChange(pick);
          }
        }
      } catch { if (!cancelled) setModels([]); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [providerId, triggerValue]);

  const list = models.length ? models : [defaultModel].filter(Boolean);
  if (loading) return <select className="input" disabled><option>Loading models…</option></select>;
  return (
    <select className="input" value={currentModel || defaultModel || ""} onChange={e => onChange(e.target.value)}>
      {list.map(m => <option key={m} value={m}>{m}</option>)}
      {!list.includes(currentModel) && currentModel && <option value={currentModel}>{currentModel}</option>}
    </select>
  );
}

function ProviderGrid({ providers, selectedId, onSelect, search, onSearch }) {
  const filtered = useMemo(() =>
    providers.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tag.toLowerCase().includes(search.toLowerCase())
    ),
    [providers, search]
  );
  return (
    <div>
      <div className="relative mb-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input className="input pl-9 py-2 text-sm" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search providers…" />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
        {filtered.map(p => (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)}
            className={`w-full text-left rounded-xl border-2 px-3 py-2 transition-all ${
              selectedId === p.id ? "border-indigo bg-indigo/5" : "border-gray-200 hover:border-indigo/40 hover:bg-gray-50"
            }`}>
            <div className="flex items-center justify-between gap-1">
              <span className={`text-xs font-semibold truncate ${selectedId === p.id ? "text-indigo" : "text-gray-800"}`}>{p.name}</span>
              <span className={`shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded-full ${TAG_COLOR[p.tag]}`}>{p.tag}</span>
            </div>
            {p.desc && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{p.desc}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecretField({ fieldKey, saved, placeholder, onSet, onClear }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef();

  if (saved && !editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-gray-500 font-mono tracking-widest select-none">••••••••••••••••</span>
          <span className="ml-auto text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">Saved</span>
        </div>
        <button type="button" onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="px-3 py-2 text-xs font-medium text-indigo border border-indigo/30 rounded-lg hover:bg-indigo/5 transition-colors shrink-0">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} className="input flex-1" type="password"
        defaultValue=""
        onChange={e => onSet(e.target.value)}
        placeholder={placeholder || "Enter API key"}
        autoComplete="new-password" />
      {editing && (
        <button type="button" onClick={() => setEditing(false)}
          className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0">
          Cancel
        </button>
      )}
    </div>
  );
}

function ProviderFields({ provider, settings, set, isLLM, isActive }) {
  const triggerField = provider.fields.find(f => f.triggersModelFetch);
  const triggerValue = triggerField ? settings[triggerField.key] : undefined;
  if (provider.fields.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
        No additional configuration required — this provider is ready to use.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {provider.fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
          {f.type === "model-select" && isLLM ? (
            <ModelSelect providerId={provider.id} triggerValue={triggerValue} currentModel={settings[f.key]} defaultModel={f.defaultModel} onChange={v => set(f.key, v)} />
          ) : f.type === "select" ? (
            <select className="input" value={settings[f.key] || f.defaultModel || (f.options?.[0] ?? "")} onChange={e => set(f.key, e.target.value)}>
              {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === "password" ? (
            <SecretField
              key={`${f.key}-${isActive}`}
              fieldKey={f.key}
              saved={isActive && settings[f.key] === "********"}
              placeholder={f.placeholder}
              onSet={v => set(f.key, v)}
              onClear={() => set(f.key, "")}
            />
          ) : (
            <input className="input" type="text"
              value={settings[f.key] ?? (f.defaultValue || "")}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              autoComplete="off" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProviderModelSelect({ providerId, value, onChange }) {
  const [models, setModels] = useState([]);
  useEffect(() => {
    api.get(`/models/${providerId}`)
      .then(r => {
        const list = r.data.models || [];
        setModels(list);
        if (!value && list.length) onChange(list[0]);
      })
      .catch(() => setModels([]));
  }, [providerId]);
  if (!models.length) {
    return <input className="input" type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Enter model name" />;
  }
  return (
    <select className="input" value={value || models[0] || ""} onChange={e => onChange(e.target.value)}>
      {models.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
  );
}

function LLMTab({ settings, set, savedSettings }) {
  const selectedId = settings.llm_provider || "openai";
  const savedId    = savedSettings.llm_provider || "openai";
  const keySaved   = selectedId === savedId && savedSettings.llm_api_key === "********";

  function handleProviderChange(id) {
    set("llm_provider", id);
    set("llm_api_key", "");
    set("llm_model", "");
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-gray-500">Language model used to answer questions in all workspaces.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
        <select className="input" value={selectedId} onChange={e => handleProviderChange(e.target.value)}>
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
        <SecretField saved={keySaved} placeholder="Enter API key" onSet={v => set("llm_api_key", v)} onClear={() => set("llm_api_key", "")} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
        <ProviderModelSelect providerId={selectedId} value={settings.llm_model} onChange={v => set("llm_model", v)} />
      </div>
    </div>
  );
}

const EMBEDDING_MODELS = {
  openai:          ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  gemini:          ["text-embedding-004", "embedding-001"],
  cohere:          ["embed-english-v3.0", "embed-multilingual-v3.0", "embed-english-light-v3.0", "embed-multilingual-light-v3.0"],
  azure:           [],
  ollama:          [],
  lmstudio:        [],
  "generic-openai": [],
};

function EmbeddingTab({ settings, set, savedSettings }) {
  const selectedId = settings.embedding_provider || "openai";
  const savedId    = savedSettings.embedding_provider || "openai";
  const keySaved   = selectedId === savedId && savedSettings.embedding_api_key === "********";
  const models     = EMBEDDING_MODELS[selectedId] || [];

  function handleProviderChange(id) {
    set("embedding_provider", id);
    set("embedding_api_key", "");
    const firstModel = (EMBEDDING_MODELS[id] || [])[0] || "";
    set("embedding_model", firstModel);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-gray-500">Embedding model used to convert documents and queries into vectors.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
        <select className="input" value={selectedId} onChange={e => handleProviderChange(e.target.value)}>
          {EMBEDDING_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
        <SecretField saved={keySaved} placeholder="Enter API key" onSet={v => set("embedding_api_key", v)} onClear={() => set("embedding_api_key", "")} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
        {models.length ? (
          <select className="input" value={settings.embedding_model || models[0]} onChange={e => set("embedding_model", e.target.value)}>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input className="input" type="text" value={settings.embedding_model || ""}
            onChange={e => set("embedding_model", e.target.value)}
            placeholder="Enter model name" />
        )}
      </div>
    </div>
  );
}

function TextSplittingTab({ settings, set }) {
  const chunkSize    = parseInt(settings.chunk_size    ?? 1000);
  const chunkOverlap = parseInt(settings.chunk_overlap ?? 150);
  const ragTopK      = parseInt(settings.rag_top_k     ?? 15);

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Controls how documents are split into chunks before embedding, and how many chunks are retrieved at query time.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Chunk Size <span className="text-gray-400 font-normal">(characters)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Maximum number of characters per chunk. Larger chunks retain more context; smaller chunks improve retrieval precision.
          Recommended: 500 – 2000. Default: 1000.
        </p>
        <input
          className="input"
          type="number"
          min={100}
          max={10000}
          step={50}
          value={chunkSize}
          onChange={e => set("chunk_size", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Chunk Overlap <span className="text-gray-400 font-normal">(characters)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Number of characters shared between consecutive chunks. Prevents context from being cut off at boundaries.
          Recommended: 10 – 25% of Chunk Size. Default: 150.
        </p>
        <input
          className="input"
          type="number"
          min={0}
          max={2000}
          step={10}
          value={chunkOverlap}
          onChange={e => set("chunk_overlap", e.target.value)}
        />
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
        <p><strong>Current settings:</strong> {chunkSize} chars / chunk · {chunkOverlap} chars overlap</p>
        <p>A 10 000-character document will produce approximately {Math.ceil(10000 / Math.max(chunkSize - chunkOverlap, 1))} chunks at these settings.</p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Retrieval Settings</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Top K Results <span className="text-gray-400 font-normal">(chunks per query)</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Number of document chunks sent to the LLM as context for each question. Increase this if answers are incomplete
            — e.g. a 12-step process split across 10 chunks needs K ≥ 10 to be fully retrieved.
            Higher values use more tokens per query. Default: 15.
          </p>
          <input
            className="input"
            type="number"
            min={1}
            max={100}
            step={1}
            value={ragTopK}
            onChange={e => set("rag_top_k", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function VectorDBTab({ settings, set }) {
  const [search, setSearch] = useState("");
  const selectedId = settings.vector_db_provider || "lancedb";
  const selectedProvider = VECTOR_DBS.find(p => p.id === selectedId);
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Choose the vector database for storing and searching document embeddings.</p>
      <ProviderGrid providers={VECTOR_DBS} selectedId={selectedId} onSelect={id => set("vector_db_provider", id)} search={search} onSearch={setSearch} />
      {selectedProvider && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{selectedProvider.name} configuration</p>
          <ProviderFields provider={selectedProvider} settings={settings} set={set} isLLM={false} />
        </div>
      )}
    </div>
  );
}

// ── Audio provider picker ─────────────────────────────────────────────────────

function AudioProviderPicker({ providers, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = providers.find(p => p.value === value) || providers[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-indigo/40 transition-colors"
      >
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-gray-800">{selected.label}</span>
          <span className="text-xs text-gray-400 mt-0.5">{selected.desc}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {providers.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full flex flex-col text-left px-4 py-3 transition-colors hover:bg-gray-50 border-l-2 ${value === p.value ? "bg-indigo/5 border-indigo" : "border-transparent"}`}
              >
                <span className={`text-sm font-medium ${value === p.value ? "text-indigo" : "text-gray-800"}`}>{p.label}</span>
                <span className="text-xs text-gray-400 mt-0.5">{p.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TTS_PROVIDERS = [
  { value: "native",         label: "System Native",       desc: "Browser built-in speech synthesis — no API calls, works offline." },
  { value: "openai",         label: "OpenAI TTS",          desc: "High-quality voices via OpenAI tts-1 model. Uses configured OpenAI API key." },
  { value: "elevenlabs",     label: "ElevenLabs",          desc: "Premium AI voices via ElevenLabs API. Requires an ElevenLabs API key." },
  { value: "generic-openai", label: "OpenAI Compatible",   desc: "Any OpenAI-compatible TTS endpoint (local or hosted)." },
];

const STT_PROVIDERS = [
  { value: "native",         label: "System Native",       desc: "Browser built-in speech recognition (Chrome/Edge). No API calls." },
  { value: "openai",         label: "OpenAI Whisper",      desc: "Transcribe via OpenAI Whisper API. Uses configured OpenAI API key." },
  { value: "deepgram",       label: "Deepgram",            desc: "Transcribe via Deepgram Nova-2. Requires a Deepgram API key." },
  { value: "generic-openai", label: "OpenAI Compatible",   desc: "Any OpenAI-compatible transcription endpoint." },
];

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

function AudioTab({ settings, set }) {
  const ttsProvider = settings.tts_provider || "native";
  const sttProvider = settings.stt_provider || "native";

  return (
    <div className="space-y-8">

      {/* TTS */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Text-to-Speech (TTS)</p>
        <p className="text-xs text-gray-400 mb-3">Controls the speaker icon on AI messages in chat.</p>
        <AudioProviderPicker providers={TTS_PROVIDERS} value={ttsProvider} onChange={v => set("tts_provider", v)} />

        {ttsProvider === "openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
              <select className="input" value={settings.tts_voice || "alloy"} onChange={e => set("tts_voice", e.target.value)}>
                {TTS_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select className="input" value={settings.tts_model || "tts-1"} onChange={e => set("tts_model", e.target.value)}>
                <option value="tts-1">tts-1 — faster, standard quality</option>
                <option value="tts-1-hd">tts-1-hd — slower, higher quality</option>
              </select>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Uses the OpenAI API key from <strong>LLM Provider</strong> settings.
            </div>
          </div>
        )}

        {ttsProvider === "elevenlabs" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ElevenLabs API Key</label>
              <input className="input" type="password" value={settings.tts_elevenlabs_key || ""}
                onChange={e => set("tts_elevenlabs_key", e.target.value)}
                placeholder="sk-..." autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice ID</label>
              <input className="input" value={settings.tts_elevenlabs_voice_id || ""}
                onChange={e => set("tts_elevenlabs_voice_id", e.target.value)}
                placeholder="21m00Tcm4TlvDq8ikWAM" />
              <p className="text-xs text-gray-400 mt-1">Find voice IDs in your ElevenLabs dashboard → Voices.</p>
            </div>
          </div>
        )}

        {ttsProvider === "generic-openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input className="input" value={settings.tts_generic_base_url || ""}
                onChange={e => set("tts_generic_base_url", e.target.value)}
                placeholder="http://localhost:8080/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input className="input" type="password" value={settings.tts_generic_api_key || ""}
                onChange={e => set("tts_generic_api_key", e.target.value)}
                placeholder="Leave blank if not required" autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
              <input className="input" value={settings.tts_generic_voice || ""}
                onChange={e => set("tts_generic_voice", e.target.value)}
                placeholder="alloy" />
            </div>
          </div>
        )}
      </div>

      {/* STT */}
      <div className="border-t border-gray-100 pt-6">
        <p className="text-sm font-semibold text-gray-700 mb-1">Speech-to-Text (STT)</p>
        <p className="text-xs text-gray-400 mb-3">Controls the microphone button in the chat input bar.</p>
        <AudioProviderPicker providers={STT_PROVIDERS} value={sttProvider} onChange={v => set("stt_provider", v)} />

        {sttProvider === "openai" && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Uses the OpenAI API key from <strong>LLM Provider</strong> settings. Audio recorded in chat is sent to Whisper for transcription.
            </div>
          </div>
        )}

        {sttProvider === "deepgram" && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Deepgram API Key</label>
            <input className="input" type="password" value={settings.stt_deepgram_key || ""}
              onChange={e => set("stt_deepgram_key", e.target.value)}
              placeholder="Your Deepgram API key" autoComplete="off" />
          </div>
        )}

        {sttProvider === "generic-openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input className="input" value={settings.stt_generic_base_url || ""}
                onChange={e => set("stt_generic_base_url", e.target.value)}
                placeholder="http://localhost:8080/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input className="input" type="password" value={settings.stt_generic_api_key || ""}
                onChange={e => set("stt_generic_api_key", e.target.value)}
                placeholder="Leave blank if not required" autoComplete="off" />
            </div>
          </div>
        )}

        {sttProvider !== "native" && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Non-native STT: click mic to start recording, click again to stop and transcribe.
          </div>
        )}
      </div>

    </div>
  );
}


const SETTINGS_TABS = [
  { id: "llm",       label: "LLM Provider" },
  { id: "embedding", label: "Embedding Provider" },
  { id: "vectordb",  label: "Vector Database" },
  { id: "splitting", label: "Chunking" },
  { id: "audio",     label: "Audio" },
];

function SettingsForm() {
  const [activeTab, setActiveTab]     = useState("llm");
  const [settings, setSettings]       = useState({});
  const [savedSettings, setSavedSettings] = useState({});
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    api.get("/settings").then(r => {
      const s = r.data.settings || {};
      setSettings(s);
      setSavedSettings(s);
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const [switchConfirm, setSwitchConfirm] = useState(null); // { lines, onConfirm }

  async function doSave() {
    setSaving(true);
    try {
      await api.put("/settings", { settings });
      const fresh = (await api.get("/settings")).data.settings || {};
      setSettings(fresh);
      setSavedSettings(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    const llmSwitching = settings.llm_provider !== savedSettings.llm_provider && savedSettings.llm_api_key === "********";
    const embSwitching = settings.embedding_provider !== savedSettings.embedding_provider && savedSettings.embedding_api_key === "********";
    if (llmSwitching || embSwitching) {
      const lines = [
        llmSwitching && { from: PROVIDERS.find(p => p.id === savedSettings.llm_provider)?.name || savedSettings.llm_provider, to: PROVIDERS.find(p => p.id === settings.llm_provider)?.name || settings.llm_provider, label: "LLM" },
        embSwitching && { from: EMBEDDING_PROVIDERS.find(p => p.id === savedSettings.embedding_provider)?.name || savedSettings.embedding_provider, to: EMBEDDING_PROVIDERS.find(p => p.id === settings.embedding_provider)?.name || settings.embedding_provider, label: "Embedding" },
      ].filter(Boolean);
      setSwitchConfirm({ lines, onConfirm: () => { setSwitchConfirm(null); doSave(); } });
      return;
    }
    doSave();
  }

  if (loading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <>
    {switchConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Switch Provider?</h3>
                <p className="text-sm text-gray-500 mt-1">The following changes will remove your existing API key and affect all workspaces immediately.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {switchConfirm.lines.map(l => (
                <div key={l.label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-16 shrink-0">{l.label}</span>
                  <span className="font-medium text-gray-700">{l.from}</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  <span className="font-semibold text-gray-900">{l.to}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button type="button" onClick={() => setSwitchConfirm(null)}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={switchConfirm.onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors">
              Yes, switch provider
            </button>
          </div>
        </div>
      </div>
    )}
    <form onSubmit={handleSave}>
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
        {SETTINGS_TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-indigo shadow-sm ring-1 ring-gray-200"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "llm"       && <LLMTab settings={settings} set={set} savedSettings={savedSettings} />}
      {activeTab === "embedding" && <EmbeddingTab settings={settings} set={set} savedSettings={savedSettings} />}
      {activeTab === "vectordb"  && <VectorDBTab settings={settings} set={set} />}
      {activeTab === "splitting" && <TextSplittingTab settings={settings} set={set} />}
      {activeTab === "audio" && <AudioTab settings={settings} set={set} />}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 mt-5">
        {saved && <span className="text-green-600 text-sm font-medium">Settings saved!</span>}
        <button type="submit" className="btn-primary px-5 py-2" disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
    </>
  );
}

// ── API Keys section ──────────────────────────────────────────────────────────

const API_SUB_TABS = [
  { id: "keys",       label: "API Keys" },
  { id: "docs",       label: "Documentation" },
  { id: "quickstart", label: "Quick Start" },
];

function ApiKeysSection() {
  const [sub, setSub] = useState("keys");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-0 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Developer API</h2>
        <p className="text-gray-500 text-sm mb-3">
          Integrate Open Enterprise into your applications via the REST API at <code className="bg-gray-100 px-1 rounded text-xs">/api/v1/</code>
        </p>
        <div className="flex">
          {API_SUB_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                sub === t.id
                  ? "border-indigo text-indigo"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {sub === "keys"       && <ApiKeysTab />}
        {sub === "docs"       && <ApiDocsTab />}
        {sub === "quickstart" && <ApiQuickStartTab />}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [keys, setKeys]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);
  const [revealed, setRevealed]     = useState(null);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: "revoke"|"delete", key }
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    try {
      const { data } = await api.get("/admin/api-keys");
      setKeys(data.keys);
    } catch { setError("Failed to load API keys"); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/admin/api-keys", { name: newName.trim() });
      setRevealed({ name: data.apiKey.name, rawKey: data.rawKey });
      setShowCreate(false);
      setNewName("");
      fetchKeys();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to create key");
    } finally { setCreating(false); }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "revoke") {
        await api.patch(`/admin/api-keys/${confirmAction.key.id}/revoke`);
        setKeys(prev => prev.map(k => k.id === confirmAction.key.id ? { ...k, revoked: true } : k));
      } else {
        await api.delete(`/admin/api-keys/${confirmAction.key.id}`);
        setKeys(prev => prev.filter(k => k.id !== confirmAction.key.id));
      }
      setConfirmAction(null);
    } catch { setError(`Failed to ${confirmAction.type} key`); }
    finally { setActionLoading(false); }
  }

  function copyKey() {
    navigator.clipboard.writeText(revealed.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Keys authenticate API requests. Generate one per application.</p>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">+ New Key</button>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError("")} />}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : keys.length === 0 ? (
        <EmptyState message="No API keys yet. Create one to start using the REST API." />
      ) : (
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-100">
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Prefix</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Used</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {keys.map(k => (
              <tr key={k.id} className="group hover:bg-gray-50 transition-colors">
                <td className="py-3 text-sm font-medium text-gray-800">{k.name}</td>
                <td className="py-3">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{k.keyPrefix}…</code>
                </td>
                <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(k.createdAt).toLocaleDateString()}
                  {k.createdBy && <span className="ml-1 text-gray-300">by {k.createdBy.name || k.createdBy.email}</span>}
                </td>
                <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                </td>
                <td className="py-3">
                  {k.revoked
                    ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />Revoked</span>
                    : <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />Active</span>
                  }
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {!k.revoked && (
                      <button onClick={() => setConfirmAction({ type: "revoke", key: k })} className="text-xs text-amber-500 hover:text-amber-700 font-medium transition-colors">
                        Revoke
                      </button>
                    )}
                    <button onClick={() => setConfirmAction({ type: "delete", key: k })} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <Modal title="Create API Key" onClose={() => { setShowCreate(false); setNewName(""); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
              <input
                className="input w-full"
                placeholder="e.g. Production App, Dev Integration"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowCreate(false); setNewName(""); }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary px-4 py-2 text-sm">
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {revealed && (
        <Modal title="API Key Created" onClose={() => setRevealed(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Copy this key now. It will <strong>not</strong> be shown again.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{revealed.name}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono break-all select-all">
                  {revealed.rawKey}
                </code>
                <button onClick={copyKey} className="shrink-0 px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors font-medium">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700 text-sm">Usage</p>
              <p>Include in the <code className="bg-gray-200 px-1 rounded">Authorization</code> header:</p>
              <code className="block bg-white border border-gray-200 rounded px-2 py-1 mt-1 break-all">
                Authorization: Bearer {revealed.rawKey}
              </code>
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={() => setRevealed(null)} className="btn-primary px-5 py-2 text-sm">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "revoke" ? "Revoke API Key" : "Delete API Key"}
          message={confirmAction.type === "revoke" ? "Revoke access for key" : "Permanently delete key"}
          detail={confirmAction.key.name}
          confirmLabel={confirmAction.type === "revoke" ? "Revoke" : "Delete"}
          variant={confirmAction.type === "revoke" ? "warning" : "danger"}
          loading={actionLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => !actionLoading && setConfirmAction(null)}
        />
      )}
    </>
  );
}

function ApiDocsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Interactive API reference. Try requests live or download the spec to import into Postman.</p>
        <a
          href="/api/v1/docs/openapi.json"
          download="openenterprise-openapi.json"
          className="btn-secondary px-4 py-2 text-sm"
        >
          Download OpenAPI JSON
        </a>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: "680px" }}>
        <iframe
          src="/api/v1/docs"
          title="Open Enterprise API Documentation"
          className="w-full h-full border-0"
        />
      </div>
      <p className="text-xs text-gray-400">
        To import into Postman: File → Import → Link → paste <code className="bg-gray-100 px-1 rounded">{window.location.origin}/api/v1/docs/openapi.json</code>
      </p>
    </div>
  );
}

function ApiQuickStartTab() {
  const [copiedBlock, setCopiedBlock] = useState(null);
  const origin = window.location.origin;

  function copy(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  }

  function CodeBlock({ id, code }) {
    return (
      <div className="relative group">
        <pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-xs overflow-x-auto leading-relaxed">{code}</pre>
        <button
          onClick={() => copy(id, code)}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copiedBlock === id ? "Copied!" : "Copy"}
        </button>
      </div>
    );
  }

  const curlList    = `curl -H "Authorization: Bearer emb_your_key" \\\n  ${origin}/api/v1/workspaces`;
  const curlChat    = `curl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "What is the refund policy?"}' \\\n  ${origin}/api/v1/workspaces/YOUR_WORKSPACE_SLUG/chat`;
  const jsExample   = `const res = await fetch("${origin}/api/v1/workspaces/YOUR_SLUG/chat", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer emb_your_key",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ message: "What is the refund policy?" })\n});\nconst { response, sources } = await res.json();\nconsole.log(response);`;
  const pyExample   = `import requests\n\nheaders = {"Authorization": "Bearer emb_your_key"}\nurl = "${origin}/api/v1/workspaces/YOUR_SLUG/chat"\n\nres = requests.post(url, headers=headers, json={"message": "What is the refund policy?"})\nprint(res.json()["response"])`;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">1. Create an API Key</h3>
        <p className="text-sm text-gray-500 mb-3">Go to the <strong>API Keys</strong> tab → click <strong>+ New Key</strong> → copy the key. It is shown only once.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          All requests need the header: <code className="font-mono bg-amber-100 px-1 rounded">Authorization: Bearer emb_your_key</code>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-1">2. List Workspaces</h3>
        <p className="text-sm text-gray-500 mb-2">Get the workspace slug you want to query.</p>
        <CodeBlock id="curl-list" code={curlList} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-1">3. Send a Message</h3>
        <p className="text-sm text-gray-500 mb-2">Ask a question grounded in the workspace documents.</p>
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">cURL</p>
          <CodeBlock id="curl-chat" code={curlChat} />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-4">JavaScript (fetch)</p>
          <CodeBlock id="js" code={jsExample} />
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-4">Python (requests)</p>
          <CodeBlock id="py" code={pyExample} />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Response shape</h3>
        <pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-xs leading-relaxed">{`{
  "response": "Employees are entitled to 20 days of annual leave...",
  "sources": [
    { "text": "Section 4.2: Annual leave entitlement is 20 days...", "metadata": { "source": "HR Policy.pdf" } }
  ],
  "usage": { "inputTokens": 1240, "outputTokens": 312, "model": "gpt-4o" }
}`}</pre>
      </div>

      <div className="bg-indigo/5 border border-indigo/20 rounded-lg px-4 py-3 text-sm text-gray-700">
        Full interactive reference with try-it-out: go to the <strong>Documentation</strong> tab.
      </div>
    </div>
  );
}

// ── Embed section ─────────────────────────────────────────────────────────────

function EmbedSection() {
  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState(null);

  useEffect(() => {
    api.get("/admin/workspaces")
      .then(({ data }) => { setWorkspaces(data.workspaces || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ws     = workspaces.find(w => w.slug === selected);
  const origin = window.location.origin;
  const embedUrl = ws ? `${origin}/embed/${ws.slug}` : "";

  const iframeSnippet = ws
    ? `<iframe\n  src="${embedUrl}"\n  width="400"\n  height="600"\n  frameborder="0"\n  style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);"\n></iframe>`
    : "";

  const jsSnippet = ws
    ? `<!-- Open Enterprise Chat Widget -->\n<script>\n(function() {\n  var iframe = document.createElement('iframe');\n  iframe.src = '${embedUrl}';\n  iframe.width = '400';\n  iframe.height = '600';\n  iframe.frameBorder = '0';\n  iframe.style.cssText = 'border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);position:fixed;bottom:24px;right:24px;z-index:9999';\n  document.body.appendChild(iframe);\n})();\n</script>`
    : "";

  function copy(id, text) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function CodeSnippet({ id, label, code }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
          <button onClick={() => copy(id, code)} className="text-xs text-indigo hover:text-indigo/80 font-medium">
            {copied === id ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Embed</h2>
        <p className="text-gray-500 text-sm mt-0.5">Add a live chat widget to any website — no login required for end users.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Workspace cards */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Select a workspace to get its embed snippet</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner /> Loading…</div>
          ) : workspaces.filter(w => w.embedEnabled).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
              <p className="text-sm text-gray-500">No workspaces have embed access enabled.</p>
              <p className="text-xs text-gray-400 mt-1">Open a workspace → Chat Settings → turn on <strong>Public Embed Access</strong>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {workspaces.filter(w => w.embedEnabled).map(w => {
                const isSelected = selected === w.slug;
                return (
                  <button
                    key={w.slug}
                    onClick={() => setSelected(isSelected ? null : w.slug)}
                    className={`text-left rounded-xl border-2 px-4 py-3 transition-all ${
                      isSelected
                        ? "border-indigo bg-indigo/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 text-xs font-bold ${
                      isSelected ? "bg-indigo text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {w.name[0].toUpperCase()}
                    </div>
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-indigo" : "text-gray-800"}`}>{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{w._count?.documents ?? w.documents ?? 0} docs</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {ws && (
          <>
            {/* Preview link */}
            <div className="flex items-center gap-3 bg-indigo/5 border border-indigo/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-indigo shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm text-gray-600 truncate flex-1">{embedUrl}</span>
              <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo hover:underline font-medium shrink-0">
                Preview →
              </a>
            </div>

            <CodeSnippet id="iframe" label="iframe (recommended)" code={iframeSnippet} />
            <CodeSnippet id="js" label="Floating widget (bottom-right)" code={jsSnippet} />

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Notes</p>
              <p>• No login required — users chat anonymously.</p>
              <p>• Answers are grounded only in this workspace's documents.</p>
              <p>• Adjust <code className="bg-gray-200 px-1 rounded">width</code> and <code className="bg-gray-200 px-1 rounded">height</code> on the iframe to fit your layout.</p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ── Agents Section ────────────────────────────────────────────────────────────

function AgentsSection({ onRunComplete }) {
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editAgent, setEditAgent] = useState(null);
  const [editYaml, setEditYaml]   = useState("");
  const [running, setRunning]     = useState(null);

  const filteredAgents = search.trim()
    ? agents.filter(a => {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q)
          || (a.workspace?.name || "").toLowerCase().includes(q)
          || (a.triggerType || "").toLowerCase().includes(q)
          || (a.description || "").toLowerCase().includes(q);
      })
    : agents;

  useEffect(() => {
    api.get("/admin/agents")
      .then(r => setAgents(r.data.agents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openEdit(a) {
    setEditAgent(a);
    setEditYaml("Loading…");
    try {
      const { data } = await api.get(`/workspaces/${a.workspace.slug}/agents/${a.id}/export`);
      setEditYaml(agentToYaml(data));
    } catch { setEditYaml("Failed to load YAML"); }
  }


  async function downloadYaml(a) {
    try {
      const { data } = await api.get(`/workspaces/${a.workspace.slug}/agents/${a.id}/export`);
      const yaml = agentToYaml(data);
      const blob = new Blob([yaml], { type: "text/yaml" });
      const url  = URL.createObjectURL(blob);
      const el   = document.createElement("a");
      el.href    = url;
      el.download = `${a.name.toLowerCase().replace(/\s+/g, "-")}.yaml`;
      el.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }

  async function handleRun(a) {
    setRunning(a.id);
    try {
      await api.post(`/workspaces/${a.workspace.slug}/agents/${a.id}/run`, { input: "" });
      onRunComplete?.();
    } catch {}
    setRunning(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await api.delete(`/admin/agents/${confirmDelete.id}`);
      setAgents(a => a.filter(x => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {}
    setDeleting(null);
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleDateString() : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agents</h2>
          <p className="text-sm text-gray-400 mt-0.5">{filteredAgents.length}{search.trim() ? ` of ${agents.length}` : ""} agents across every workspace</p>
        </div>
        <div className="relative w-64">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="input pl-8 py-1.5 text-sm w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : agents.length === 0 ? (
        <EmptyState message="No agents found. Create agents from workspace settings." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {["Agent", "Workspace", "Trigger", "Runs", "Created By", "Created", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAgents.map(a => (
                <tr key={a.id} className="group hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    {a.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{a.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.workspace?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{a.triggerType}</span>
                    {a.cronExpression && <span className="ml-1 text-xs text-gray-400 font-mono">{a.cronExpression}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a._count?.runs ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{a.createdBy ? (a.createdBy.name || a.createdBy.email) : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRun(a)} title="Run" disabled={running === a.id}
                        className="px-2 py-0.5 rounded text-xs font-bold text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40">
                        {running === a.id ? "⟳" : "▶"}
                      </button>
                      <button onClick={() => openEdit(a)} title="View YAML"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => downloadYaml(a)} title="Download YAML"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      <button onClick={() => setConfirmDelete(a)} title="Delete" disabled={deleting === a.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Agent"
          message="Delete agent"
          detail={confirmDelete.name}
          confirmLabel="Delete"
          variant="danger"
          loading={!!deleting}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setConfirmDelete(null)}
        />
      )}

      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditAgent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{editAgent.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editAgent.workspace?.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigator.clipboard.writeText(editYaml)} title="Copy YAML" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => setEditAgent(null)} title="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              <pre className="bg-gray-950 text-green-400 rounded-xl p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap">{editYaml}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent Runs Section ────────────────────────────────────────────────────────

function CopyButton({ text, label = "copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className={className}
    >
      {copied ? "✓ copied!" : label}
    </button>
  );
}

function AgentRunsSection() {
  const [runs, setRuns]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("all");
  const [fetchErr, setFetchErr] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { setPage(1); }, [period]);

  function fetchRuns(p, pg) {
    setLoading(true);
    setFetchErr("");
    api.get(`/admin/agent-runs?period=${p}&page=${pg}&limit=${PAGE_SIZE}`)
      .then(r => { setRuns(r.data.runs || []); setTotal(r.data.total || 0); })
      .catch(e => setFetchErr(e?.response?.data?.error || e.message || "Failed to load runs"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRuns(period, page); }, [period, page]);

  const PERIODS = [{ id: "7d", label: "Last 7 days" }, { id: "30d", label: "Last 30 days" }, { id: "all", label: "All time" }];

  const statusBadge = (status) => {
    const s = {
      success: { bg: "bg-green-100 text-green-700", dot: "bg-green-500" },
      error:   { bg: "bg-red-100 text-red-600",     dot: "bg-red-500"   },
      running: { bg: "bg-blue-100 text-blue-600",   dot: "bg-blue-500"  },
    };
    const style = s[status] || { bg: "bg-gray-100 text-gray-500", dot: "bg-gray-400" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        {status}
      </span>
    );
  };

  const fmt = (dt) => dt ? new Date(dt).toLocaleString() : "—";
  const duration = (r) => {
    if (!r.completedAt) return "—";
    const ms = new Date(r.completedAt) - new Date(r.startedAt);
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const triggeredByLabel = (r) => r.triggeredBy ? (r.triggeredBy.name || r.triggeredBy.email) : r.triggerType === "scheduled" ? "Scheduler" : r.triggerType === "chained" ? "Chained" : "—";

  const exportRunsCSV = () => {
    const headers = ["Agent", "Workspace", "Status", "Trigger", "Triggered By", "Started", "Duration", "Output", "Error"];
    const rows = runs.map(r => [
      r.agent?.name || "", r.agent?.workspace?.name || "", r.status, r.triggerType,
      triggeredByLabel(r), fmt(r.startedAt), duration(r), r.output || "", r.error || ""
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `agent-runs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const exportRunsMD = () => {
    const lines = [`# Agent Runs Report`, `*Generated: ${new Date().toLocaleString()} — ${total} runs total*`, ""];
    runs.forEach((r, i) => {
      lines.push(`## ${i + 1}. ${r.agent?.name || "—"}`);
      lines.push(`- **Workspace:** ${r.agent?.workspace?.name || "—"}`);
      lines.push(`- **Status:** ${r.status}`);
      lines.push(`- **Trigger:** ${r.triggerType} · Triggered by: ${triggeredByLabel(r)}`);
      lines.push(`- **Started:** ${fmt(r.startedAt)} · Duration: ${duration(r)}`);
      if (r.output) { lines.push("", "**Output:**", "```", r.output, "```"); }
      if (r.error)  { lines.push("", "**Error:**", "```", r.error, "```"); }
      lines.push("", "---", "");
    });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
    a.download = `agent-runs-${new Date().toISOString().slice(0,10)}.md`; a.click();
  };

  const exportRunsPDF = () => {
    const escape = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const blocks = runs.map((r, i) => `
      <div class="run">
        <h2>${i+1}. ${escape(r.agent?.name)}</h2>
        <div class="meta">
          <span>${escape(r.agent?.workspace?.name||"—")}</span> ·
          <span class="status ${r.status}">${escape(r.status)}</span> ·
          <span>${escape(r.triggerType)}</span> · by <span>${escape(triggeredByLabel(r))}</span> ·
          <span>${escape(fmt(r.startedAt))}</span> · <span>${escape(duration(r))}</span>
        </div>
        ${r.output ? `<pre>${escape(r.output)}</pre>` : ""}
        ${r.error  ? `<pre class="error">${escape(r.error)}</pre>` : ""}
      </div>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Agent Runs Report</title><style>
      body{font-family:system-ui,sans-serif;font-size:13px;padding:32px;color:#111;max-width:900px;margin:auto}
      h1{font-size:20px;margin-bottom:4px} .sub{color:#888;font-size:12px;margin-bottom:24px}
      .run{margin-bottom:28px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
      h2{font-size:14px;font-weight:600;margin:0;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb}
      .meta{padding:8px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6}
      .status{font-weight:600} .status.success{color:#15803d} .status.error{color:#dc2626}
      pre{margin:0;padding:12px 14px;font-size:11px;white-space:pre-wrap;word-break:break-word;background:#fff;font-family:monospace}
      pre.error{background:#fef2f2;color:#dc2626}
      @media print{.run{page-break-inside:avoid}}
    </style></head><body>
      <h1>Agent Runs Report</h1>
      <p class="sub">Generated: ${new Date().toLocaleString()} · ${total} runs total</p>
      ${blocks}
    </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Runs</h2>
          <p className="text-sm text-gray-400 mt-0.5">{total > 0 ? `${total} run${total !== 1 ? "s" : ""} total` : "All agent run history across every workspace"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === p.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => fetchRuns(period, page)} className="text-xs text-indigo hover:text-indigo/80 font-medium px-2">↻</button>
          {runs.length > 0 && (
            <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={exportRunsCSV} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">.csv</button>
              <button onClick={exportRunsMD}  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.md</button>
              <button onClick={exportRunsPDF} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.pdf</button>
            </div>
          )}
        </div>
      </div>

      {fetchErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{fetchErr}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : runs.length === 0 ? (
        <EmptyState message="No agent runs found for this period." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {["Agent", "Workspace", "Status", "Trigger", "Triggered By", "Started", "Duration", "Logs"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.agent?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{r.agent?.workspace?.name || "—"}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.triggerType}</td>
                    <td className="px-4 py-3 text-gray-500">{triggeredByLabel(r)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(r.startedAt)}</td>
                    <td className="px-4 py-3 text-gray-500">{duration(r)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${expanded === r.id ? "bg-indigo text-white border-indigo" : "bg-white text-indigo border-indigo/40 hover:border-indigo"}`}
                      >
                        {expanded === r.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        {r.output && (
                          <>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">{r.output}</pre>
                            <div className="flex gap-3 mt-2">
                              <button onClick={() => { const csv = `"Agent","Status","Started","Duration","Output"\n"${r.agent?.name||""}","${r.status}","${fmt(r.startedAt)}","${duration(r)}","${(r.output||"").replace(/"/g,'""')}"`; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"})); a.download = exportFilename(r.agent?.name, r.startedAt)+".csv"; a.click(); }} className="text-xs text-indigo hover:underline font-medium">.csv</button>
                              <button onClick={() => exportMD(r.output, exportFilename(r.agent?.name, r.startedAt))} className="text-xs text-indigo hover:underline font-medium">.md</button>
                              <button onClick={() => exportPDF(r.output, exportFilename(r.agent?.name, r.startedAt))} className="text-xs text-indigo hover:underline font-medium">.pdf</button>
                              <CopyButton text={r.output} label="copy" className="text-xs text-indigo hover:underline font-medium" />
                            </div>
                          </>
                        )}
                        {r.error && (
                          <pre className={`text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto ${r.output ? "mt-2" : ""}`}>{r.error}</pre>
                        )}
                        {!r.output && !r.error && (
                          <p className="text-xs text-gray-400 italic">No output recorded.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
