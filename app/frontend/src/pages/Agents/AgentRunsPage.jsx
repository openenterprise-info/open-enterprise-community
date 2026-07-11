import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import { exportMD, exportPDF, exportFilename } from "../../utils/exportOutput";
import { Spinner, EmptyState } from "../../components/ui";

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
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
        <span className="px-3 py-1 text-xs font-medium">Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="px-2.5 py-1 rounded-md border border-gray-200 text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
      </div>
    </div>
  );
}

function CopyButton({ text, label = "copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className={className}>
      {copied ? "✓ copied!" : label}
    </button>
  );
}

export default function AgentRunsPage() {
  const [runs, setRuns]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("all");
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
    const rows = runs.map(r => [r.agent?.name || "", r.agent?.workspace?.name || "", r.status, r.triggerType, triggeredByLabel(r), fmt(r.startedAt), duration(r), r.output || "", r.error || ""]);
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
      <div class="run"><h2>${i+1}. ${escape(r.agent?.name)}</h2>
        <div class="meta"><span>${escape(r.agent?.workspace?.name||"—")}</span> · <span class="status ${r.status}">${escape(r.status)}</span> · <span>${escape(r.triggerType)}</span> · by <span>${escape(triggeredByLabel(r))}</span> · <span>${escape(fmt(r.startedAt))}</span> · <span>${escape(duration(r))}</span></div>
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
      <h1>Agent Runs Report</h1><p class="sub">Generated: ${new Date().toLocaleString()} · ${total} runs total</p>${blocks}
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
          <Link to="/agents"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors">
            ← Agent Studio
          </Link>
        </div>
      </div>

      {fetchErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{fetchErr}</div>}

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
                        {r.error && <pre className={`text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto ${r.output ? "mt-2" : ""}`}>{r.error}</pre>}
                        {!r.output && !r.error && <p className="text-xs text-gray-400 italic">No output recorded.</p>}
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
