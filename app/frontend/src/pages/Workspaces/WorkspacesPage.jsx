import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import WorkspaceDrawer from "../../components/WorkspaceDrawer";
import { Spinner, EmptyState, ErrorBanner } from "../../components/ui";

export default function WorkspacesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [newName, setNewName]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [connectorsWsId, setConnectorsWsId] = useState(null);
  const [agentsWsId, setAgentsWsId]         = useState(null);

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

  function handleDeleted(id) { setWorkspaces(w => w.filter(ws => ws.id !== id)); }
  function handleUpdated(updated) { setWorkspaces(w => w.map(ws => ws.id === updated.id ? { ...ws, ...updated } : ws)); }

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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces…" className="input pl-8 py-1.5 text-sm w-full" />
          </div>
          {user?.role !== "user" && (showCreate ? (
            <form onSubmit={createWorkspace} className="flex items-center gap-2">
              <input className="input py-1.5 text-sm w-52" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Workspace name…" autoFocus />
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={creating}>{creating ? "…" : "Create"}</button>
              <button type="button" onClick={() => { setShowCreate(false); setNewName(""); }} className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
            </form>
          ) : (
            <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">+ New Workspace</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : workspaces.length === 0 ? (
          <EmptyState message="No workspaces yet." action={user?.role !== "user" ? () => setShowCreate(true) : undefined} actionLabel="Create your first workspace →" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredWorkspaces.map((ws) => (
              <div key={ws.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo/30 transition-all duration-200 flex flex-col">

                {/* Header */}
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo flex items-center justify-center text-base font-bold text-white shrink-0">
                    {ws.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">{ws.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{ws.slug}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="px-4 pt-3 pb-3 flex flex-wrap gap-1.5">
                  {[
                    { v: ws._count.documents,       label: "docs"        },
                    { v: ws._count.chats,           label: "chats"       },
                    { v: ws._count.users,           label: "members"     },
                    { v: ws._count.agents ?? 0,     label: "agents"      },
                    { v: ws._count.connectors ?? 0, label: "connections" },
                  ].map(s => (
                    <span key={s.label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.v} {s.label}</span>
                  ))}
                </div>

                {/* 3 action sections */}
                <div className="mt-auto border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
                  <button
                    onClick={() => navigate(`/workspace/${ws.slug}`)}
                    className="flex flex-col items-center gap-1 py-3 text-gray-500 hover:bg-indigo/5 hover:text-indigo transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Chat</span>
                  </button>
                  <button
                    onClick={() => setConnectorsWsId(ws.id)}
                    className="flex flex-col items-center gap-1 py-3 text-gray-500 hover:bg-indigo/5 hover:text-indigo transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-[10px] font-semibold">Connectors</span>
                  </button>
                  <button
                    onClick={() => setAgentsWsId(ws.id)}
                    className="flex flex-col items-center gap-1 py-3 text-gray-500 hover:bg-indigo/5 hover:text-indigo transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Agents</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {connectorsWsId && (
        <WorkspaceDrawer workspaceId={connectorsWsId} mode="connectors" isAdmin={user?.role === "admin"} onClose={() => setConnectorsWsId(null)} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      )}
      {agentsWsId && (
        <WorkspaceDrawer workspaceId={agentsWsId} mode="agents" isAdmin={user?.role === "admin"} onClose={() => setAgentsWsId(null)} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
