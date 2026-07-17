import React, { useState, useEffect } from "react";
import { load as yamlLoad } from "js-yaml";
import { TEMPLATES } from "../../utils/agentTemplates";
import { agentToYaml } from "../../utils/agentToYaml";
import { AgentVisualFlow } from "../../components/AgentVisualFlow";

const MARKET_CATEGORIES = ["All", "Security", "Sales", "Marketing", "Integrations", "Analytics"];

const CATEGORY_ICONS = {
  Security: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Sales: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Marketing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Integrations: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Analytics: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const TRIGGER_LABELS = {
  manual:    { label: "Manual",    color: "bg-gray-100 text-gray-600" },
  cron:      { label: "Scheduled", color: "bg-blue-100 text-blue-600" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-600" },
  chat:      { label: "Chat",      color: "bg-teal-100 text-teal-600" },
  event:     { label: "Event",     color: "bg-purple-100 text-purple-600" },
};

function loadSaved() {
  try { return JSON.parse(localStorage.getItem("oe_marketplace_saved") || "[]"); } catch { return []; }
}

function downloadYaml(tpl) {
  const yaml = tpl.yaml || agentToYaml(tpl);
  const blob = new Blob([yaml], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tpl.slug || "agent"}.yaml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AgentCard({ tpl, onPreview }) {
  const triggerKey = tpl.triggerType || "manual";
  const trigger = TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.manual;
  return (
    <div
      className="group border border-gray-200 rounded-xl p-5 hover:border-indigo/40 hover:shadow-md transition-all bg-white flex flex-col gap-3 cursor-pointer"
      onClick={() => onPreview(tpl)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tpl.color || "bg-gray-100 text-gray-600"}`}>
            {tpl.category}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trigger.color}`}>
            {trigger.label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tpl.source === "builder" && (
            <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Builder</span>
          )}
          <span className="text-[10px] text-gray-400">{tpl.steps.length} step{tpl.steps.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900 group-hover:text-indigo transition-colors">{tpl.name}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{tpl.description}</p>
      </div>

      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {tpl.steps.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s.name}</span>
          ))}
          {tpl.steps.length > 3 && (
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">+{tpl.steps.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); downloadYaml(tpl); }}
            className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
            title="Download YAML"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onPreview(tpl); }}
            className="shrink-0 text-indigo hover:text-indigo/70 transition-colors"
            title="Preview"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [mainTab, setMainTab]           = useState("marketplace"); // "marketplace" | "my-agents"
  const [search, setSearch]             = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [preview, setPreview]           = useState(null);
  const [previewReadOnly, setPreviewReadOnly] = useState(true);
  const [saved, setSaved]               = useState(loadSaved);

  useEffect(() => {
    const onFocus = () => setSaved(loadSaved());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Reset search/category when switching tabs
  useEffect(() => {
    setSearch("");
    setActiveCategory("All");
    setPreview(null);
  }, [mainTab]);

  const savedTemplates = saved.map(s => ({
    slug:           s.slug || "custom-" + Date.now(),
    name:           s.name || "Untitled Agent",
    description:    s.description || "",
    category:       "My Agents",
    color:          "bg-indigo-100 text-indigo-700",
    triggerType:    s.trigger?.type || s.triggerType || "manual",
    cronExpression: s.trigger?.cron || s.cronExpression || "",
    steps:          Array.isArray(s.steps)      ? s.steps      : [],
    connectors:     Array.isArray(s.connectors) ? s.connectors : [],
    systemPrompt:   s.instructions || s.systemPrompt || "",
    yaml:           s.yaml,
    source:         "builder",
  }));

  const q = search.toLowerCase();

  const marketplaceFiltered = TEMPLATES.filter(t => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const myAgentsFiltered = savedTemplates.filter(t =>
    !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  );

  function openPreview(tpl, readOnly) {
    setPreview(tpl);
    setPreviewReadOnly(readOnly);
  }

  function deleteSaved(slug) {
    const next = saved.filter(s => s.slug !== slug);
    setSaved(next);
    localStorage.setItem("oe_marketplace_saved", JSON.stringify(next));
    setPreview(null);
  }

  function handleSave(entry) {
    const existing = [...saved];
    const idx = existing.findIndex(s => s.slug === entry.slug);
    if (idx >= 0) existing[idx] = entry; else existing.push(entry);
    setSaved(existing);
    localStorage.setItem("oe_marketplace_saved", JSON.stringify(existing));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-sm text-gray-400 mt-0.5">Browse and deploy ready-to-use agents</p>
          </div>
          <div className="relative w-64 shrink-0">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo/30"
            />
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-0">
          <button
            onClick={() => setMainTab("marketplace")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              mainTab === "marketplace"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Marketplace
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mainTab === "marketplace" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
              {TEMPLATES.length}
            </span>
          </button>
          <button
            onClick={() => setMainTab("my-agents")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              mainTab === "my-agents"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            My Agents
            {savedTemplates.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mainTab === "my-agents" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                {savedTemplates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Marketplace tab ── */}
        {mainTab === "marketplace" && (
          <>
            {/* Category pills */}
            <div className="flex items-center gap-2 px-6 py-3 flex-wrap border-b border-gray-100">
              {MARKET_CATEGORIES.map(cat => {
                const count = cat === "All" ? null : TEMPLATES.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      activeCategory === cat ? "bg-indigo text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                    {cat}
                    {count != null && (
                      <span className={`text-[10px] font-bold px-1 rounded-full ${activeCategory === cat ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-5">
              {marketplaceFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No templates match your search</p>
                  <button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-3 text-xs text-indigo hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {marketplaceFiltered.map(tpl => (
                    <AgentCard key={tpl.slug} tpl={tpl} onPreview={t => openPreview(t, true)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── My Agents tab ── */}
        {mainTab === "my-agents" && (
          <div className="px-6 py-5">
            {myAgentsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {q
                  ? <><p className="text-sm font-medium text-gray-500">No saved agents match your search</p><button onClick={() => setSearch("")} className="mt-3 text-xs text-indigo hover:underline">Clear search</button></>
                  : <><p className="text-sm font-medium text-gray-500">No agents saved yet</p><p className="text-xs text-gray-400 mt-1">Use Agent Builder to design and save agents here</p></>
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {myAgentsFiltered.map(tpl => (
                  <AgentCard key={tpl.slug} tpl={tpl} onPreview={t => openPreview(t, false)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview drawer */}
      {preview && (
        <PreviewDrawer
          tpl={preview}
          readOnly={previewReadOnly}
          onClose={() => setPreview(null)}
          onDelete={!previewReadOnly ? () => deleteSaved(preview.slug) : null}
          onSave={!previewReadOnly ? handleSave : null}
        />
      )}
    </div>
  );
}

function PreviewDrawer({ tpl, readOnly, onClose, onDelete, onSave }) {
  const triggerKey = tpl.triggerType || "manual";
  const trigger = TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.manual;
  const [tab, setTab] = useState("flow");
  const [copied, setCopied] = useState(false);
  const [saveHint, setSaveHint] = useState("");

  const baseYaml = tpl.yaml || agentToYaml(tpl);
  const [editedYaml, setEditedYaml] = useState(baseYaml);

  // Parse live so Visual Flow stays in sync (also works for read-only)
  let parsedAgent = null;
  try { parsedAgent = yamlLoad(editedYaml); } catch { /* invalid yaml */ }

  const agentObj = parsedAgent && typeof parsedAgent === "object" ? {
    name:        parsedAgent.name        || tpl.name,
    description: parsedAgent.description || tpl.description,
    trigger: {
      type: parsedAgent.trigger?.type || tpl.triggerType || "manual",
      cron: parsedAgent.trigger?.cron  || tpl.cronExpression,
    },
    steps:      Array.isArray(parsedAgent.steps)      ? parsedAgent.steps      : [],
    connectors: Array.isArray(parsedAgent.connectors) ? parsedAgent.connectors : [],
    chains:     Array.isArray(parsedAgent.chains)     ? parsedAgent.chains     : [],
    params:     Array.isArray(parsedAgent.params)     ? parsedAgent.params     : [],
  } : {
    name: tpl.name, description: tpl.description,
    trigger: { type: tpl.triggerType || "manual", cron: tpl.cronExpression },
    steps: tpl.steps || [], connectors: tpl.connectors || [],
    chains: tpl.chains || [], params: tpl.params || [],
  };

  function copyYaml() {
    navigator.clipboard.writeText(editedYaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSave() {
    if (!parsedAgent || typeof parsedAgent !== "object") {
      setSaveHint("Invalid YAML — fix errors before saving.");
      setTimeout(() => setSaveHint(""), 3500);
      return;
    }
    const entry = {
      ...parsedAgent,
      yaml:    editedYaml,
      slug:    parsedAgent.slug || tpl.slug || "agent-" + Date.now(),
      savedAt: Date.now(),
      source:  "builder",
    };
    onSave(entry);
    setSaveHint("Saved!");
    setTimeout(() => setSaveHint(""), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[560px] bg-white h-full flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tpl.color || "bg-gray-100 text-gray-600"}`}>{tpl.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trigger.color}`}>{trigger.label}</span>
                {tpl.cronExpression && (
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tpl.cronExpression}</span>
                )}
                {readOnly && (
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Read-only</span>
                )}
              </div>
              <h2 className="text-base font-bold text-gray-900">{tpl.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">&times;</button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 shrink-0">
          {[
            { key: "flow", label: "Visual Flow", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0h6m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H9m6 0V7m0 10a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2" /> },
            { key: "yaml", label: "YAML",        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 ${
                tab === key ? "text-indigo-600 border-indigo-500" : "text-gray-400 border-transparent hover:text-gray-600"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === "flow" && (
            <AgentVisualFlow agentObj={agentObj} yamlText={editedYaml} />
          )}

          {tab === "yaml" && (
            <div className="h-full bg-gray-900 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 shrink-0">
                <span className="text-xs text-gray-400 font-mono flex-1">{tpl.slug || "agent"}.yaml</span>
                <button
                  onClick={copyYaml}
                  title="Copy"
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${copied ? "text-green-400" : "text-gray-400 hover:text-white"}`}
                >
                  {copied
                    ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => downloadYaml({ ...tpl, yaml: editedYaml })}
                  title="Download YAML"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>

              {readOnly ? (
                <pre className="flex-1 overflow-y-auto p-4 text-xs font-mono text-green-300 leading-relaxed whitespace-pre">
                  {editedYaml}
                </pre>
              ) : (
                <textarea
                  className="flex-1 w-full resize-none p-4 text-xs font-mono text-green-300 bg-gray-900 outline-none leading-relaxed"
                  value={editedYaml}
                  onChange={e => setEditedYaml(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
          {onDelete && (
            <button onClick={onDelete} className="px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
          {saveHint && (
            <span className={`text-xs font-medium ${saveHint.startsWith("Saved") ? "text-green-600" : "text-red-500"}`}>
              {saveHint}
            </span>
          )}
          <div className="flex-1" />
          {onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
