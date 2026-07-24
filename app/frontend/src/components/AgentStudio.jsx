import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { load as yamlLoad } from "js-yaml";

class StepErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 max-w-xl">
          <p className="text-sm font-semibold text-red-600 mb-1">Something went wrong rendering this step</p>
          <pre className="text-xs text-red-500 bg-red-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <p className="text-xs text-gray-400 mt-2">Check your browser console for the full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve();
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => copyToClipboard(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {copied
        ? <><svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
        : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>}
    </button>
  );
}

const STEPS = [
  { id: "trigger",      label: "Trigger",      icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "connectors",   label: "Connectors",   icon: "M4 6h16M4 10h16M4 14h16M4 18h16", optional: true },
  { id: "instructions", label: "Instructions", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "params",       label: "Parameters",   icon: "M4 6h16M4 12h8m-8 6h16", optional: true },
  { id: "chain",        label: "Chain",        icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", optional: true },
  { id: "preview",      label: "Flow Preview", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
];

const PRESET_CRONS = [
  { label: "Every hour",    cron: "0 * * * *"   },
  { label: "Every day 9am", cron: "0 9 * * *"   },
  { label: "Every day 6pm", cron: "0 18 * * *"  },
  { label: "Every Mon 9am", cron: "0 9 * * 1"   },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Custom…",       cron: "__custom__"   },
];
const PRESET_CRON_VALUES = PRESET_CRONS.slice(0, -1).map(p => p.cron);

const TYPE_LABELS = { "rest-api": "REST API", "postgresql": "PostgreSQL", "mysql": "MySQL", "mssql": "SQL Server", "mongodb": "MongoDB", "redis": "Redis", "elasticsearch": "Elasticsearch", "ssh": "SSH", "gmail": "Gmail", "gdrive": "Google Drive", "github": "GitHub", "slack": "Slack", "zoho-mail": "Zoho Mail" };
const fmtType = t => TYPE_LABELS[t] || t.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function toYaml(form, connectors) {
  const lines = [`name: "${form.name || "Untitled Agent"}"`];
  if (form.slug)        lines.push(`slug: "${form.slug}"`);
  if (form.description) lines.push(`description: "${form.description}"`);
  if (form.group)       lines.push(`group: "${form.group}"`);
  lines.push(`enabled: ${form.enabled}`);
  if (form.visualize) lines.push(`visualize: true`);
  lines.push(`trigger:`);
  lines.push(`  type: ${form.triggerType}`);
  if (form.triggerType === "scheduled") {
    lines.push(`  cron: "${form.cronExpression || "0 9 * * *"}"`);
  }
  if (form.systemPrompt) {
    lines.push(`instructions: |`);
    form.systemPrompt.split("\n").forEach(l => lines.push(`  ${l}`));
  }
  const steps = Array.isArray(form.steps) ? form.steps : [];
  if (steps.length) {
    lines.push(`steps:`);
    steps.forEach(step => {
      lines.push(`  - name: "${step.name || ""}"`);
      if (step.content?.trim()) {
        lines.push(`    content: |`);
        step.content.split("\n").forEach(l => lines.push(`      ${l}`));
      }
    });
  }
  const selected = connectors.filter(c => (Array.isArray(form.connectorIds) ? form.connectorIds : []).includes(c.id));
  if (selected.length) {
    lines.push(`connectors:`);
    selected.forEach(c => {
      lines.push(`  - connection_name: "${c.name}"`);
      lines.push(`    connection_type: ${c.type}`);
    });
  }
  const chains = ((Array.isArray(form.chains) ? form.chains : [])).filter(c => c.nextAgent);
  if (chains.length) {
    lines.push(`chains:`);
    chains.forEach(c => {
      lines.push(`  - next_agent: "${c.nextAgent}"`);
      if (c.condition && c.condition !== "always") lines.push(`    condition: ${c.condition}`);
      if (c.triggerType && c.triggerType !== "automatic") lines.push(`    trigger_type: ${c.triggerType}`);
    });
  }
  const params = (Array.isArray(form.params) ? form.params : []);
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

function isStepComplete(stepId, form) {
  switch (stepId) {
    case "trigger":
      return !!form.name.trim() && !!form.slug.trim() &&
             (form.triggerType !== "scheduled" || !!form.cronExpression.trim());
    case "instructions":
      return !!form.systemPrompt.trim();
    default:
      return true; // optional steps are always considered complete
  }
}

function safeJson(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}
function safeArray(str) {
  const v = safeJson(str, []);
  return Array.isArray(v) ? v : [];
}
function SettingsLink() {
  const { slug } = useParams();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/workspace/${slug}/settings`)}
      className="underline text-indigo hover:text-indigo/70 transition-colors"
    >
      Workspace → Agents → Settings
    </button>
  );
}

export default function AgentStudio({ initialAgent, connectors = [], agents = [], onSave, onClose, saving, maxRounds = 25, maxChainDepth = 5 }) {
  const [activeStep, setActiveStep] = useState("trigger");
  const [form, setForm]             = useState({
    name:               initialAgent?.name               || "",
    slug:               initialAgent?.slug               || "",
    description:        initialAgent?.description        || "",
    group:              initialAgent?.group              || "",
    systemPrompt:       initialAgent?.systemPrompt       || "",
    steps:              safeArray(initialAgent?.workflow),
    connectorIds:       safeArray(initialAgent?.connectorIds),
    triggerType:        initialAgent?.triggerType        || "manual",
    cronExpression:     initialAgent?.cronExpression     || "",
    enabled:            initialAgent?.enabled !== false,
    params:             safeArray(initialAgent?.params),
    nextAgent:          initialAgent?.nextAgent          || "",
    nextAgentCondition: initialAgent?.nextAgentCondition || null,
    chains:             safeArray(initialAgent?.chains),
    visualize:          initialAgent?.visualize          || false,
    maxRounds:          initialAgent?.maxRounds          || null,
  });

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  const [slugTaken, setSlugTaken] = useState(false);
  const canSave = form.name.trim() && form.slug.trim() &&
                  (form.triggerType !== "scheduled" || form.cronExpression.trim()) && !slugTaken;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">{initialAgent ? "Edit Agent" : "New Agent"}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <>
            {/* Step rail */}
            <div className="w-56 border-r border-gray-200 bg-gray-50 flex flex-col p-4 gap-1 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Steps</p>
              {STEPS.map((step, idx) => (
                <button key={step.id} onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    activeStep === step.id
                      ? "bg-white border border-indigo/20 text-indigo shadow-sm"
                      : "text-gray-500 hover:bg-white hover:text-gray-800"
                  }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    activeStep === step.id
                      ? "bg-indigo text-white"
                      : isStepComplete(step.id, form)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{step.label}</p>
                    {step.optional && <p className="text-[9px] text-gray-400 leading-tight">Optional</p>}
                  </div>
                  <svg className={`w-3.5 h-3.5 shrink-0 ${activeStep === step.id ? "text-indigo" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                  </svg>
                </button>
              ))}

              <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
                <button onClick={onClose} disabled={saving}
                  className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={() => onSave(form)} disabled={saving || !canSave}
                  className="w-full py-2 text-xs font-semibold text-white bg-indigo rounded-xl hover:bg-indigo/90 transition-colors disabled:opacity-40">
                  {saving ? "Saving…" : initialAgent ? "Update Agent" : "Create Agent"}
                </button>
              </div>
            </div>

            {/* Step config panel */}
            <div className="flex-1 overflow-y-auto p-8">
              <StepErrorBoundary key={activeStep}>
              {activeStep === "trigger"      && <TriggerStep form={form} set={set} agentId={initialAgent?.id} onSlugStatus={s => setSlugTaken(s === "taken")} />}
              {activeStep === "connectors"   && <ConnectorsStep form={form} set={set} connectors={connectors} />}
              {activeStep === "instructions" && <InstructionsStep form={form} set={set} />}
              {activeStep === "params"       && <ParamsStep form={form} set={set} />}
              {activeStep === "chain"        && <ChainStep form={form} set={set} agents={agents} currentSlug={initialAgent?.slug} />}
              {activeStep === "preview"      && <PreviewStep form={form} set={set} connectors={connectors} maxRounds={maxRounds} maxChainDepth={maxChainDepth} />}
              </StepErrorBoundary>
            </div>
          </>
      </div>
    </div>
  );
}

function toSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function TriggerStep({ form, set, agentId, onSlugStatus }) {
  const PRESET_CRON_VALUES = PRESET_CRONS.slice(0, -1).map(p => p.cron);
  const [slugStatus, setSlugStatus] = useState(null); // null | "checking" | "available" | "taken"
  const debounceRef = useRef(null);

  function updateSlugStatus(s) { setSlugStatus(s); onSlugStatus?.(s); }

  useEffect(() => {
    const slug = form.slug?.trim();
    if (!slug) { updateSlugStatus(null); return; }
    updateSlugStatus("checking");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (agentId) params.set("excludeId", agentId);
        const res = await fetch(`/api/workspaces/agents/check-slug?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("oe_token")}` }
        });
        const data = await res.json();
        updateSlugStatus(data.available ? "available" : "taken");
      } catch { updateSlugStatus(null); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [form.slug, agentId]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Trigger</h2>
        <p className="text-sm text-gray-400 mt-1">When should this agent run?</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
          <input className="input" placeholder="Demo Runtime"
            value={form.name}
            onChange={e => {
              set("name", e.target.value);
              if (!form.slug || form.slug === toSlug(form.name)) set("slug", toSlug(e.target.value));
            }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group <span className="text-gray-400 font-normal">— optional</span></label>
          <input className="input" placeholder="e.g. Security, Sales, Finance"
            value={form.group || ""}
            onChange={e => set("group", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent ID <span className="text-gray-400 font-normal">— type @{form.slug || "agent-id"} in chat to trigger</span></label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-mono">@</span>
            <input className={`input font-mono flex-1 ${slugStatus === "taken" ? "border-red-400 focus:ring-red-300" : slugStatus === "available" ? "border-green-400 focus:ring-green-300" : ""}`} placeholder="demo-runtime"
              value={form.slug}
              onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
          </div>
          {slugStatus === "taken" && (
            <p className="text-xs text-red-500 mt-1">Agent ID "@{form.slug}" is already taken. Please choose a different one.</p>
          )}
          {slugStatus === "available" && (
            <p className="text-xs text-green-600 mt-1">@{form.slug} is available</p>
          )}
          {slugStatus === "checking" && (
            <p className="text-xs text-gray-400 mt-1">Checking availability…</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "manual", label: "Manual", desc: "Run on demand from the workspace", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" },
          { id: "scheduled", label: "Scheduled", desc: "Run automatically on a cron schedule", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map(t => (
          <button key={t.id} onClick={() => { set("triggerType", t.id); if (t.id === "manual") { set("enabled", true); set("cronExpression", ""); } }}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              form.triggerType === t.id
                ? "border-indigo bg-indigo/5"
                : "border-gray-200 hover:border-gray-300"
            }`}>
            <svg className={`w-6 h-6 mb-2 ${form.triggerType === t.id ? "text-indigo" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={t.icon} />
            </svg>
            <p className={`text-sm font-semibold ${form.triggerType === t.id ? "text-indigo" : "text-gray-700"}`}>{t.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      {form.triggerType === "scheduled" && (
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Schedule presets</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_CRONS.map(({ label, cron }) => (
                <button key={cron} onClick={() => set("cronExpression", cron === "__custom__" ? "" : cron)}
                  className={`text-xs px-3 py-2 rounded-xl border text-left transition-colors ${
                    form.cronExpression === cron || (cron === "__custom__" && !PRESET_CRON_VALUES.includes(form.cronExpression))
                      ? "border-indigo bg-indigo/10 text-indigo font-semibold"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cron expression</label>
            <input className="input font-mono" placeholder="0 9 * * *"
              value={form.cronExpression} onChange={e => set("cronExpression", e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Runs in server local time. <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-indigo underline">crontab.guru →</a></p>
          </div>
        </div>
      )}

      {form.triggerType === "scheduled" && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Enabled</p>
            <p className="text-xs text-gray-400">Agent will run on schedule when enabled</p>
          </div>
          <button onClick={() => set("enabled", !form.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? "bg-indigo" : "bg-gray-200"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Rounds <span className="text-gray-400 font-normal">— optional, overrides workspace default</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">How many tool calls this agent can make per run. Leave blank to use the workspace default.</p>
        <input
          className="input"
          type="number" min={1} max={100} step={1}
          placeholder="e.g. 25"
          value={form.maxRounds || ""}
          onChange={e => { const v = parseInt(e.target.value); set("maxRounds", isNaN(v) ? null : v); }}
          onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v)) set("maxRounds", Math.min(100, Math.max(1, v))); }}
        />
        <p className="text-[10px] text-gray-400 mt-1">Range: 1–100. Leave blank = use workspace default.</p>
      </div>

    </div>
  );
}

function ChainStep({ form, set, agents, currentSlug }) {
  const available = agents.filter(a => a.slug && a.slug !== currentSlug);
  const chains    = (Array.isArray(form.chains) ? form.chains : []);

  function addChain() {
    set("chains", [...chains, { condition: "always", nextAgent: "", triggerType: "automatic" }]);
  }

  function updateChain(i, value) {
    set("chains", chains.map((c, idx) => idx === i ? { ...c, nextAgent: value } : c));
  }

  function updateChainField(i, field, value) {
    set("chains", chains.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  function removeChain(i) {
    set("chains", chains.filter((_, idx) => idx !== i));
  }

  const filled = chains.filter(c => c.nextAgent);

  return (
    <div className="max-w-xl space-y-6 pb-40">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Chain</h2>
        <p className="text-sm text-gray-400 mt-1">Run agents sequentially after this one finishes. Use conditions inside each agent's instructions to control behaviour.</p>
      </div>

      <div className="space-y-3">
        {chains.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">No chains configured. Click Add Chain to get started.</p>
        )}

        {chains.map((chain, i) => (
          <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[10px] font-semibold text-gray-400 shrink-0">{i + 1}</span>
            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <select
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo"
              value={chain.nextAgent || ""}
              onChange={e => updateChain(i, e.target.value)}
            >
              <option value="">— Select agent —</option>
              {available.map(a => (
                <option key={a.id} value={a.slug}>@{a.slug} — {a.name}</option>
              ))}
            </select>
            <select
              className={`shrink-0 text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo ${chain.triggerType === "manual" ? "border-amber-300 text-amber-700" : "border-gray-200"}`}
              value={chain.triggerType || "automatic"}
              onChange={e => updateChainField(i, "triggerType", e.target.value)}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual Approval</option>
            </select>
            <button onClick={() => removeChain(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addChain}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo hover:text-indigo transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Chain
        </button>

        {filled.length > 0 && (
          <div className="bg-indigo/5 border border-indigo/20 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold text-indigo">Flow</p>
            <p className="text-xs text-gray-600">
              {[form.name || "This agent", ...filled.map(c => `@${c.nextAgent}`)].join(" → ")}
            </p>
            <p className="text-[10px] text-gray-400 pt-1">Max chain depth set in <SettingsLink />.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewStep({ form, set, connectors, maxRounds, maxChainDepth }) {
  const [mode, setMode] = useState("visual");
  const [yamlText, setYamlText] = useState(() => toYaml(form, connectors));
  const [yamlError, setYamlError] = useState("");

  useEffect(() => {
    if (mode === "yaml") setYamlText(toYaml(form, connectors));
  }, [mode]);

  function handleYamlChange(text) {
    setYamlText(text);
    setYamlError("");
    try {
      const y = yamlLoad(text);
      if (!y) return;
      if (y.name             !== undefined) set("name",           y.name || "");
      if (y.slug             !== undefined) set("slug",           y.slug || "");
      if (y.description      !== undefined) set("description",    y.description || "");
      if (y.group            !== undefined) set("group",          y.group || "");
      if (y.instructions     !== undefined) set("systemPrompt",   y.instructions || "");
      if (y.trigger?.type    !== undefined) set("triggerType",    y.trigger.type || "manual");
      if (y.trigger?.cron    !== undefined) set("cronExpression", y.trigger.cron || "");
      if (y.trigger?.enabled !== undefined) set("enabled",        y.trigger.enabled !== false);
      if (y.visualize        !== undefined) set("visualize",      y.visualize === true);
      if (Array.isArray(y.chains)) {
        set("chains", y.chains.filter(c => c.next_agent || c.nextAgent).map(c => ({
          condition:   c.condition || "always",
          nextAgent:   c.next_agent || c.nextAgent || "",
          triggerType: c.trigger_type || c.triggerType || "automatic",
        })));
      }
      if (Array.isArray(y.connectors)) {
        const ids = y.connectors
          .map(c => connectors.find(conn => conn.name === (c.connection_name || c.name) && conn.type === (c.connection_type || c.type))
            || connectors.find(conn => conn.name === (c.connection_name || c.name)))
          .filter(Boolean)
          .map(c => c.id);
        set("connectorIds", ids);
      }
      if (Array.isArray(y.params)) {
        set("params", y.params.map(p => ({
          name:    String(p.name    || ""),
          label:   String(p.label   || ""),
          default: String(p.default || ""),
        })));
      }
      if (Array.isArray(y.steps)) {
        set("steps", y.steps.map((s, i) => ({
          id:      uid(),
          name:    String(s.name    || `Step ${i + 1}`),
          content: String(s.content || s.instructions || ""),
        })));
        if (y.instructions !== undefined) set("systemPrompt", y.instructions || "");
      }
    } catch (e) {
      setYamlError(e.message?.split("\n")[0] || "Invalid YAML");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Flow Preview</h2>
          <p className="text-sm text-gray-400 mt-1">How your agent will execute step by step.</p>
        </div>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-1">
          {["visual", "yaml"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {m === "yaml" ? "YAML" : "Visual"}
            </button>
          ))}
        </div>
      </div>

      {mode === "visual" ? (
        <FlowChart form={form} connectors={connectors} standalone maxRounds={maxRounds} maxChainDepth={maxChainDepth} />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Edit YAML directly — changes update the form fields</p>
            <CopyButton text={yamlText} />
          </div>
          <textarea
            className="w-full bg-gray-950 text-green-400 rounded-2xl p-6 text-sm font-mono leading-relaxed resize-none outline-none border-0 focus:ring-1 focus:ring-indigo/40"
            rows={18}
            value={yamlText}
            onChange={e => handleYamlChange(e.target.value)}
            spellCheck={false}
          />
          {yamlError && (
            <p className="text-xs text-red-500 px-1">{yamlError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function estimateRounds(steps) {
  // Count expected tool calls by scanning step content for action keywords
  const actionPatterns = [
    /read_file|list_files|search_issues|get_issue/gi,
    /write_file|create_issue/gi,
    /update_rows|append_rows|read_rows/gi,
    /send_email|send_message/gi,
    /execute|run_command|ssh/gi,
    /search|query|fetch|get\b/gi,
  ];
  let total = 0;
  for (const step of (steps || [])) {
    const text = (step.content || "") + " " + (step.name || "");
    let stepCalls = 0;
    for (const pat of actionPatterns) {
      const matches = text.match(pat);
      if (matches) stepCalls += matches.length;
    }
    // Minimum 1 per step, cap per-step at 5 to avoid inflating
    total += Math.min(Math.max(stepCalls, 1), 5);
  }
  return total || (steps?.length || 0);
}

function FlowChart({ form, connectors, standalone, maxRounds = 25, maxChainDepth = 5 }) {
  const selected = connectors.filter(c => (Array.isArray(form.connectorIds) ? form.connectorIds : []).includes(c.id));

  const Node = ({ color, icon, label, sublabel }) => (
    <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 min-w-[110px] text-center ${color}`}>
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={icon} />
      </svg>
      <p className="text-xs font-semibold leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] opacity-60 font-mono leading-tight">{sublabel}</p>}
    </div>
  );

  const Arrow = () => (
    <div className="flex flex-col items-center my-1">
      <div className="w-px h-5 bg-gray-300" />
      <svg className="w-3 h-3 text-gray-300 -mt-px" fill="currentColor" viewBox="0 0 8 8">
        <path d="M0 0 L4 8 L8 0 Z" />
      </svg>
    </div>
  );

  return (
    <div className={standalone ? "w-full" : "p-5 bg-gray-50 rounded-2xl border border-gray-200 h-full flex flex-col"}>
      {!standalone && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-6">Flow Preview</p>}

      {/* Rounds budget — shown at top when steps exist */}
      {((Array.isArray(form.steps) ? form.steps : [])).length > 0 && (() => {
        const est = estimateRounds(form.steps);
        const pct = Math.min(Math.round((est / maxRounds) * 100), 100);
        const color = pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-400" : "bg-red-500";
        const textColor = pct < 70 ? "text-emerald-700" : pct < 90 ? "text-amber-700" : "text-red-600";
        const bgColor = pct < 70 ? "bg-emerald-50 border-emerald-200" : pct < 90 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
        return (
          <div className={`w-full rounded-xl border px-4 py-3 mb-5 ${bgColor}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold ${textColor}`}>Rounds Budget</span>
              <span className={`text-xs font-mono font-bold ${textColor}`}>~{est} / {maxRounds}</span>
            </div>
            <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden border border-white">
              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
              Each tool call (read, write, API) = 1 round. Max set in{" "}
              <SettingsLink />.
            </p>
          </div>
        );
      })()}

      {/* Chain depth indicator */}
      {(() => {
        const chainCount = ((Array.isArray(form.chains) ? form.chains : [])).filter(c => c.nextAgent).length;
        if (chainCount === 0) return null;
        const pct = Math.min(Math.round((chainCount / maxChainDepth) * 100), 100);
        const color = pct < 70 ? "bg-amber-400" : pct < 90 ? "bg-orange-500" : "bg-red-500";
        const textColor = pct < 70 ? "text-amber-700" : pct < 90 ? "text-orange-700" : "text-red-600";
        const bgColor = pct < 70 ? "bg-amber-50 border-amber-200" : pct < 90 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";
        return (
          <div className={`w-full rounded-xl border px-4 py-3 mb-5 ${bgColor}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold ${textColor}`}>Chain Depth</span>
              <span className={`text-xs font-mono font-bold ${textColor}`}>{chainCount} / {maxChainDepth}</span>
            </div>
            <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden border border-white">
              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
              Each agent hand-off = 1 depth level. Max set in{" "}
              <SettingsLink />.
            </p>
          </div>
        );
      })()}

      {/* Story-style vertical flow */}
      <div className={`flex flex-col items-center gap-0 ${standalone ? "" : "flex-1"}`}>

        {/* Trigger */}
        <Node
          color="border-violet-200 bg-violet-50 text-violet-700"
          icon={form.triggerType === "scheduled"
            ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            : "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"}
          label={form.triggerType === "scheduled" ? "Run on schedule" : "Triggered manually"}
          sublabel={form.triggerType === "scheduled" ? (form.cronExpression || "0 9 * * *") : "on demand"}
        />

        {/* Connectors — each as its own action node */}
        {selected.map(c => (
          <React.Fragment key={c.id}>
            <Arrow />
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 border-teal-200 bg-teal-50 text-teal-700 w-full max-w-[260px]">
              <div className="w-6 h-6 rounded-md bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {c.type.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">Connect via {c.name}</p>
                <p className="text-[10px] opacity-60 capitalize">{c.type}</p>
              </div>
            </div>
          </React.Fragment>
        ))}

        <Arrow />

        {/* Context */}
        <Node
          color="border-indigo/30 bg-indigo/5 text-indigo"
          icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"
          label="Load context"
          sublabel={form.name || "agent"}
        />

        {/* Steps */}
        {((Array.isArray(form.steps) ? form.steps : [])).map((step, i) => (
          <React.Fragment key={step.id || i}>
            <Arrow />
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 border-indigo/20 bg-indigo/5 text-indigo w-full max-w-[260px]">
              <span className="w-5 h-5 rounded-full bg-indigo text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="text-xs font-semibold leading-snug">Execute {step.name || `Step ${i + 1}`}</p>
            </div>
          </React.Fragment>
        ))}

        <Arrow />

        {/* Response */}
        <Node
          color="border-emerald-200 bg-emerald-50 text-emerald-700"
          icon={form.triggerType === "scheduled"
            ? "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"}
          label={form.triggerType === "scheduled" ? "Save run output" : `Send ${form.name || "agent"} response`}
          sublabel={form.triggerType === "scheduled" ? "logged to history" : "to the user"}
        />

        {/* Chains */}
        {((Array.isArray(form.chains) ? form.chains : [])).filter(c => c.nextAgent).map((chain, i) => (
          <React.Fragment key={i}>
            <Arrow />
            <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-700 w-full max-w-[260px]">
              <div className="flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-xs font-semibold leading-snug break-all">
                  {chain.triggerType === "manual" ? "Ask approval, then run" : "Hand off to"} @{chain.nextAgent}
                </p>
              </div>
              {chain.condition && chain.condition !== "always" && (
                <p className="text-[10px] opacity-60 pl-5">only if {chain.condition}</p>
              )}
            </div>
          </React.Fragment>
        ))}


      </div>
    </div>
  );
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function InstructionsStep({ form, set }) {
  const steps = (Array.isArray(form.steps) ? form.steps : []);

  const addStep = () => set("steps", [...steps, { id: uid(), name: "", content: "" }]);
  const updateStep = (i, key, val) => set("steps", steps.map((s, si) => si === i ? { ...s, [key]: val } : s));
  const deleteStep = (i) => set("steps", steps.filter((_, si) => si !== i));

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
        <p className="text-sm text-gray-400 mt-1">Set a role and define the steps your agent should follow.</p>
      </div>

      {/* Role / context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role & Context <span className="text-xs font-normal text-gray-400">(Agent Guardrails)</span></label>
        <textarea rows={8} className="input resize-y w-full"
          placeholder="e.g. You are a helpful AI agent. Complete the task using the available connectors and tools, then produce a clear structured output."
          value={form.systemPrompt} onChange={e => set("systemPrompt", e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Brief role description. Steps below define what the agent does.</p>
      </div>

      {/* Step cards */}
      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.id || i} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {/* Step header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="w-6 h-6 rounded-full bg-indigo text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none outline-none placeholder-gray-400"
                  value={step.name}
                  onChange={e => updateStep(i, "name", e.target.value)}
                  placeholder={`Step ${i + 1} name, e.g. Collect data`} />
                <button onClick={() => deleteStep(i)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0">
                  Delete
                </button>
              </div>

              {/* Step content */}
              <textarea
                rows={8}
                className="w-full px-4 py-3 text-sm font-mono text-gray-800 border-none outline-none resize-none bg-white"
                value={step.content}
                onChange={e => updateStep(i, "content", e.target.value)}
                placeholder={`Describe what the agent should do in this step...\n\ne.g.\n- What to collect or check\n- What rules to apply\n- What format to return`} />
            </div>
          ))}
        </div>
      )}

      {/* Add Step */}
      <button onClick={addStep}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-indigo hover:text-indigo transition-colors">
        <span className="text-base leading-none">+</span>
        {steps.length === 0 ? "Add Step 1" : `Add Step ${steps.length + 1}`}
      </button>
    </div>
  );
}

function ConnectorsStep({ form, set, connectors }) {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Connectors</h2>
        <p className="text-sm text-gray-400 mt-1">Which live data sources can this agent access?</p>
      </div>

      {connectors.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <p className="text-sm text-gray-400">No connectors in this workspace yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add connectors in Knowledge Base → Integrations.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connectors.map(c => {
            const checked = (Array.isArray(form.connectorIds) ? form.connectorIds : []).includes(c.id);
            return (
              <button key={c.id} onClick={() => set("connectorIds", checked ? (Array.isArray(form.connectorIds) ? form.connectorIds : []).filter(id => id !== c.id) : [...(Array.isArray(form.connectorIds) ? form.connectorIds : []), c.id])}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  checked ? "border-indigo bg-indigo/5" : "border-gray-200 hover:border-gray-300"
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${checked ? "bg-indigo text-white" : "bg-gray-100 text-gray-500"}`}>
                  {c.type.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{fmtType(c.type)}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? "border-indigo bg-indigo" : "border-gray-300"}`}>
                  {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParamsStep({ form, set }) {
  const params = (Array.isArray(form.params) ? form.params : []);

  function addParam() {
    set("params", [...params, { name: "", label: "", default: "" }]);
  }

  function updateParam(idx, field, value) {
    const next = params.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    set("params", next);
  }

  function removeParam(idx) {
    set("params", params.filter((_, i) => i !== idx));
  }

  return (
    <div className="max-w-xl space-y-6 pb-40">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Parameters</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define variables that can be passed at run time. Use <code className="bg-gray-100 px-1 rounded text-xs font-mono">{"{{param_name}}"}</code> in your instructions to substitute them.
        </p>
      </div>

      {params.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400">No parameters yet. Add one to make this agent dynamic.</p>
        </div>
      )}

      <div className="space-y-3">
        {params.map((p, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameter {idx + 1}</span>
              <button onClick={() => removeParam(idx)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-gray-400">(no spaces)</span></label>
                <input
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo/40 font-mono"
                  placeholder="e.g. company"
                  value={p.name}
                  onChange={e => updateParam(idx, "name", e.target.value.replace(/\s/g, "_").toLowerCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label <span className="text-gray-400">(shown in UI)</span></label>
                <input
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  placeholder="e.g. Company Name"
                  value={p.label}
                  onChange={e => updateParam(idx, "label", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Default</label>
                <input
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo/40"
                  placeholder="optional"
                  value={p.default}
                  onChange={e => updateParam(idx, "default", e.target.value)}
                />
              </div>
            </div>
            {p.name && (
              <p className="text-xs text-indigo font-mono bg-indigo/5 px-2 py-1 rounded-lg inline-block">{`{{${p.name}}}`}</p>
            )}
          </div>
        ))}
      </div>

      <button onClick={addParam}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo border border-indigo/30 rounded-xl hover:bg-indigo/5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Parameter
      </button>
    </div>
  );
}
