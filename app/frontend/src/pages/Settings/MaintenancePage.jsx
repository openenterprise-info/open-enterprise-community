import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

export default function MaintenancePage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [workspaces, setWorkspaces]         = useState([]);
  const [selWs, setSelWs]                   = useState("all");
  const [purging, setPurging]               = useState(null);
  const [confirm, setConfirm]               = useState(null);
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [result, setResult]                 = useState(null);
  const [confirmBuilder, setConfirmBuilder] = useState(false);
  const [builderResult, setBuilderResult]   = useState(null);

  useEffect(() => {
    api.get("/admin/workspaces").then(r => setWorkspaces(r.data.workspaces || []));
  }, []);

  const PURGE_TYPES = [
    { id: "chats",        label: "Chat History",    desc: "All chat messages in threads"                          },
    { id: "agent-runs",   label: "Agent Runs",      desc: "All agent run logs and outputs"                        },
    { id: "agent-memory", label: "Agent Memory",    desc: "Clears run outputs used as memory (keeps run history)" },
    { id: "threads",        label: "Threads",         desc: "All threads (and their chat history)"                  },
    { id: "dlp-violations", label: "DLP Violations",  desc: "All recorded DLP policy violation logs"                 },
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

      {/* ── Client-side purges ── */}
      <h3 className="text-sm font-semibold text-gray-700 mt-8 mb-3">Browser Data</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-gray-200 bg-white">
          <div>
            <p className="text-sm font-semibold text-gray-800">Agent Builder Conversations</p>
            <p className="text-xs text-gray-500 mt-0.5">Clears all locally stored Agent Builder chat history</p>
          </div>
          {builderResult && (
            <span className="text-xs text-green-600 font-medium mr-3">{builderResult}</span>
          )}
          {confirmBuilder ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  localStorage.removeItem("oe_agent_builder_convos");
                  localStorage.removeItem("oe_agent_builder_active");
                  setBuilderResult("Cleared ✓");
                  setConfirmBuilder(false);
                  setTimeout(() => setBuilderResult(null), 3000);
                }}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmBuilder(false)}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setConfirmBuilder(true); setBuilderResult(null); }}
              className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              Purge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
