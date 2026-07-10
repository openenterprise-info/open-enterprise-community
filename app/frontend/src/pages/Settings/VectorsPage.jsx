import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Spinner, EmptyState, ErrorBanner } from "../../components/ui";

export default function VectorsPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [tables, setTables]       = useState([]);
  const [allWs, setAllWs]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [confirmDrop, setConfirmDrop] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [assignTarget, setAssignTarget] = useState("");
  const [assignBusy, setAssignBusy]     = useState(false);
  const [error, setError]         = useState("");

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
      await api.post(`/admin/vectors/${name}/assign`, { targetWorkspaceSlug: assignTarget });
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
          <button onClick={fetchTables} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg transition-colors">Refresh</button>
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
                        <select value={assignTarget} onChange={e => setAssignTarget(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo/30 bg-white">
                          <option value="">Pick workspace…</option>
                          {allWs.map(w => <option key={w.id} value={w.slug}>{w.name}</option>)}
                        </select>
                        <button onClick={() => assignTable(tbl.name)} disabled={!assignTarget || assignBusy}
                          className="text-xs px-2.5 py-1.5 bg-indigo text-white rounded-lg hover:bg-indigo/90 font-medium disabled:opacity-40 transition-colors">
                          {assignBusy ? "Moving…" : "Assign"}
                        </button>
                        <button onClick={() => { setAssigning(null); setAssignTarget(""); }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Orphaned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tbl.shares.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {tbl.shares.map(s => (
                          <span key={s.id} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{s.targetWorkspace.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!tbl.workspace && assigning !== tbl.name && (
                        <button onClick={() => { setAssigning(tbl.name); setAssignTarget(""); }}
                          className="text-xs px-3 py-1.5 border border-indigo/30 text-indigo rounded-lg hover:bg-indigo/5 font-medium transition-colors">
                          Assign
                        </button>
                      )}
                      <button onClick={() => { setConfirmDrop(tbl.name); setAssigning(null); }}
                        className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 font-medium transition-colors">
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
          title="Drop Vector Table" message="Permanently delete vector table" detail={confirmDrop}
          confirmLabel="Drop" variant="danger" loading={deleting}
          onConfirm={dropTable} onCancel={() => !deleting && setConfirmDrop(null)} />
      )}
    </div>
  );
}
