import React from "react";
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const COLORS = ["#4f46e5", "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2", "#be185d"];

const cardStyle = {
  background: "var(--viz-bg)",
  border: "1px solid var(--viz-border)",
  borderRadius: "0.75rem",
  padding: "1rem 1.25rem",
  marginTop: "0.75rem",
  maxWidth: "520px",
};

const tooltipStyle = {
  fontSize: "12px",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export default function VisualizationCard({ visualization }) {
  if (!visualization) return null;

  let viz = visualization;
  if (typeof viz === "string") {
    try { viz = JSON.parse(viz); } catch { return null; }
  }

  const { type, data, title, style, legend = "right" } = viz;
  if (!data?.length) return null;

  const legendProps = legend === "none" ? {} : {
    iconType: "circle", iconSize: 8,
    wrapperStyle: { fontSize: "11px" },
    layout: legend === "right" ? "vertical" : "horizontal",
    align: legend === "right" ? "right" : "center",
    verticalAlign: legend === "right" ? "middle" : "bottom",
  };

  if (type === "stat") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--viz-label)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>
          {data[0].label}
        </div>
        <div style={{ fontSize: "2.75rem", fontWeight: 800, color: "#4f46e5", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {Number(data[0].value).toLocaleString()}
        </div>
        {title && <div style={{ fontSize: "0.8rem", color: "var(--viz-label)", marginTop: "0.35rem" }}>{title}</div>}
      </div>
    );
  }

  if (type === "pie") {
    const inner = style === "donut" ? 40 : 0;
    return (
      <div style={cardStyle}>
        {title && <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--viz-title)", marginBottom: "0.75rem" }}>{title}</div>}
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={inner}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [Number(v).toLocaleString(), n]} />
            {legend !== "none" && <Legend {...legendProps} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div style={cardStyle}>
        {title && <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--viz-title)", marginBottom: "0.75rem" }}>{title}</div>}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--viz-axis)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--viz-axis)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div style={cardStyle}>
        {title && <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--viz-title)", marginBottom: "0.75rem" }}>{title}</div>}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--viz-axis)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--viz-axis)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3.5, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
