import React, { useState, useEffect, useRef } from "react";
import { exportMD, exportPDF, exportFilename } from "../utils/exportOutput";
import api from "../utils/api";
import ConfirmDialog from "./ConfirmDialog";
import AgentStudio from "./AgentStudio";
import { load as yamlLoad } from "js-yaml";

function Spinner() {
  return <div className="w-4 h-4 border-2 border-indigo border-t-transparent rounded-full animate-spin" />;
}

function agentToYaml(a) {
  const lines = [
    `name: "${a.name || "Untitled Agent"}"`,
    ...(a.slug ? [`slug: "${a.slug}"`] : []),
    ...(a.description ? [`description: "${a.description}"`] : []),
    `enabled: ${a.enabled !== false}`,
    `trigger:`,
    `  type: ${a.trigger?.type || a.triggerType || "manual"}`,
  ];
  const cron = a.trigger?.cron || a.cronExpression;
  if (cron) lines.push(`  cron: "${cron}"`);
  if (a.group?.trim()) lines.push(`group: "${a.group.trim()}"`);
  const chains = a.chains ? (typeof a.chains === "string" ? JSON.parse(a.chains) : a.chains) : [];
  if (chains.length) {
    lines.push(`chains:`);
    chains.filter(c => c.nextAgent).forEach(c => {
      lines.push(`  - next_agent: "${c.nextAgent}"`);
      if (c.condition && c.condition !== "always") lines.push(`    condition: ${c.condition}`);
      if (c.triggerType && c.triggerType !== "automatic") lines.push(`    trigger_type: ${c.triggerType}`);
    });
  }
  const instructions = a.instructions || a.systemPrompt;
  if (instructions) {
    lines.push(`instructions: |`);
    instructions.split("\n").forEach(l => lines.push(`  ${l}`));
  }
  const steps = a.steps || (a.workflow ? (typeof a.workflow === "string" ? JSON.parse(a.workflow) : a.workflow) : []);
  if (steps.length) {
    lines.push(`steps:`);
    steps.forEach(s => {
      lines.push(`  - name: "${s.name || ""}"`);
      if (s.content?.trim()) {
        lines.push(`    content: |`);
        s.content.split("\n").forEach(l => lines.push(`      ${l}`));
      }
    });
  }
  const conns = a.connectors || [];
  if (conns.length) {
    lines.push(`connectors:`);
    conns.forEach(c => {
      lines.push(`  - name: "${c.name}"`);
      lines.push(`    type: ${c.type}`);
      if (c.connection_id) lines.push(`    connection_id: "${c.connection_id}"`);
    });
  }
  const params = a.params || [];
  if (params.length) {
    lines.push(`params:`);
    params.forEach(p => {
      lines.push(`  - name: ${p.name}`);
      if (p.label)   lines.push(`    label: "${p.label}"`);
      if (p.default) lines.push(`    default: "${p.default}"`);
    });
  }
  return lines.join("\n");
}

function RunLogCopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      className="text-xs text-indigo hover:underline"
    >
      {copied ? "✓ copied!" : "copy"}
    </button>
  );
}

