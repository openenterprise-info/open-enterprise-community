import React, { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

const ACTION_META = {
  "user.created":             { label: "User Created",         color: "bg-blue-100 text-blue-700" },
  "user.deleted":             { label: "User Deleted",         color: "bg-blue-100 text-blue-700" },
  "user.suspended":           { label: "User Suspended",       color: "bg-blue-100 text-blue-700" },
  "user.unsuspended":         { label: "User Unsuspended",     color: "bg-blue-100 text-blue-700" },
  "user.role_changed":        { label: "Role Changed",         color: "bg-blue-100 text-blue-700" },
  "workspace.created":        { label: "Workspace Created",    color: "bg-green-100 text-green-700" },
  "workspace.deleted":        { label: "Workspace Deleted",    color: "bg-green-100 text-green-700" },
  "workspace.updated":        { label: "Workspace Updated",    color: "bg-green-100 text-green-700" },
  "workspace.member_added":   { label: "Member Added",         color: "bg-green-100 text-green-700" },
  "workspace.member_removed": { label: "Member Removed",       color: "bg-green-100 text-green-700" },
  "settings.updated":         { label: "Settings Updated",     color: "bg-amber-100 text-amber-700" },
  "chat.cleared":             { label: "Chat History Cleared", color: "bg-red-100 text-red-600" },
  "connector.created":        { label: "Connector Created",    color: "bg-teal-100 text-teal-700" },
  "connector.deleted":        { label: "Connector Deleted",    color: "bg-teal-100 text-teal-700" },
  "agent.created":            { label: "Agent Created",        color: "bg-violet-100 text-violet-700" },
  "agent.deleted":            { label: "Agent Deleted",        color: "bg-violet-100 text-violet-700" },
  "agent.run":                { label: "Agent Run",            color: "bg-violet-100 text-violet-700" },
};

function formatDetails(detailsJson) {
  if (!detailsJson) return null;
  try {
    const d = JSON.parse(detailsJson);
    return Object.entries(d)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" · ");
  } catch { return detailsJson; }
}

const CATEGORIES = ["user", "workspace", "settings", "chat", "connector", "agent"];

export default function ActivityLogPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/admin/activity")
      .then(r => setLogs(r.data.logs || []))
      .catch(e => setError(e.response?.data?.error || "Failed to load activity log"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    filter ? logs.filter(l => l.action.startsWith(filter)) : logs,
    [logs, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">All configuration and management actions</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo/30">
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(log => {
              const meta = ACTION_META[log.action] || { label: log.action, color: "bg-gray-100 text-gray-600" };
              const details = formatDetails(log.details);
              const dot = meta.color.includes("green")  ? "bg-green-400"
                        : meta.color.includes("red")    ? "bg-red-400"
                        : meta.color.includes("amber")  ? "bg-amber-400"
                        : meta.color.includes("teal")   ? "bg-teal-400"
                        : meta.color.includes("violet") ? "bg-violet-400"
                        : "bg-blue-400";
              return (
                <div key={log.id} className="flex gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-28 shrink-0 pt-0.5">
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-center mt-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <div className="w-px flex-1 bg-gray-100 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-500">{log.userEmail || "—"}</span>
                    </div>
                    {details && <p className="text-xs text-gray-400 mt-1 truncate">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
