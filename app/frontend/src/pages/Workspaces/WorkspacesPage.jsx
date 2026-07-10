import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const [drawerWsId, setDrawerWsId]   = useState(null);

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
              <div key={ws.id} className="cursor-pointer bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-indigo/30 hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate(`/workspace/${ws.slug}`)}>
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
                    <span key={s.label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.v} {s.label}</span>
                  ))}
                </div>
                <div className="px-4 pt-2 pb-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{ws.createdBy ? (ws.createdBy.name || ws.createdBy.email) : ""}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(ws.createdAt).toLocaleDateString()}</span>
                    {user?.role === "admin" && (
                      <Link to={`/chats?ws=${ws.id}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-indigo transition-colors p-0.5 rounded" title="Chat history">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                        </svg>
                      </Link>
                    )}
                    <button onClick={e => { e.stopPropagation(); setDrawerWsId(ws.id); }} className="text-gray-400 hover:text-indigo transition-colors p-0.5 rounded" title="Workspace settings">
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
        <WorkspaceDrawer workspaceId={drawerWsId} isAdmin={user?.role === "admin"} onClose={() => setDrawerWsId(null)} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
