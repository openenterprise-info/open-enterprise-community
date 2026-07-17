import React from "react";
import { load as yamlLoad } from "js-yaml";

const TRIGGER_COLORS = {
  manual:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   label: "Manual" },
  scheduled: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", label: "Scheduled" },
  cron:      { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", label: "Scheduled" },
  chat:      { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-600",   label: "Chat" },
  event:     { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", label: "Event" },
};

const CONNECTOR_ICONS = {
  ssh: "🖥", smtp: "📧", imap: "📬", gdrive: "📂", slack: "💬",
  http: "🌐", postgres: "🐘", mysql: "🐬", mongodb: "🍃",
  notion: "📝", jira: "🎯", github: "🐙",
};

function FlowArrow() {
  return (
    <div className="flex justify-center my-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-gray-200" />
        <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21l-8-8h5V3h6v10h5z" />
        </svg>
      </div>
    </div>
  );
}

function TriggerNode({ trigger }) {
  const type = trigger?.type || trigger?.triggerType || "manual";
  const c = TRIGGER_COLORS[type] || TRIGGER_COLORS.manual;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3 mx-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>Trigger</span>
        <span className={`ml-auto text-xs font-semibold ${c.text}`}>{c.label}</span>
      </div>
      {(trigger?.cron || trigger?.cronExpression) && (
        <div className="mt-1 text-[11px] font-mono text-gray-400">{trigger.cron || trigger.cronExpression}</div>
      )}
    </div>
  );
}

function StepNode({ step, index }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 mx-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-gray-800 truncate">{step.name || `Step ${index + 1}`}</span>
      </div>
      {step.content && (
        <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed line-clamp-2 ml-7">
          {String(step.content).trim().replace(/\n/g, " ")}
        </p>
      )}
    </div>
  );
}

function ConnectorNode({ connector }) {
  const icon = CONNECTOR_ICONS[connector.type] || "🔌";
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 mx-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-green-700">{connector.name || connector.type}</div>
          {connector.type && <div className="text-[10px] text-green-500 uppercase tracking-wide">{connector.type}</div>}
        </div>
      </div>
    </div>
  );
}

function ChainNode({ chain }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 mx-2">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Chain to</div>
          <div className="text-xs font-semibold text-violet-700">{chain.agent || chain}</div>
        </div>
      </div>
    </div>
  );
}

function ParamNode({ param }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 mx-2">
      <span className="text-[10px] text-amber-600 font-mono">{param.name}</span>
      {param.label && <span className="text-[10px] text-gray-400">→ {param.label}</span>}
      {param.default !== undefined && param.default !== "" && (
        <span className="ml-auto text-[10px] font-mono text-gray-400">default: {param.default}</span>
      )}
    </div>
  );
}

// agentObj: already-parsed object (from JS template or yaml-parsed)
// yamlText: raw YAML string (used as fallback source)
export function AgentVisualFlow({ agentObj, yamlText }) {
  let parsed = agentObj;
  if (!parsed && yamlText) {
    try { parsed = yamlLoad(yamlText); } catch { /* bad yaml */ }
  }

  if (!parsed || typeof parsed !== "object") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2 bg-white">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-xs text-gray-400">Could not parse agent for visual flow.</p>
      </div>
    );
  }

  const trigger    = parsed.trigger    || { type: parsed.triggerType, cron: parsed.cronExpression };
  const steps      = Array.isArray(parsed.steps)      ? parsed.steps      : [];
  const connectors = Array.isArray(parsed.connectors) ? parsed.connectors : [];
  const chains     = Array.isArray(parsed.chains)     ? parsed.chains     : [];
  const params     = Array.isArray(parsed.params)     ? parsed.params     : [];

  return (
    <div className="overflow-y-auto h-full py-4 flex flex-col gap-0 bg-white">
      {parsed.name && (
        <div className="mx-2 mb-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Agent</div>
          <div className="text-sm font-bold text-gray-900">{parsed.name}</div>
          {parsed.description && (
            <div className="text-[11px] text-gray-500 mt-0.5">{parsed.description}</div>
          )}
        </div>
      )}

      <TriggerNode trigger={trigger} />

      {connectors.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 px-1">Connectors</div>
            <div className="flex flex-col gap-1.5">
              {connectors.map((c, i) => <ConnectorNode key={i} connector={c} />)}
            </div>
          </div>
        </>
      )}

      {steps.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 px-1">Steps</div>
            <div className="flex flex-col gap-1.5">
              {steps.map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <FlowArrow />}
                  <StepNode step={s} index={i} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      {chains.length > 0 && (
        <>
          <FlowArrow />
          <div className="mx-2 mb-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 px-1">Chains</div>
            <div className="flex flex-col gap-1.5">
              {chains.map((c, i) => <ChainNode key={i} chain={c} />)}
            </div>
          </div>
        </>
      )}

      {params.length > 0 && (
        <div className="mx-2 mt-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 px-1">Parameters</div>
          <div className="flex flex-col gap-1">
            {params.map((p, i) => <ParamNode key={i} param={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
