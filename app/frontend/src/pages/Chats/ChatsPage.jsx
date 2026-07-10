import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";
import { Spinner, EmptyState, ErrorBanner } from "../../components/ui";

const PAGE_SIZE = 20;
const CHAT_PERIODS = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

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

export default function ChatsPage() {
  const [searchParams] = useSearchParams();
  const [workspaces, setWorkspaces]   = useState([]);
  const [selectedWsId, setSelectedWsId] = useState(searchParams.get("ws") || "");
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
    const rows = chats.map(c => [c.workspace?.name || "", c.role, c.role === "user" ? (c.user?.name || "User") : "AI", c.content, fmt(c.createdAt)]);
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
      return `<tr><td>${i + 1}</td><td>${escape(c.workspace?.name || "—")}</td><td><span class="role ${c.role}">${escape(who)}</span></td><td>${escape(c.content)}</td><td>${escape(fmt(c.createdAt))}</td></tr>`;
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
      <h1>Chat History</h1><p class="sub">Generated: ${new Date().toLocaleString()} · ${total} message${total !== 1 ? "s" : ""}</p>
      <table><thead><tr><th>#</th><th>Workspace</th><th>Role</th><th>Message</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>
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
            <p className="text-gray-500 text-sm mt-0.5">{total > 0 ? `${total} message${total !== 1 ? "s" : ""}` : "No messages"}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input py-1.5 text-sm" value={selectedWsId} onChange={e => setSelectedWsId(e.target.value)}>
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
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${chat.role === "user" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                      {chat.role === "user" ? (chat.user?.name || "User") : "AI"}
                    </span>
                  </td>
                  <td className="px-6 py-3 max-w-sm"><p className="text-sm text-gray-600 truncate">{chat.content}</p></td>
                  <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(chat.createdAt).toLocaleString()}</td>
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
