import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

const ACTION_COLORS = {
  block:  "bg-red-100 text-red-700",
  warn:   "bg-amber-100 text-amber-700",
  redact: "bg-blue-100 text-blue-700",
  audit:  "bg-gray-100 text-gray-600",
};

const PERIODS = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

export default function ViolationsPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [all, setAll]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("7d");
  const [error, setError]     = useState("");

  useEffect(() => { fetchViolations(); }, []);

  async function fetchViolations() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/dlp/violations");
      setAll(data.violations || []);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load violations");
    } finally { setLoading(false); }
  }

  const cutoff = period === "7d" ? Date.now() - 7 * 86400000
               : period === "30d" ? Date.now() - 30 * 86400000
               : 0;
  const violations = cutoff ? all.filter(v => new Date(v.createdAt).getTime() >= cutoff) : all;
  const fmt = dt => dt ? new Date(dt).toLocaleString() : "—";

  const exportCSV = () => {
    const headers = ["Policy", "Action", "Workspace", "User", "Snippet", "Time"];
    const rows = violations.map(v => [v.policyName, v.action, v.workspaceName || "", v.userEmail || "", v.snippet || "", fmt(v.createdAt)]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `dlp-violations-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const exportMD = () => {
    const lines = [`# DLP Violations Report`, `*Generated: ${new Date().toLocaleString()} — ${violations.length} violations*`, ""];
    violations.forEach((v, i) => {
      lines.push(`## ${i + 1}. ${v.policyName}`);
      lines.push(`- **Action:** ${v.action}`);
      lines.push(`- **Workspace:** ${v.workspaceName || "—"}`);
      lines.push(`- **User:** ${v.userEmail || "—"}`);
      lines.push(`- **Snippet:** \`${v.snippet || "—"}\``);
      lines.push(`- **Time:** ${fmt(v.createdAt)}`);
      lines.push("", "---", "");
    });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
    a.download = `dlp-violations-${new Date().toISOString().slice(0,10)}.md`; a.click();
  };

  const exportPDF = () => {
    const escape = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = violations.map((v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escape(v.policyName)}</td>
        <td class="action ${v.action}">${escape(v.action)}</td>
        <td>${escape(v.workspaceName || "—")}</td>
        <td>${escape(v.userEmail || "—")}</td>
        <td><code>${escape(v.snippet || "—")}</code></td>
        <td>${escape(fmt(v.createdAt))}</td>
      </tr>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>DLP Violations Report</title><style>
      body{font-family:system-ui,sans-serif;font-size:13px;padding:32px;color:#111;max-width:1000px;margin:auto}
      h1{font-size:18px;margin-bottom:4px} .sub{color:#888;font-size:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#f9fafb;padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#6b7280}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
      code{font-family:monospace;color:#6b7280;font-size:11px}
      .action{font-weight:600;font-size:10px;text-transform:uppercase}
      .action.block{color:#dc2626} .action.warn{color:#d97706} .action.redact{color:#2563eb} .action.audit{color:#6b7280}
      @media print{table{page-break-inside:auto} tr{page-break-inside:avoid}}
    </style></head><body>
      <h1>DLP Violations Report</h1>
      <p class="sub">Generated: ${new Date().toLocaleString()} · ${violations.length} violations</p>
      <table><thead><tr><th>#</th><th>Policy</th><th>Action</th><th>Workspace</th><th>User</th><th>Snippet</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Violations</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {violations.length > 0 ? `${violations.length} violation${violations.length !== 1 ? "s" : ""} in this period` : "DLP policy hit log — matched content is partially masked"}
          </p>
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
          <button onClick={fetchViolations} className="text-xs text-indigo hover:text-indigo/80 font-medium px-2">↻</button>
          {violations.length > 0 && (
            <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">.csv</button>
              <button onClick={exportMD}  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.md</button>
              <button onClick={exportPDF} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors">.pdf</button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : violations.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No violations found for this period.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Policy</th>
                <th className="px-6 py-3 text-left">Action</th>
                <th className="px-6 py-3 text-left">Workspace</th>
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Snippet</th>
                <th className="px-6 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {violations.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{v.policyName}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ACTION_COLORS[v.action] || ACTION_COLORS.audit}`}>
                      {v.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{v.workspaceName || "—"}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{v.userEmail || "—"}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-400 max-w-[200px] truncate">{v.snippet}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
