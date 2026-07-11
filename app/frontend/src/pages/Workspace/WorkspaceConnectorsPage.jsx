import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { EnterpriseConnectorsPanel } from "../../components/ConnectorsPanel";

const ALL_TYPES = [
  { id: "postgresql",    label: "PostgreSQL",       color: "bg-blue-600",    initial: "PG",  cat: "Database" },
  { id: "mysql",         label: "MySQL",            color: "bg-orange-500",  initial: "MY",  cat: "Database" },
  { id: "mssql",         label: "MSSQL",            color: "bg-red-700",     initial: "MS",  cat: "Database" },
  { id: "oracle",        label: "Oracle",           color: "bg-red-600",     initial: "OR",  cat: "Database" },
  { id: "mongodb",       label: "MongoDB",          color: "bg-green-600",   initial: "MG",  cat: "Database" },
  { id: "redis",         label: "Redis",            color: "bg-red-600",     initial: "RD",  cat: "Database" },
  { id: "sqlite",        label: "SQLite",           color: "bg-blue-400",    initial: "SL",  cat: "Database" },
  { id: "snowflake",     label: "Snowflake",        color: "bg-cyan-500",    initial: "SF",  cat: "Database" },
  { id: "bigquery",      label: "BigQuery",         color: "bg-blue-500",    initial: "BQ",  cat: "Database" },
  { id: "cockroachdb",   label: "CockroachDB",      color: "bg-purple-600",  initial: "CR",  cat: "Database" },
  { id: "elasticsearch", label: "Elasticsearch",    color: "bg-yellow-500",  initial: "ES",  cat: "Database" },
  { id: "gmail",         label: "Gmail",            color: "bg-red-500",     initial: "G",   cat: "Integration" },
  { id: "gdrive",        label: "Google Drive",     color: "bg-yellow-500",  initial: "GD",  cat: "Integration" },
  { id: "rest-api",      label: "REST API",         color: "bg-purple-600",  initial: "R",   cat: "Integration" },
  { id: "slack",         label: "Slack",            color: "bg-purple-500",  initial: "SL",  cat: "Integration" },
  { id: "github",        label: "GitHub",           color: "bg-gray-900",    initial: "GH",  cat: "Integration" },
  { id: "jira",          label: "Jira",             color: "bg-indigo-500",  initial: "J",   cat: "Integration" },
  { id: "confluence",    label: "Confluence",       color: "bg-blue-500",    initial: "CF",  cat: "Integration" },
  { id: "notion",        label: "Notion",           color: "bg-gray-800",    initial: "N",   cat: "Integration" },
  { id: "hubspot",       label: "HubSpot",          color: "bg-orange-600",  initial: "H",   cat: "Integration" },
  { id: "freshdesk",     label: "Freshdesk",        color: "bg-green-500",   initial: "F",   cat: "Integration" },
  { id: "zendesk",       label: "Zendesk",          color: "bg-emerald-600", initial: "Z",   cat: "Integration" },
  { id: "zoho-mail",     label: "Zoho Mail",        color: "bg-red-600",     initial: "ZM",  cat: "Integration" },
  { id: "ssh",           label: "SSH",              color: "bg-gray-800",    initial: "SSH", cat: "Integration" },
  { id: "onedrive",      label: "OneDrive",         color: "bg-blue-600",    initial: "OD",  cat: "Integration" },
  { id: "dropbox",       label: "Dropbox",          color: "bg-blue-500",    initial: "DB",  cat: "Integration" },
  { id: "box",           label: "Box",              color: "bg-blue-700",    initial: "BX",  cat: "Integration" },
  { id: "teams",         label: "Microsoft Teams",  color: "bg-violet-700",  initial: "MT",  cat: "Integration" },
  { id: "outlook",       label: "Outlook",          color: "bg-blue-600",    initial: "OL",  cat: "Integration" },
  { id: "sharepoint",    label: "SharePoint",       color: "bg-blue-700",    initial: "SP",  cat: "Integration" },
  { id: "salesforce",    label: "Salesforce",       color: "bg-sky-500",     initial: "SF",  cat: "Integration" },
  { id: "zoho-crm",      label: "Zoho CRM",         color: "bg-red-600",     initial: "ZC",  cat: "Integration" },
  { id: "bullhorn",      label: "Bullhorn",         color: "bg-orange-500",  initial: "BH",  cat: "Integration" },
];

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

