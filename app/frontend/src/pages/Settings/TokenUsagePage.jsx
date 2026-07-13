import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtCost(n) {
  if (!n || n === 0) return null;
  return `$${n.toFixed(4)}`;
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

const PERIODS = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

export default function TokenUsagePage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [usage, setUsage]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("all");
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/token-usage?period=${period}`)
      .then(r => setUsage(r.data.usage || []))
      .catch(e => setError(e.response?.data?.error || "Failed to load token usage"))
      .finally(() => setLoading(false));
  }, [period]);

  const totals = usage.reduce(
    (acc, row) => ({
      messages:        acc.messages        + row.messages,
      inputTokens:     acc.inputTokens     + row.inputTokens,
      outputTokens:    acc.outputTokens    + row.outputTokens,
      embeddingTokens: acc.embeddingTokens + (row.embeddingTokens || 0),
      chatCost:        acc.chatCost        + (row.chatCost        || 0),
      embeddingCost:   acc.embeddingCost   + (row.embeddingCost   || 0),
      totalCost:       acc.totalCost       + (row.totalCost       || 0),
    }),
    { messages: 0, inputTokens: 0, outputTokens: 0, embeddingTokens: 0, chatCost: 0, embeddingCost: 0, totalCost: 0 }
  );

  const maxTotalCost = usage[0]?.totalCost || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Token Usage</h1>
          <p className="text-sm text-gray-400 mt-0.5">Chat + ingestion cost broken down by user</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Messages",     value: fmt(totals.messages)                          },
          { label: "Chat Tokens",  value: fmt(totals.inputTokens + totals.outputTokens) },
          { label: "Embed Tokens", value: fmt(totals.embeddingTokens)                   },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-indigo leading-tight mt-0.5">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Chat Cost (USD)",   value: fmtCost(totals.chatCost)      || "$0.0000" },
          { label: "Ingest Cost (USD)", value: fmtCost(totals.embeddingCost) || "$0.0000" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold font-mono text-indigo leading-tight mt-0.5">{loading ? "—" : c.value}</p>
          </div>
        ))}
        <div className="rounded-xl px-4 py-3.5" style={{ background: "linear-gradient(135deg, #4f46e5, #4338ca)" }}>
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Total Cost (USD)</p>
          <p className="text-2xl font-bold font-mono text-white leading-tight mt-0.5">
            {loading ? "—" : (fmtCost(totals.totalCost) || "$0.0000")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : usage.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No token usage recorded yet. Start chatting to see data here.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Msgs</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Chat Tokens</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Embed Tokens</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Chat Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ingest Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usage.map((row, i) => {
                const chatTokens = row.inputTokens + row.outputTokens;
                const pct = Math.round(((row.totalCost || 0) / maxTotalCost) * 100);
                return (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {row.user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{row.user.name || "—"}</p>
                          <p className="text-[10px] text-gray-400">{row.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={row.user.role} /></td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs font-variant-numeric tabular-nums">{row.messages.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-mono">{fmt(chatTokens)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-mono">{fmt(row.embeddingTokens || 0)}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-gray-700">
                      {fmtCost(row.chatCost) || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-gray-700">
                      {fmtCost(row.embeddingCost) || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-indigo rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold text-indigo">
                          {fmtCost(row.totalCost) || <span className="text-gray-300 font-normal">—</span>}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-700">Totals</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 font-mono">{totals.messages.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 font-mono">{fmt(totals.inputTokens + totals.outputTokens)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 font-mono">{fmt(totals.embeddingTokens)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 font-mono">${totals.chatCost.toFixed(4)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-700 font-mono">${totals.embeddingCost.toFixed(4)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-indigo font-mono">${totals.totalCost.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
