import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";
import api from "../utils/api";

const INDIGO = "#4f46e5";

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n ?? 0);
}

function usd(n) {
  if (!n) return "$0.00";
  if (n < 0.0001) return "<$0.0001";
  if (n < 0.01)   return "$" + n.toFixed(4);
  return "$" + n.toFixed(2);
}

function fmtDate(d) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}

// ── Components ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-indigo leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function CostCard({ label, value, tokens, tokenLabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold font-mono text-indigo leading-tight">{value}</p>
      {tokens !== undefined && (
        <p className="text-[10px] text-gray-400 mt-0.5">{fmt(tokens)} {tokenLabel || "tokens"}</p>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-1 h-4 bg-indigo rounded-full shrink-0" />
      <p className="text-xs font-bold text-gray-700 uppercase tracking-widest whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo/5 to-transparent border-b border-gray-100 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo shrink-0" />
        <p className="text-xs font-semibold text-gray-700">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DonutChart({ data, label }) {
  if (!data?.length) return (
    <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data yet</div>
  );
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
          </Pie>
          <Tooltip formatter={(v) => [v, ""]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-gray-600">{d.name}</span>
            </div>
            <span className="font-semibold text-gray-800 ml-2">
              {d.value} <span className="font-normal text-gray-400">({Math.round(d.value / total * 100)}%)</span>
            </span>
          </div>
        ))}
        <p className="text-[10px] text-gray-400 pt-1">Total: {total} {label}</p>
      </div>
    </div>
  );
}

