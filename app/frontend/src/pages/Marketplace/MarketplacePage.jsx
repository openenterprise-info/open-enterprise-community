import React, { useState, useEffect } from "react";
import { load as yamlLoad } from "js-yaml";
import { agentToYaml, agentToRuntimeYaml } from "../../utils/agentToYaml";
import { AgentVisualFlow } from "../../components/AgentVisualFlow";
import api from "../../utils/api";

function folderToLabel(folder) {
  return folder.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function parseSample({ folder, yaml, config }) {
  let parsed = {};
  try { parsed = yamlLoad(yaml) || {}; } catch { /* */ }
  return {
    folder,
    name:        parsed.name        || folderToLabel(folder),
    description: parsed.description || "",
    instructions: parsed.instructions || "",
    steps:       Array.isArray(parsed.steps)      ? parsed.steps      : [],
    connectors:  Array.isArray(parsed.connectors) ? parsed.connectors : [],
    params:      Array.isArray(parsed.params)     ? parsed.params     : [],
    category:    folderToLabel(folder),
    yaml,
    config,
  };
}



function loadSaved() {
  try { return JSON.parse(localStorage.getItem("oe_marketplace_saved") || "[]"); } catch { return []; }
}

function triggerDownload(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadYaml(tpl) {
  triggerDownload(tpl.yaml || agentToRuntimeYaml(tpl), `${tpl.folder || tpl.name?.toLowerCase().replace(/\s+/g,"-") || "agent"}.yaml`, "text/yaml");
}

function downloadConfig(tpl) {
  if (!tpl.config) return;
  triggerDownload(tpl.config, `${tpl.folder || "agent"}.oe-config.json`, "application/json");
}

function AgentCard({ tpl, onPreview }) {
  return (
    <div
      className="group border border-gray-200 rounded-xl p-5 hover:border-indigo/40 hover:shadow-md transition-all bg-white flex flex-col gap-3 cursor-pointer"
      onClick={() => onPreview(tpl)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tpl.color || "bg-gray-100 text-gray-600"}`}>
          {tpl.category}
        </span>
        <span className="text-[10px] text-gray-400">{tpl.steps.length} step{tpl.steps.length !== 1 ? "s" : ""}</span>
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
            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors"
            title="Download YAML"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            YAML
          </button>
          {tpl.config && (
            <button
              onClick={e => { e.stopPropagation(); downloadConfig(tpl); }}
              className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
              title="Download Config"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Config
            </button>
          )}
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
  const [mainTab, setMainTab]               = useState("marketplace");
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [preview, setPreview]               = useState(null);
  const [previewReadOnly, setPreviewReadOnly] = useState(true);
  const [saved, setSaved]                   = useState(loadSaved);
  const [samples, setSamples]               = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  useEffect(() => {
    api.get("/marketplace/samples")
      .then(r => setSamples((r.data.samples || []).map(parseSample)))
      .catch(() => {})
      .finally(() => setLoadingSamples(false));
  }, []);

  useEffect(() => {
    const onFocus = () => setSaved(loadSaved());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    setSearch("");
    setActiveCategory("All");
    setPreview(null);
  }, [mainTab]);

  const savedTemplates = saved.map(s => ({
    name:        s.name || "Untitled Agent",
    description: s.description || "",
    category:    "My Agents",
    color:       "bg-indigo-100 text-indigo-700",
    steps:       Array.isArray(s.steps)      ? s.steps      : [],
    connectors:  Array.isArray(s.connectors) ? s.connectors : [],
    yaml:        s.yaml,
    config:      s.config || null,
    source:      "builder",
  }));

  const q = search.toLowerCase();

  const categories = ["All", ...Array.from(new Set(samples.map(s => s.category))).sort()];

  const marketplaceFiltered = samples.filter(t => {
    const matchCat    = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const myAgentsFiltered = savedTemplates.filter(t =>
    !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  );

  function openPreview(tpl, readOnly) {
    setPreview(tpl);
    setPreviewReadOnly(readOnly);
  }

  function deleteSaved(name) {
    const next = saved.filter(s => s.name !== name);
    setSaved(next);
    localStorage.setItem("oe_marketplace_saved", JSON.stringify(next));
    setPreview(null);
  }

  function handleSave(entry) {
    const existing = [...saved];
    const idx = existing.findIndex(s => s.name === entry.name);
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
            <h1 className="text-xl font-bold text-gray-900">Templates</h1>
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
              {samples.length}
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
              {categories.map(cat => {
                const count = cat === "All" ? null : samples.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      activeCategory === cat ? "bg-indigo text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
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
              {loadingSamples ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-6 h-6 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
                </div>
              ) : marketplaceFiltered.length === 0 ? (
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
                    <AgentCard key={tpl.folder} tpl={tpl} onPreview={t => openPreview(t, true)} />
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
                  <AgentCard key={tpl.name} tpl={tpl} onPreview={t => openPreview(t, false)} />
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
          onDelete={!previewReadOnly ? () => deleteSaved(preview.name) : null}
          onSave={!previewReadOnly ? handleSave : null}
        />
      )}
    </div>
  );
}

function PreviewDrawer({ tpl, readOnly, onClose, onDelete, onSave }) {
  const [tab, setTab] = useState("flow");
  const [copied, setCopied] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const baseYaml = tpl.yaml || agentToRuntimeYaml(tpl);
  const [editedYaml, setEditedYaml] = useState(baseYaml);

  // Parse live so Visual Flow stays in sync (also works for read-only)
  let parsedAgent = null;
  let yamlError = null;
  try { parsedAgent = yamlLoad(editedYaml); } catch (e) { yamlError = e.message; }

  const agentObj = parsedAgent && typeof parsedAgent === "object" ? {
    name:        parsedAgent.name        || tpl.name,
    description: parsedAgent.description || tpl.description,
    steps:       Array.isArray(parsedAgent.steps)      ? parsedAgent.steps      : [],
    connectors:  Array.isArray(parsedAgent.connectors) ? parsedAgent.connectors : [],
    params:      Array.isArray(parsedAgent.params)     ? parsedAgent.params     : [],
  } : {
    name: tpl.name, description: tpl.description,
    steps: tpl.steps || [], connectors: tpl.connectors || [], params: tpl.params || [],
  };

  function copyYaml() {
    navigator.clipboard.writeText(editedYaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSave() {
    if (!parsedAgent || typeof parsedAgent !== "object") {
      setSaveHint(yamlError ? `YAML error: ${yamlError}` : "Invalid YAML — fix errors before saving.");
      setTimeout(() => setSaveHint(""), 5000);
      return;
    }
    const entry = {
      name:        parsedAgent.name        || tpl.name,
      description: parsedAgent.description || tpl.description || "",
      instructions: parsedAgent.instructions || parsedAgent.systemPrompt || "",
      steps:       parsedAgent.steps       || [],
      connectors:  parsedAgent.connectors  || [],
      params:      parsedAgent.params      || [],
      yaml:        editedYaml,
      savedAt:     Date.now(),
      source:      "builder",
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

        {/* Delete confirmation popup */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-2xl p-6 mx-6 w-full max-w-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Delete agent?</h3>
              <p className="text-xs text-gray-500 mb-5">
                <span className="font-medium text-gray-700">{tpl.name}</span> will be permanently removed from My Agents.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={onDelete} className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
          {onDelete && (
            <button onClick={() => setConfirmDelete(true)} className="px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
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
