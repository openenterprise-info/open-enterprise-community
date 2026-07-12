import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { exportMD, exportPDF, exportFilename } from "../../utils/exportOutput";
import { Spinner } from "../../components/ui";

const PERIODS = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function statusBadge(status) {
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
}

export default function WorkspaceRunLogsPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [runs, setRuns]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [period, setPeriod]       = useState("all");
  const [clearing, setClearing]   = useState(false);

  function fetchRuns(p) {
    setLoading(true);
    const q = p !== "all" ? `?period=${p}` : "";
    api.get(`/workspaces/${slug}/agent-runs${q}`)
      .then(r => setRuns(r.data.runs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!slug) return;
    api.get(`/workspaces/${slug}`).then(r => setWorkspace(r.data.workspace)).catch(() => {});
    fetchRuns("all");
  }, [slug]);

  useEffect(() => { if (slug) fetchRuns(period); }, [period]);

  async function clearRuns() {
    setClearing(true);
    try {
      await api.delete(`/workspaces/${slug}/agent-runs`);
      setRuns([]);
      setExpanded(null);
    } catch { /* ignore */ }
    finally { setClearing(false); }
  }

  const fmt = (dt) => dt ? new Date(dt).toLocaleString() : "—";
  const duration = (r) => {
    if (!r.completedAt) return "—";
    const ms = new Date(r.completedAt) - new Date(r.startedAt);
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/workspace/${slug}/agents`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors">
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Run Logs</h2>
                <p className="text-sm text-gray-400 mt-0.5">{runs.length > 0 ? `${runs.length} run${runs.length !== 1 ? "s" : ""}` : "Agent run history for this workspace"}</p>
              </div>
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
              <button onClick={() => fetchRuns(period)} className="text-xs text-indigo hover:text-indigo/80 font-medium px-2">↻</button>
              {runs.length > 0 && (
                <button onClick={clearRuns} disabled={clearing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                  {clearing
                    ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  }
                  Clear
                </button>
              )}
              {runs.length > 0 && (
                <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => {
                    const headers = ["Agent", "Status", "Trigger", "Triggered By", "Started", "Duration", "Output", "Error"];
                    const rows = runs.map(r => [r.agent?.name || "", r.status, r.triggerType, r.triggeredBy ? (r.triggeredBy.name || r.triggeredBy.email) : "", fmt(r.startedAt), duration(r), r.output || "", r.error || ""]);
                    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
                    a.download = `run-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
                  }} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">.csv</button>
                  <button onClick={() => {
                    const lines = [`# Run Logs`, `*Generated: ${new Date().toLocaleString()} — ${runs.length} runs*`, ""];
                    runs.forEach((r, i) => {
                      lines.push(`## ${i+1}. ${r.agent?.name || "—"}`);
                      lines.push(`- **Status:** ${r.status} · **Trigger:** ${r.triggerType} · **Started:** ${fmt(r.startedAt)} · **Duration:** ${duration(r)}`);
                      if (r.output) lines.push("", "```", r.output, "```");
                      lines.push("", "---", "");
                    });
                    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
                    a.download = `run-logs-${new Date().toISOString().slice(0,10)}.md`; a.click();
                  }} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.md</button>
                  <button onClick={() => {
                    const escape = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                    const blocks = runs.map((r,i) => `<div class="run"><h2>${i+1}. ${escape(r.agent?.name)}</h2><div class="meta"><span class="status ${r.status}">${escape(r.status)}</span> · ${escape(r.triggerType)} · ${escape(fmt(r.startedAt))} · ${escape(duration(r))}</div>${r.output ? `<pre>${escape(r.output)}</pre>` : ""}${r.error ? `<pre class="error">${escape(r.error)}</pre>` : ""}</div>`).join("");
                    const w = window.open("","_blank");
                    w.document.write(`<html><head><title>Run Logs</title><style>body{font-family:system-ui,sans-serif;font-size:13px;padding:32px;max-width:900px;margin:auto}.run{margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}h2{font-size:14px;font-weight:600;margin:0;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb}.meta{padding:8px 14px;font-size:12px;color:#6b7280}.status{font-weight:600}.status.success{color:#15803d}.status.error{color:#dc2626}pre{margin:0;padding:12px 14px;font-size:11px;white-space:pre-wrap;word-break:break-word;font-family:monospace}pre.error{background:#fef2f2;color:#dc2626}@media print{.run{page-break-inside:avoid}}</style></head><body><h1>Run Logs</h1><p style="color:#888;font-size:12px">Generated: ${new Date().toLocaleString()} · ${runs.length} runs</p>${blocks}</body></html>`);
                    w.document.close(); w.print();
                  }} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.pdf</button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No runs yet</p>
              <p className="text-xs text-gray-400">Agent runs for this workspace will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Agent", "Status", "Trigger", "Triggered By", "Started", "Duration", "Logs"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runs.map(r => (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.agent?.name || "—"}</td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{r.triggerType}</td>
                        <td className="px-4 py-3 text-gray-500">{r.triggeredBy ? (r.triggeredBy.name || r.triggeredBy.email) : "—"}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(r.startedAt)}</td>
                        <td className="px-4 py-3 text-gray-500">{duration(r)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${expanded === r.id ? "bg-indigo text-white border-indigo" : "bg-white text-indigo border-indigo/40 hover:border-indigo"}`}>
                            {expanded === r.id ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-6 py-4">
                            {r.output && <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">{r.output}</pre>}
                            {r.error && <pre className={`text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto ${r.output ? "mt-2" : ""}`}>{r.error}</pre>}
                            {!r.output && !r.error && <p className="text-xs text-gray-400 italic">No output recorded.</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