function ActivityLine({ data, dataKey = "count", color = "#4f46e5", label = "Activity" }) {
  const ticks = data?.filter((_, i) => i % 5 === 0).map(d => d.date) || [];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" ticks={ticks} tickFormatter={fmtDate} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip labelFormatter={fmtDate} formatter={(v) => [v, label]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HBarChart({ data, bar1Key, bar1Label, bar1Color, bar2Key, bar2Label, bar2Color }) {
  if (!data?.length) return (
    <div className="h-40 flex items-center justify-center text-xs text-gray-400">No workspaces yet</div>
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Bar dataKey={bar1Key} name={bar1Label} fill={bar1Color || "#4f46e5"} radius={[0, 4, 4, 0]} barSize={10} />
        {bar2Key && <Bar dataKey={bar2Key} name={bar2Label} fill={bar2Color || "#e0e7ff"} radius={[0, 4, 4, 0]} barSize={10} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Instance Usage ─────────────────────────────────────────────────────────────

function UsageBar({ label, used, limit, formatUsed, formatLimit }) {
  const infinite = limit === null || limit === undefined || !isFinite(limit);
  const pct      = infinite ? 0 : Math.min(100, (used / limit) * 100);
  const danger   = pct >= 90;
  const warn     = pct >= 70;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className={`font-semibold ${danger ? "text-red-600" : warn ? "text-amber-600" : "text-indigo"}`}>
          {formatUsed(used)} / {infinite ? "Unlimited" : formatLimit(limit)}
        </span>
      </div>
      {!infinite && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${danger ? "bg-red-500" : warn ? "bg-amber-400" : "bg-indigo"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function InstanceUsageSection({ usage }) {
  if (!usage) return null;
  return (
    <div>
      <SectionTitle>Instance Usage</SectionTitle>
      <div className="bg-white rounded-xl border border-indigo/20 overflow-hidden">
        <div className="px-5 py-3 bg-indigo/5 border-b border-indigo/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Limits for this installation</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo text-white capitalize">{usage.tierName}</span>
        </div>
        <div className="p-5 space-y-4">
          <UsageBar
            label="Storage"
            used={usage.storageUsedGb}
            limit={usage.storageLimitGb}
            formatUsed={v => v < 1 ? `${(v * 1024).toFixed(0)} MB` : `${v.toFixed(2)} GB`}
            formatLimit={v => `${v} GB`}
          />
          <UsageBar
            label="Connectors"
            used={usage.connectorCount}
            limit={usage.connectorLimit}
            formatUsed={v => String(v)}
            formatLimit={v => String(v)}
          />
          <UsageBar
            label="Agent Runs this month"
            used={usage.agentRunsThisMonth}
            limit={usage.agentRunsLimit}
            formatUsed={v => v.toLocaleString()}
            formatLimit={v => v.toLocaleString()}
          />
        </div>
      </div>
    </div>
  );
}

// ── Manager Metrics ────────────────────────────────────────────────────────────

function ManagerMetrics({ stats }) {
  return (
    <div className="space-y-6 mb-8">
      <SectionTitle>Workspace Overview</SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Workspaces"        value={fmt(stats.workspaceCount)}  sub="total"             />
        <StatCard label="Documents"         value={fmt(stats.documentCount)}   sub="ingested"          />
        <StatCard label="Vectors Indexed"   value={fmt(stats.vectorCount)}     sub="embeddings stored" />
        <StatCard label="Active Ingestions" value={stats.activeIngestions}     sub="queued or running" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Agent Runs"      value={fmt(stats.agentRunCount   || 0)} sub="last 30 days"  />
        <StatCard label="Successful Runs" value={fmt(stats.agentRunSuccess  || 0)} sub="completed ok" />
        <StatCard label="Failed Runs"     value={fmt(stats.agentRunErrors   || 0)} sub="errors"       />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Document Status">
          <DonutChart data={stats.documentsByStatus} label="documents" />
        </ChartCard>
        <ChartCard title="Documents per Workspace">
          <HBarChart
            data={stats.docsByWorkspace}
            bar1Key="documents" bar1Label="Documents" bar1Color={INDIGO}
            bar2Key="chats"     bar2Label="Chats"     bar2Color="#e2e8f0"
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Agent Runs — last 30 days">
          <ActivityLine data={stats.agentRunActivity || []} label="Runs" color="#f59e0b" />
        </ChartCard>
        <ChartCard title="Runs by Trigger">
          <DonutChart data={stats.agentRunsByTrigger || []} label="runs" />
        </ChartCard>
      </div>

      <ChartCard title="Ingestion Activity — last 30 days">
        <ActivityLine data={stats.ingestActivity} label="Documents" color={INDIGO} />
      </ChartCard>
    </div>
  );
}

// ── Admin Metrics ──────────────────────────────────────────────────────────────

function AdminMetrics({ stats }) {
  return (
    <div className="space-y-6 mb-8">
      <SectionTitle>Platform Overview</SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Users"             value={fmt(stats.userCount)}      sub="registered"   />
        <StatCard label="Workspaces"        value={fmt(stats.workspaceCount)} sub="total"        />
        <StatCard label="Documents"         value={fmt(stats.documentCount)}  sub="ingested"     />
        <StatCard label="Vectors"           value={fmt(stats.vectorCount)}    sub="indexed"      />
        <StatCard label="Chat Messages"     value={fmt(stats.chatCount)}      sub="all time"     />
        <StatCard label="Active Ingestions" value={stats.activeIngestions}    sub="right now"    />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Agent Runs"      value={fmt(stats.agentRunCount   || 0)} sub="last 30 days"  />
        <StatCard label="Successful Runs" value={fmt(stats.agentRunSuccess  || 0)} sub="completed ok" />
        <StatCard label="Failed Runs"     value={fmt(stats.agentRunErrors   || 0)} sub="errors"       />
      </div>

      <InstanceUsageSection usage={stats.usage} />

      <SectionTitle>Usage &amp; Cost</SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CostCard label="Embedding Cost"  value={usd(stats.embeddingCostUsd)} tokens={stats.embeddingTokens} tokenLabel="embed tokens"  />
        <CostCard label="LLM Input Cost"  value={usd(stats.llmInputTokens * (stats.llmCostUsd / ((stats.llmInputTokens + stats.llmOutputTokens) || 1)))} tokens={stats.llmInputTokens}  tokenLabel="input tokens"  />
        <CostCard label="LLM Output Cost" value={usd(stats.llmOutputTokens * (stats.llmCostUsd / ((stats.llmInputTokens + stats.llmOutputTokens) || 1)))} tokens={stats.llmOutputTokens} tokenLabel="output tokens" />
        <div className="rounded-xl p-4 flex flex-col gap-0.5 shadow-md shadow-indigo/20" style={{ background: "linear-gradient(135deg, #4f46e5, #4338ca)" }}>
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Total Cost</p>
          <p className="text-2xl font-bold text-white leading-tight">{usd(stats.totalCostUsd)}</p>
          <p className="text-[10px] text-white/50 mt-0.5">all time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ChartCard title="Document Status">
          <DonutChart data={stats.documentsByStatus} label="documents" />
        </ChartCard>
        <ChartCard title="Users by Role">
          <DonutChart data={stats.usersByRole} label="users" />
        </ChartCard>
        <ChartCard title="Runs by Trigger">
          <DonutChart data={stats.agentRunsByTrigger || []} label="runs" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Chat Activity — last 30 days">
          <ActivityLine data={stats.chatActivity} label="Messages" color={INDIGO} />
        </ChartCard>
        <ChartCard title="Agent Runs — last 30 days">
          <ActivityLine data={stats.agentRunActivity || []} label="Runs" color="#f59e0b" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Top Workspaces by Usage">
          <HBarChart
            data={stats.topWorkspaces}
            bar1Key="chats"     bar1Label="Chats"     bar1Color={INDIGO}
            bar2Key="documents" bar2Label="Documents" bar2Color="#e2e8f0"
          />
        </ChartCard>
        <ChartCard title="Ingestion Activity — last 30 days">
          <ActivityLine data={stats.ingestActivity} label="Documents" color={INDIGO} />
        </ChartCard>
      </div>

      <ChartCard title="User Growth — last 30 days">
        <ActivityLine data={stats.userGrowth} label="New Users" color="#f59e0b" />
      </ChartCard>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function DashboardMetrics({ role }) {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const endpoint = role === "admin" ? "/dashboard/admin" : "/dashboard/manager";
    api.get(endpoint)
      .then(({ data }) => setStats(data))
      .catch(() => setError("Failed to load metrics"))
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-[3px] border-indigo border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
  );

  if (!stats) return null;

  if (role === "admin")   return <AdminMetrics   stats={stats} />;
  if (role === "manager") return <ManagerMetrics stats={stats} />;
  return null;
}