function RunLogRow({ run, slug, onCancelled }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const dur = run.completedAt
    ? (() => { const ms = new Date(run.completedAt) - new Date(run.startedAt); return ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`; })()
    : null;
  const triggerLabel = run.triggerType === "scheduled" ? "⏱" : run.triggerType === "chat" ? "💬" : run.triggerType === "chained" ? "🔗" : "▶";
  const isRunning = run.status === "running";

  async function handleCancel(e) {
    e.stopPropagation();
    setCancelling(true);
    try {
      await api.post(`/workspaces/${slug}/agents/${run.agentId}/runs/${run.id}/cancel`);
      onCancelled?.();
    } catch { /* */ } finally { setCancelling(false); }
  }

  return (
    <>
      <div onClick={() => setExpanded(e => !e)} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${run.status === "success" ? "bg-green-400" : run.status === "error" ? "bg-red-400" : isRunning ? "bg-blue-400 animate-pulse" : "bg-blue-400"}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800 block truncate">{run.agent?.name || "—"}</span>
          <span className="text-xs text-gray-400 block truncate">{triggerLabel} {new Date(run.startedAt).toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${run.status === "success" ? "bg-green-100 text-green-700" : run.status === "error" ? "bg-red-100 text-red-600" : isRunning ? "bg-blue-100 text-blue-600" : "bg-blue-100 text-blue-600"}`}>{run.status}</span>
          {dur && <span className="text-[11px] text-gray-400">{dur}</span>}
        </div>
        {isRunning && (
          <button onClick={handleCancel} disabled={cancelling}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Stop this run">
            {cancelling ? "…" : "⏹ Stop"}
          </button>
        )}
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform mt-0.5 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50/60 space-y-1.5 pt-2">
          {run.output && <p className="text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{run.output}</p>}
          {run.error  && <p className="text-xs text-red-500">{run.error}</p>}
          {run.output && (
            <div className="flex gap-2 pt-0.5">
              <button onClick={() => {
                const csv = [["Agent","Status","Trigger","Started","Output","Error"],
                  [run.agent?.name||"",run.status,run.triggerType,new Date(run.startedAt).toLocaleString(),run.output||"",run.error||""]
                ].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
                const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}));
                a.download=exportFilename(run.agent?.name,run.startedAt)+".csv";a.click();
              }} className="text-xs text-indigo hover:underline">.csv</button>
              <button onClick={() => exportMD(run.output, exportFilename(run.agent?.name, run.startedAt))} className="text-xs text-indigo hover:underline">.md</button>
              <button onClick={() => exportPDF(run.output, exportFilename(run.agent?.name, run.startedAt))} className="text-xs text-indigo hover:underline">.pdf</button>
              <RunLogCopyButton text={run.output} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ApprovalCard({ approval, onDecide }) {
  const [expanded, setExpanded] = useState(approval.status === "pending");
  const statusDot = approval.status === "pending" ? "bg-amber-400" : approval.status === "approved" ? "bg-green-400" : "bg-red-400";
  const statusBadge = approval.status === "pending" ? "bg-amber-100 text-amber-700" : approval.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600";
  return (
    <>
      <div onClick={() => setExpanded(e => !e)} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${statusDot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate">{approval.sourceAgent?.name || "Agent"}</span>
            <span className="text-gray-400 text-xs shrink-0">→</span>
            <span className="text-xs font-mono font-semibold text-indigo shrink-0">@{approval.nextAgentSlug}</span>
          </div>
          <span className="text-xs text-gray-400">{new Date(approval.createdAt).toLocaleString()}</span>
        </div>
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${statusBadge}`}>{approval.status}</span>
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform mt-0.5 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50/60 space-y-2 pt-2">
          {approval.runOutput && (
            <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-lg px-2 py-1.5">
              {approval.runOutput}
            </p>
          )}
          {approval.status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => onDecide(approval.id, "approved")}
                className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors">
                Approve
              </button>
              <button onClick={() => onDecide(approval.id, "rejected")}
                className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function AgentsChatPanel({ slug, isManager, onClose, onApprovalDecided }) {
  const [agents, setAgents]         = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editAgent, setEditAgent]   = useState(null);
  const [form, setForm]             = useState({
    name: "", systemPrompt: "",
    connectorIds: [], triggerType: "manual", cronExpression: "", enabled: true,
  });
  const [saving, setSaving]         = useState(false);
  const [running, setRunning]       = useState(null);
  const [runOutput, setRunOutput]   = useState({});
  const [runHistory, setRunHistory] = useState({});
  const [showHistory, setShowHistory] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [importing, setImporting]   = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeTab, setActiveTab]   = useState("agents");
  const [allRuns, setAllRuns]       = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [approvals, setApprovals]   = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [paramsModal, setParamsModal] = useState(null); // { agent, values }
  const [maxRounds, setMaxRounds]         = useState(25);
  const [maxChainDepth, setMaxChainDepth] = useState(5);
  const importRef                   = useRef(null);

  function fetchAgents() {
    if (!slug) return;
    Promise.all([
      api.get(`/workspaces/${slug}/agents`),
      api.get(`/workspaces/${slug}/connectors`),
      api.get(`/workspaces/${slug}`),
    ]).then(([ar, cr, wr]) => {
      setAgents(ar.data.agents || []);
      setConnectors(cr.data.connectors || []);
      setMaxRounds(wr.data.workspace?.defaultAgentMaxRounds || 25);
      setMaxChainDepth(wr.data.workspace?.maxChainDepth || 5);
    }).catch(() => setError("Failed to load agents"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAgents();
  }, [slug]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchAgents(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [slug]);

  function openCreate() {
    setEditAgent(null);
    setForm({ name: "", systemPrompt: "", connectorIds: [], triggerType: "manual", cronExpression: "", enabled: true, params: [] });
    setShowForm(true);
  }

  function openEdit(agent) {
    setEditAgent(agent);
    setForm({
      name:           agent.name,
      systemPrompt:   agent.systemPrompt || "",
      connectorIds:   JSON.parse(agent.connectorIds || "[]"),
      triggerType:    agent.triggerType || "manual",
      cronExpression: agent.cronExpression || "",
      enabled:        agent.enabled !== false,
      params:         JSON.parse(agent.params || "[]"),
    });
    setShowForm(true);
  }

  async function handleSave(formData) {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const { name, slug: agentSlug, description, group, nextAgent, nextAgentCondition, chains, systemPrompt, steps, connectorIds, triggerType, cronExpression, enabled, params, visualize } = formData;
      const workflow = steps?.length ? steps : null;
      const payload = { name, slug: agentSlug, description, group, nextAgent, nextAgentCondition, chains: chains?.filter(c => c.nextAgent), systemPrompt, workflow, connectorIds, triggerType, cronExpression, enabled, params, visualize: visualize === true };
      if (editAgent) {
        const { data } = await api.put(`/workspaces/${slug}/agents/${editAgent.id}`, payload);
        setAgents(a => a.map(x => x.id === editAgent.id ? { ...x, ...data.agent } : x));
      } else {
        const { data } = await api.post(`/workspaces/${slug}/agents`, payload);
        setAgents(a => [{ ...data.agent, _owned: true }, ...a]);
      }
      window.dispatchEvent(new Event("agents-changed"));
      setShowForm(false);
    } catch (e) { setError(e.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleCopy(agent) {
    try {
      const { data } = await api.post(`/workspaces/${slug}/agents`, {
        name:           `Copy of ${agent.name}`,
        systemPrompt:   agent.systemPrompt || "",
        connectorIds:   JSON.parse(agent.connectorIds || "[]"),
        triggerType:    agent.triggerType || "manual",
        cronExpression: agent.cronExpression || "",
        enabled:        agent.enabled !== false,
        params:         JSON.parse(agent.params || "[]"),
      });
      setAgents(a => [{ ...data.agent, _owned: true }, ...a]);
      window.dispatchEvent(new Event("agents-changed"));
    } catch { setError("Failed to copy agent"); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/workspaces/${slug}/agents/${id}`);
      setAgents(a => a.filter(x => x.id !== id));
      window.dispatchEvent(new Event("agents-changed"));
    } catch { setError("Failed to delete agent"); }
    setConfirmDel(null);
  }

  async function handleRun(agent, paramValues) {
    const paramDefs = JSON.parse(agent.params || "[]");
    if (paramDefs.length && !paramValues) {
      const defaults = {};
      paramDefs.forEach(p => { defaults[p.name] = p.default || ""; });
      setParamsModal({ agent, values: defaults });
      return;
    }
    setParamsModal(null);
    setRunning(agent.id);
    setRunOutput(o => ({ ...o, [agent.id]: "" }));
    try {
      const token = localStorage.getItem("oe_token");
      const res = await fetch(`/api/workspaces/${slug}/agents/${agent.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: "", params: paramValues || {} }),
      });
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.done) {
              setRunOutput(o => ({ ...o, [agent.id]: evt.output || "" }));
              setAgents(a => a.map(x => x.id === agent.id
                ? { ...x, runs: [{ status: "success", startedAt: new Date().toISOString() }] }
                : x
              ));
              loadAllRuns();
            }
            if (evt.error) setRunOutput(o => ({ ...o, [agent.id]: `Error: ${evt.error}` }));
          } catch { /* partial */ }
        }
      }
    } catch (e) { setRunOutput(o => ({ ...o, [agent.id]: `Error: ${e.message}` })); }
    finally { setRunning(null); }
  }

  async function loadHistory(agentId) {
    try {
      const { data } = await api.get(`/workspaces/${slug}/agents/${agentId}/runs`);
      setRunHistory(h => ({ ...h, [agentId]: data.runs || [] }));
      setShowHistory(agentId);
    } catch { setError("Failed to load history"); }
  }

  async function loadAllRuns() {
    if (!slug) return;
    setLogsLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${slug}/agent-runs`);
      setAllRuns(data.runs || []);
    } catch (e) { setError(e.response?.data?.error || "Failed to load agent runs"); }
    finally { setLogsLoading(false); }
  }

  async function handleClearLogs() {
    setClearingLogs(true);
    try {
      await api.delete(`/workspaces/${slug}/agent-runs`);
      setAllRuns([]);
      setConfirmClearLogs(false);
    } catch (e) { setError(e.response?.data?.error || "Failed to clear logs"); }
    finally { setClearingLogs(false); }
  }

  useEffect(() => {
    if (activeTab !== "logs") return;
    loadAllRuns();
    const id = setInterval(loadAllRuns, 5000);
    return () => clearInterval(id);
  }, [activeTab, slug]);

  async function loadApprovals() {
    if (!slug) return;
    setApprovalsLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${slug}/chain-approvals`);
      setApprovals(data.approvals || []);
    } catch { /* ignore */ }
    finally { setApprovalsLoading(false); }
  }

  useEffect(() => {
    if (activeTab !== "approvals") return;
    loadApprovals();
    const id = setInterval(loadApprovals, 5000);
    return () => clearInterval(id);
  }, [activeTab, slug]);

  // Poll for pending approvals count (for badge)
  useEffect(() => {
    if (!slug) return;
    const id = setInterval(async () => {
      const { data } = await api.get(`/workspaces/${slug}/chain-approvals`).catch(() => ({ data: null }));
      if (data) setApprovals(data.approvals || []);
    }, 10000);
    loadApprovals();
    return () => clearInterval(id);
  }, [slug]);

  async function decideApproval(id, decision) {
    await api.patch(`/workspaces/${slug}/chain-approvals/${id}`, { decision });
    setApprovals(a => a.map(x => x.id === id ? { ...x, status: decision } : x));
    if (onApprovalDecided) {
      // reload immediately (shows ✅/❌ message), then poll while chained agent runs
      onApprovalDecided();
      const poll = setInterval(onApprovalDecided, 4000);
      setTimeout(() => clearInterval(poll), 180000); // stop after 3 min
    }
  }

  async function handleExport(agent) {
    try {
      const { data } = await api.get(`/workspaces/${slug}/agents/${agent.id}/export`);
      const yaml = agentToYaml(data);
      const blob = new Blob([yaml], { type: "text/yaml" });
      const url  = URL.createObjectURL(blob);
      const el   = document.createElement("a");
      el.href    = url;
      el.download = `${agent.name.toLowerCase().replace(/\s+/g, "-")}.yaml`;
      el.click();
      URL.revokeObjectURL(url);
    } catch { setError("Failed to export agent"); }
  }

  async function handleImport(files) {
    if (!files?.length) return;
    setImporting(true);
    const warnings = [];
    let successCount = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        const isYaml = file.name.endsWith(".yaml") || file.name.endsWith(".yml");
        const agentJson = isYaml ? yamlToAgentJson(yamlLoad(text)) : JSON.parse(text);
        const { data } = await api.post(`/workspaces/${slug}/agents/import`, { agentJson });
        setAgents(a => [{ ...data.agent, _owned: true }, ...a]);
        window.dispatchEvent(new Event("agents-changed"));
        successCount++;
        if (data.unmatchedTypes?.length) warnings.push(`"${file.name}": ${data.unmatchedTypes.join(", ")} connector(s) not found`);
        if (data.slugRenamed) warnings.push(`"${file.name}": imported as "${data.slugRenamed}" (slug conflict)`);
      } catch (e) {
        warnings.push(`"${file.name}": ${e.response?.data?.error || "Invalid agent file"}`);
      }
    }
    setImporting(false);
    if (importRef.current) importRef.current.value = "";
    if (warnings.length) setError(`Imported ${successCount}/${files.length} — ${warnings.join("; ")}.`);
  }

  function yamlToAgentJson(y) {
    return {
      name:               y.name,
      slug:               y.slug || "",
      description:        y.description || "",
      group:              y.group || "",
      nextAgent:          y.next_agent || "",
      nextAgentCondition: y.next_agent_condition || "on_critical",
      chains:             (y.chains || []).map(c => ({ condition: c.condition || "always", nextAgent: c.next_agent || "", triggerType: c.trigger_type || "automatic" })),
      systemPrompt:       y.instructions || "",
      steps:              y.steps || [],
      triggerType:        y.trigger?.type || "manual",
      cronExpression:     y.trigger?.cron || "",
      enabled:            y.enabled !== false,
      connectors:         (y.connectors || []).map(c => ({ name: c.name, type: c.type, connection_id: c.connection_id || "" })),
      params:             (y.params || []).map(p => ({ name: p.name, label: p.label || "", default: p.default || "" })),
    };
  }

  const PRESET_CRONS = [
    { label: "Every hour",     cron: "0 * * * *"   },
    { label: "Every day 9am",  cron: "0 9 * * *"   },
    { label: "Every day 6pm",  cron: "0 18 * * *"  },
    { label: "Every Mon 9am",  cron: "0 9 * * 1"   },
    { label: "Every 6 hours",  cron: "0 */6 * * *" },
    { label: "Custom…",        cron: "__custom__"   },
  ];
  const PRESET_CRON_VALUES = PRESET_CRONS.slice(0, -1).map(p => p.cron);

  return (
    <div className={`${expanded ? "w-1/2" : "w-[320px]"} bg-[#f9f9f9] border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200`}>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-gray-200 shrink-0 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
            </svg>
            <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
              <button onClick={() => setActiveTab("agents")} className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${activeTab === "agents" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Agents {agents.length > 0 && <span className="ml-1 text-xs text-indigo font-semibold">{agents.length}</span>}
              </button>
              <button onClick={() => setActiveTab("approvals")} className={`relative px-2.5 py-1 text-sm font-medium rounded transition-colors ${activeTab === "approvals" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Approvals
                {approvals.filter(a => a.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {approvals.filter(a => a.status === "pending").length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab("logs")} className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${activeTab === "logs" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Logs
              </button>
            </div>
          </div>
          <button onClick={onClose} title="Collapse" className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">&times;</button>
        </div>
        <div className="flex gap-2 py-2 border-t border-b border-gray-100 -mx-4 px-4">
          <button onClick={openCreate} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-indigo text-white text-xs font-semibold hover:bg-indigo/90 transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Agent
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            title="Import from YAML"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:border-indigo hover:text-indigo transition-colors disabled:opacity-50"
          >
            {importing
              ? <Spinner />
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            }
            Import
          </button>
          <input ref={importRef} type="file" accept=".yaml,.yml" className="hidden" multiple
            onChange={e => handleImport(Array.from(e.target.files || []))} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Logs Tab ── */}
        {activeTab === "logs" && (
          <div className="px-3 pt-3 pb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Agent Runs</span>
              <div className="flex items-center gap-2">
                {allRuns.length > 0 && (
                  <button onClick={() => setConfirmClearLogs(true)} className="text-xs font-medium text-red-500 hover:text-red-600">Clear</button>
                )}
                <button onClick={loadAllRuns} className="text-xs text-indigo hover:text-indigo/80 font-medium">↻ Refresh</button>
              </div>
            </div>
            {logsLoading && allRuns.length === 0 ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : allRuns.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">No agent runs yet.</div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {allRuns.map(run => <RunLogRow key={run.id} run={run} slug={slug} onCancelled={loadAllRuns} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Approvals Tab ── */}
        {activeTab === "approvals" && (
          <div className="px-3 pt-3 pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chain Approvals</span>
              <button onClick={loadApprovals} className="text-xs text-indigo hover:text-indigo/80 font-medium">↻ Refresh</button>
            </div>
            {approvalsLoading && approvals.length === 0 ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : approvals.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">No approval requests yet.</div>
            ) : (
              <div className="space-y-2">
                {approvals.filter(a => a.status === "pending").length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-red-500 text-sm">🚨</span>
                    <span className="text-xs font-semibold text-red-700">{approvals.filter(a => a.status === "pending").length} pending approval{approvals.filter(a => a.status === "pending").length > 1 ? "s" : ""} — action required</span>
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {approvals.map(approval => (
                    <ApprovalCard key={approval.id} approval={approval} onDecide={decideApproval} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Agents Tab ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : activeTab === "agents" && (
          <div className="px-3 pt-3 pb-6 space-y-2.5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 flex items-center justify-between">
                {error}
                <button onClick={() => setError("")} className="ml-2 font-bold">×</button>
              </div>
            )}


            {/* Active Connectors */}
            {connectors.length > 0 && (
              <details className="border border-gray-200 rounded-xl bg-white overflow-hidden group/conn">
                <summary className="px-3 py-2 bg-gray-50/60 flex items-center gap-1.5 cursor-pointer list-none select-none">
                  <svg className="w-3 h-3 text-gray-400 transition-transform group-open/conn:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Connections</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium ml-auto">{connectors.length}</span>
                </summary>
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {connectors.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">{c.name}</span>
                      {c.slug && <span className="text-[10px] font-mono text-indigo shrink-0">@{c.slug}</span>}
                      {c._owned === false && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">shared</span>}
                      <span className="text-[11px] text-gray-400 ml-auto shrink-0 capitalize">{c.type}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Empty state */}
            {agents.length === 0 && !showForm && (
              <div className="text-center py-10 text-xs text-gray-400">
                No agents yet.<br />Click <strong>+ New Agent</strong> to create one.
              </div>
            )}

            {/* Agent list — grouped */}
            {(() => {
              const grouped = {};
              agents.forEach(a => {
                const key = a.group?.trim() || "__ungrouped__";
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(a);
              });
              const groupKeys = Object.keys(grouped).sort((a, b) => {
                if (a === "__ungrouped__") return 1;
                if (b === "__ungrouped__") return -1;
                return a.localeCompare(b);
              });
              return groupKeys.map(groupKey => {
                const groupAgents = grouped[groupKey];
                const label = groupKey === "__ungrouped__" ? "Ungrouped" : groupKey;
                const isGroupOpen = expandedGroups[groupKey] !== false;
                return (
                <div key={groupKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setExpandedGroups(g => ({ ...g, [groupKey]: !isGroupOpen }))}
                    className="w-full px-3 py-2 bg-gray-50/60 flex items-center gap-1.5 hover:bg-gray-100/60 transition-colors"
                  >
                    <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isGroupOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-1 text-left">{label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{groupAgents.length}</span>
                  </button>
                  {isGroupOpen && (
                  <div className="divide-y divide-gray-100">
                  {groupAgents.map(agent => {
                    const lastRun = agent.runs?.[0];
                    const isOpen  = expandedAgent === agent.id;
                    return (
                      <React.Fragment key={agent.id}>
                        <div
                          onClick={() => setExpandedAgent(isOpen ? null : agent.id)}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${lastRun?.status === "success" ? "bg-green-400" : lastRun?.status === "error" ? "bg-red-400" : "bg-gray-300"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-800 truncate">{agent.name}</span>
                              {!agent._owned && <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">shared</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {agent.slug && <span className="text-xs font-mono text-indigo">@{agent.slug}</span>}
                              {!agent._owned && <span className="text-[11px] text-gray-400">by {agent.createdBy?.name || "another workspace"}</span>}
                            </div>
                          </div>
                          <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {isOpen && (
                          <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
                            {agent._owned && (
                            <div className="grid grid-cols-4 gap-1.5 pt-2">
                              <button onClick={() => openEdit(agent)}
                                className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo hover:text-indigo text-gray-600 transition-colors text-xs font-medium">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                Edit
                              </button>
                              <button onClick={() => handleExport(agent)}
                                className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo hover:text-indigo text-gray-600 transition-colors text-xs font-medium">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Export
                              </button>
                              <button onClick={() => handleRun(agent)} disabled={running === agent.id}
                                className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 bg-white hover:border-green-500 hover:text-green-600 text-gray-600 transition-colors text-[10px] font-medium disabled:opacity-40">
                                {running === agent.id
                                  ? <Spinner />
                                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                Run
                              </button>
                              <button onClick={() => setConfirmDel(agent)}
                                className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 bg-white hover:border-red-400 hover:text-red-500 text-gray-600 transition-colors text-xs font-medium">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                Delete
                              </button>
                            </div>
                            )}
                            {!agent._owned && (
                              <p className="text-xs text-gray-400 pt-2 text-center">Shared agent — trigger via <span className="font-mono">@{agent.slug}</span> in chat</p>
                            )}

                            {/* Run output */}
                            {(running === agent.id || runOutput[agent.id] !== undefined) && (
                              <div className="bg-gray-900 rounded-lg p-2.5 text-[11px] font-mono text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto relative">
                                {running === agent.id && !runOutput[agent.id]
                                  ? <span className="text-gray-400">Running…</span>
                                  : runOutput[agent.id] || <span className="text-gray-400">No output</span>}
                                <button
                                  onClick={() => setRunOutput(o => { const n = { ...o }; delete n[agent.id]; return n; })}
                                  className="absolute top-1.5 right-1.5 text-gray-500 hover:text-gray-300 text-xs leading-none">×</button>
                              </div>
                            )}

                            {/* Run history logs */}
                            {showHistory === agent.id && (
                              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-gray-500">Run Logs</span>
                                  <button onClick={() => setShowHistory(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
                                </div>
                                {!(runHistory[agent.id]?.length) ? (
                                  <p className="text-xs text-gray-400 px-3 py-2">No runs yet.</p>
                                ) : (
                                  <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                                    {(runHistory[agent.id] || []).map(run => (
                                      <div key={run.id} className="px-3 py-2">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className={`text-xs font-semibold ${run.status === "success" ? "text-green-600" : run.status === "error" ? "text-red-500" : "text-gray-400"}`}>{run.status}</span>
                                          <span className="text-xs text-gray-400">{new Date(run.startedAt).toLocaleString()}</span>
                                        </div>
                                        {run.output && <p className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{run.output}</p>}
                                        {run.error  && <p className="text-xs text-red-500">{run.error}</p>}
                                        {run.output && (
                                          <div className="flex gap-2 mt-1">
                                            <button onClick={() => exportMD(run.output, exportFilename(agent.name, run.startedAt))} className="text-xs text-indigo hover:underline">.md</button>
                                            <button onClick={() => exportPDF(run.output, exportFilename(agent.name, run.startedAt))} className="text-xs text-indigo hover:underline">.pdf</button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  </div>
                  )}
                </div>
              );
              });
            })()}
          </div>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Delete Agent"
          message="Delete this agent and all its run history?"
          detail={confirmDel.name}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {confirmClearLogs && (
        <ConfirmDialog
          title="Clear Run Logs"
          message="Delete all agent run history for this workspace?"
          confirmLabel="Clear"
          variant="danger"
          loading={clearingLogs}
          onConfirm={handleClearLogs}
          onCancel={() => !clearingLogs && setConfirmClearLogs(false)}
        />
      )}

      {paramsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setParamsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Run: {paramsModal.agent.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Set parameters for this run</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {JSON.parse(paramsModal.agent.params || "[]").map(p => (
                <div key={p.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{p.label || p.name}</label>
                  <input
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo/40"
                    value={paramsModal.values[p.name] ?? ""}
                    onChange={e => setParamsModal(m => ({ ...m, values: { ...m.values, [p.name]: e.target.value } }))}
                    placeholder={p.default || ""}
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setParamsModal(null)} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => handleRun(paramsModal.agent, paramsModal.values)} className="flex-1 py-2 text-sm font-semibold text-white bg-indigo rounded-lg hover:bg-indigo/90 transition-colors">Run</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <AgentStudio
          initialAgent={editAgent}
          connectors={connectors}
          agents={agents.filter(a => a._owned !== false)}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          maxRounds={maxRounds}
          maxChainDepth={maxChainDepth}
        />
      )}
    </div>
  );
}
