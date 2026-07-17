import React, { useState, useEffect } from "react";
import { TEMPLATES } from "../../utils/agentTemplates";
import { agentToYaml } from "../../utils/agentToYaml";

const CATEGORIES = ["All", "My Agents", "Security", "Sales", "Marketing", "Integrations", "Analytics"];

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
  "My Agents": (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(loadSaved);

  // Reload saved agents when page comes into focus (user might have saved from Builder)
  useEffect(() => {
    const onFocus = () => setSaved(loadSaved());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Convert saved YAML-parsed agents to template-compatible shape
  const savedTemplates = saved.map(s => ({
    slug:        s.slug || "custom-" + Date.now(),
    name:        s.name || "Untitled Agent",
    description: s.description || "",
    category:    "My Agents",
    color:       "bg-indigo-100 text-indigo-700",
    triggerType: s.trigger?.type || s.triggerType || "manual",
    cronExpression: s.trigger?.cron || s.cronExpression || "",
    steps:       Array.isArray(s.steps) ? s.steps : [],
    systemPrompt: s.instructions || s.systemPrompt || "",
    yaml:        s.yaml,
    source:      "builder",
  }));

  const allTemplates = [...TEMPLATES, ...savedTemplates];

  const filtered = allTemplates.filter(t => {
    if (activeCategory === "My Agents") return t.category === "My Agents";
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  function deleteSaved(slug) {
    const next = saved.filter(s => s.slug !== slug);
    setSaved(next);
    localStorage.setItem("oe_marketplace_saved", JSON.stringify(next));
    setPreview(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-sm text-gray-400 mt-0.5">Ready-to-use agent templates — pick one and deploy in seconds</p>
          </div>
          <div className="relative w-64 shrink-0">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo/30"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {CATEGORIES.map(cat => {
            const count = cat === "My Agents" ? savedTemplates.length : cat === "All" ? null : TEMPLATES.filter(t => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  activeCategory === cat
                    ? "bg-indigo text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat !== "All" && CATEGORY_ICONS[cat]}
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
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {activeCategory === "My Agents"
              ? <><p className="text-sm font-medium text-gray-500">No saved agents yet</p><p className="text-xs text-gray-400 mt-1">Use Agent Builder to design and save agents here</p></>
              : <><p className="text-sm font-medium text-gray-500">No templates match your search</p><button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-3 text-xs text-indigo hover:underline">Clear filters</button></>
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(tpl => {
              const triggerKey = tpl.triggerType || "manual";
              const trigger = TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.manual;
              return (
                <div
                  key={tpl.slug}
                  className="group border border-gray-200 rounded-xl p-5 hover:border-indigo/40 hover:shadow-md transition-all bg-white flex flex-col gap-3 cursor-pointer"
                  onClick={() => setPreview(tpl)}
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
                        onClick={e => { e.stopPropagation(); setPreview(tpl); }}
                        className="shrink-0 text-xs font-semibold text-indigo hover:underline"
                      >
                        Preview →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview drawer */}
      {preview && <PreviewDrawer tpl={preview} onClose={() => setPreview(null)} onDelete={preview.source === "builder" ? () => deleteSaved(preview.slug) : null} />}
    </div>
  );
}

function PreviewDrawer({ tpl, onClose, onDelete }) {
  const triggerKey = tpl.triggerType || "manual";
  const trigger = TRIGGER_LABELS[triggerKey] || TRIGGER_LABELS.manual;
  const [yamlOpen, setYamlOpen] = useState(false);
  const yaml = tpl.yaml || agentToYaml(tpl);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[520px] bg-white h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tpl.color || "bg-gray-100 text-gray-600"}`}>{tpl.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${trigger.color}`}>{trigger.label}</span>
                {tpl.cronExpression && (
                  <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tpl.cronExpression}</span>
                )}
                {tpl.source === "builder" && (
                  <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Builder</span>
                )}
              </div>
              <h2 className="text-base font-bold text-gray-900">{tpl.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Workflow Steps</p>
            <div className="space-y-3">
              {tpl.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-indigo/10 text-indigo text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    {i < tpl.steps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{step.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed whitespace-pre-line line-clamp-4">{step.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System prompt */}
          {(tpl.systemPrompt || tpl.instructions) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">System Prompt</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono leading-relaxed whitespace-pre-wrap line-clamp-10">
                {tpl.systemPrompt || tpl.instructions}
              </div>
            </div>
          )}

          {/* YAML preview toggle */}
          <div>
            <button
              onClick={() => setYamlOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${yamlOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {yamlOpen ? "Hide" : "Show"} YAML
            </button>
            {yamlOpen && (
              <pre className="mt-2 bg-gray-900 text-green-300 text-xs font-mono p-4 rounded-lg overflow-x-auto whitespace-pre leading-relaxed">
                {yaml}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => downloadYaml(tpl)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download YAML
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