export default function WorkspaceConnectorsPage() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [workspace,   setWorkspace]   = useState(null);
  const [connectors,  setConnectors]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [showPanel,   setShowPanel]   = useState(false);
  const [panelType,   setPanelType]   = useState(null);
  const [panelEditConnector, setPanelEditConnector] = useState(null);
  const [testing,     setTesting]     = useState(null);
  const [testResult,  setTestResult]  = useState({});
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [deleting,    setDeleting]    = useState(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/workspaces/${slug}`)
      .then(r => setWorkspace(r.data.workspace))
      .catch(() => setError("Workspace not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const loadConnectors = useCallback(() => {
    if (!workspace?.id) return;
    api.get(`/admin/workspaces/${workspace.id}/connectors`)
      .then(r => setConnectors(r.data.connectors || []))
      .catch(() => {});
  }, [workspace?.id]);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  async function handleTest(c) {
    setTesting(c.id);
    setTestResult(r => ({ ...r, [c.id]: null }));
    try {
      const { data } = await api.post(`/admin/workspaces/${workspace.id}/connectors/${c.id}/test`);
      setTestResult(r => ({ ...r, [c.id]: data }));
    } catch {
      setTestResult(r => ({ ...r, [c.id]: { success: false, message: "Test failed" } }));
    } finally { setTesting(null); }
  }

  async function handleDelete(c) {
    setDeleting(c.id);
    try {
      await api.delete(`/admin/workspaces/${workspace.id}/connectors/${c.id}`);
      setConnectors(cs => cs.filter(x => x.id !== c.id));
      setTestResult(r => { const n = { ...r }; delete n[c.id]; return n; });
    } catch { } finally { setDeleting(null); setConfirmDel(null); }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Spinner />
    </div>
  );

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={() => navigate("/workspaces")} className="btn-primary px-4 py-2 text-sm">Back to Workspaces</button>
      </div>
    </div>
  );

  const canManage = user?.role === "admin" || user?.role === "manager";
  const activeConnectors = connectors;
  const filtered = ALL_TYPES.filter(t =>
    !search.trim() || t.label.toLowerCase().includes(search.toLowerCase()) || t.cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* ── Left sidebar ── */}
      <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-gray-200">
          <button onClick={() => navigate("/workspaces")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-100">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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
          <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm bg-indigo/10 text-indigo font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connectors
          </button>
          <button onClick={() => navigate(`/workspace/${slug}/agents`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Agents
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Row 1: Header */}
        <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Connectors</h1>
              <p className="text-sm text-gray-400 mt-0.5">Databases and integrations connected to this workspace</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Row 2: Active Connections */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Active Connections</span>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">{activeConnectors.length}</span>
            </div>
            {activeConnectors.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl py-8 text-center">
                <p className="text-sm text-gray-400">No connectors yet — click <strong>Add Connector</strong> to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {activeConnectors.map(c => {
                  const meta = ALL_TYPES.find(t => t.id === c.type);
                  const tr   = testResult[c.id];
                  return (
                    <div key={c.id} className="border border-green-200 rounded-xl bg-white overflow-hidden flex flex-col">
                      {/* Body */}
                      <div className="px-3 pt-3 pb-2 flex items-start gap-2.5 flex-1">
                        <div className={`w-7 h-7 rounded-lg ${meta?.color || "bg-gray-500"} flex items-center justify-center shrink-0`}>
                          <span className="text-white text-[9px] font-bold">{meta?.initial || c.type.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                          {c.slug && <p className="text-[10px] font-mono text-indigo truncate">@{c.slug}</p>}
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1" />
                      </div>

                      {/* Test result */}
                      {tr && (
                        <div className={`mx-3 mb-1 px-2 py-1 rounded-lg text-[10px] font-medium ${tr.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {tr.success ? "✓" : "✗"} {tr.message || (tr.success ? "Connected" : "Failed")}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="px-3 pb-2.5 pt-1 border-t border-gray-100 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {/* Test */}
                        <button onClick={() => handleTest(c)} disabled={testing === c.id} title="Test connection"
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-gray-500 hover:text-indigo hover:bg-indigo/5 transition-colors disabled:opacity-40">
                          {testing === c.id
                            ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                          Test
                        </button>
                        {/* Edit */}
                        <button onClick={() => { setPanelType(null); setPanelEditConnector(c); setShowPanel(true); }} title="Edit connection"
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-gray-500 hover:text-indigo hover:bg-indigo/5 transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          Edit
                        </button>
                        {/* Delete */}
                        <button onClick={() => setConfirmDel(c)} title="Delete connection"
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Search */}
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search connectors…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo/20 focus:border-indigo transition-colors"
            />
          </div>

          {/* Row 4: All Connector Type Cards */}
          <div className="grid grid-cols-6 gap-2">
            {filtered.map(t => {
              const connected = connectors.filter(c => c.type === t.id);
              const isConnected = connected.length > 0;
              return (
                <div key={t.id}
                  className={`border rounded-xl bg-white overflow-hidden flex flex-col h-28 transition-all duration-150 ${isConnected ? "border-green-200 hover:shadow-sm" : "border-gray-200 hover:border-indigo/30 hover:shadow-sm"}`}>
                  <div className="px-3 pt-3 pb-2 flex items-start gap-2.5 flex-1">
                    <div className={`w-7 h-7 rounded-lg ${t.color} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-[9px] font-bold">{t.initial}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{t.label}</p>
                    </div>
                    {isConnected && <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1" />}
                  </div>
                  <div className="px-3 pb-3 flex justify-start">
                    {canManage && (
                      <button onClick={() => { setPanelEditConnector(null); setPanelType(t.id); setShowPanel(true); }}
                        className="w-1/2 py-1.5 text-xs font-semibold text-white bg-indigo rounded-lg hover:bg-indigo/90 transition-colors">
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Delete Connector</h3>
            <p className="text-xs text-gray-500 mb-4">Remove <strong>{confirmDel.name}</strong> from this workspace?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDel)} disabled={deleting === confirmDel.id}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleting === confirmDel.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Connector Panel ── */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowPanel(false); setPanelType(null); setPanelEditConnector(null); loadConnectors(); }} />
          <div className="w-[520px] bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                {panelEditConnector ? (
                  <>
                    <h2 className="text-sm font-bold text-gray-900">Edit — {panelEditConnector.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Update connection details</p>
                  </>
                ) : panelType ? (
                  <>
                    <h2 className="text-sm font-bold text-gray-900">Connect {ALL_TYPES.find(t => t.id === panelType)?.label || panelType}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Enter your connection details below</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-bold text-gray-900">Add Connector</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Connect a database or integration</p>
                  </>
                )}
              </div>
              <button onClick={() => { setShowPanel(false); setPanelType(null); setPanelEditConnector(null); loadConnectors(); }} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EnterpriseConnectorsPanel
                workspaceId={workspace?.id}
                workspaceSlug={slug}
                onIngestionStarted={() => {}}
                section="both"
                focusType={panelType}
                focusEditConnector={panelEditConnector}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
