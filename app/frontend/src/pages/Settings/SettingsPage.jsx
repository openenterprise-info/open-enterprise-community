import React, { useState, useEffect, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PROVIDERS, EMBEDDING_PROVIDERS, VECTOR_DBS, TAG_COLOR } from "../../config/providers";
import { Spinner } from "../../components/ui";

// ── Sub-components ────────────────────────────────────────────────────────────

function ModelSelect({ providerId, triggerValue, currentModel, defaultModel, onChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (triggerValue && triggerValue !== "********") {
          if (providerId === "ollama") params.set("baseUrl", triggerValue.replace(/\/v1$/, ""));
          else params.set("apiKey", triggerValue);
        }
        const { data } = await api.get(`/models/${providerId}?${params}`);
        if (!cancelled) {
          setModels(data.models || []);
          if (data.models?.length && !data.models.includes(currentModel)) {
            const pick = data.models.find(m => m === defaultModel) || data.models[0];
            onChange(pick);
          }
        }
      } catch { if (!cancelled) setModels([]); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [providerId, triggerValue]);

  const list = models.length ? models : [defaultModel].filter(Boolean);
  if (loading) return <select className="input" disabled><option>Loading models…</option></select>;
  return (
    <select className="input" value={currentModel || defaultModel || ""} onChange={e => onChange(e.target.value)}>
      {list.map(m => <option key={m} value={m}>{m}</option>)}
      {!list.includes(currentModel) && currentModel && <option value={currentModel}>{currentModel}</option>}
    </select>
  );
}

function ProviderGrid({ providers, selectedId, onSelect, search, onSearch }) {
  const filtered = useMemo(() =>
    providers.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tag.toLowerCase().includes(search.toLowerCase())
    ),
    [providers, search]
  );
  return (
    <div>
      <div className="relative mb-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input className="input pl-9 py-2 text-sm" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search providers…" />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
        {filtered.map(p => (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)}
            className={`w-full text-left rounded-xl border-2 px-3 py-2 transition-all ${selectedId === p.id ? "border-indigo bg-indigo/5" : "border-gray-200 hover:border-indigo/40 hover:bg-gray-50"}`}>
            <div className="flex items-center justify-between gap-1">
              <span className={`text-xs font-semibold truncate ${selectedId === p.id ? "text-indigo" : "text-gray-800"}`}>{p.name}</span>
              <span className={`shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded-full ${TAG_COLOR[p.tag]}`}>{p.tag}</span>
            </div>
            {p.desc && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{p.desc}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecretField({ fieldKey, saved, placeholder, onSet }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef();

  if (saved && !editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-gray-500 font-mono tracking-widest select-none">••••••••••••••••</span>
          <span className="ml-auto text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">Saved</span>
        </div>
        <button type="button" onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="px-3 py-2 text-xs font-medium text-indigo border border-indigo/30 rounded-lg hover:bg-indigo/5 transition-colors shrink-0">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} className="input flex-1" type="password" defaultValue="" onChange={e => onSet(e.target.value)} placeholder={placeholder || "Enter API key"} autoComplete="new-password" />
      {editing && (
        <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0">Cancel</button>
      )}
    </div>
  );
}

function ProviderFields({ provider, settings, set, isLLM, isActive }) {
  const triggerField = provider.fields.find(f => f.triggersModelFetch);
  const triggerValue = triggerField ? settings[triggerField.key] : undefined;
  if (provider.fields.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
        No additional configuration required — this provider is ready to use.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {provider.fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
          {f.type === "model-select" && isLLM ? (
            <ModelSelect providerId={provider.id} triggerValue={triggerValue} currentModel={settings[f.key]} defaultModel={f.defaultModel} onChange={v => set(f.key, v)} />
          ) : f.type === "select" ? (
            <select className="input" value={settings[f.key] || f.defaultModel || (f.options?.[0] ?? "")} onChange={e => set(f.key, e.target.value)}>
              {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === "password" ? (
            <SecretField key={`${f.key}-${isActive}`} fieldKey={f.key} saved={isActive && settings[f.key] === "********"} placeholder={f.placeholder} onSet={v => set(f.key, v)} onClear={() => set(f.key, "")} />
          ) : (
            <input className="input" type="text" value={settings[f.key] ?? (f.defaultValue || "")} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} autoComplete="off" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProviderModelSelect({ providerId, value, onChange }) {
  const [models, setModels] = useState([]);
  useEffect(() => {
    api.get(`/models/${providerId}`)
      .then(r => {
        const list = r.data.models || [];
        setModels(list);
        if (!value && list.length) onChange(list[0]);
      })
      .catch(() => setModels([]));
  }, [providerId]);
  if (!models.length) {
    return <input className="input" type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Enter model name" />;
  }
  return (
    <select className="input" value={value || models[0] || ""} onChange={e => onChange(e.target.value)}>
      {models.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
  );
}

function LLMTab({ settings, set, savedSettings }) {
  const selectedId = settings.llm_provider || "openai";
  const savedId    = savedSettings.llm_provider || "openai";
  const keySaved   = selectedId === savedId && savedSettings.llm_api_key === "********";

  function handleProviderChange(id) {
    set("llm_provider", id);
    set("llm_api_key", "");
    set("llm_model", "");
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-gray-500">Language model used to answer questions in all workspaces.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
        <select className="input" value={selectedId} onChange={e => handleProviderChange(e.target.value)}>
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
        <SecretField saved={keySaved} placeholder="Enter API key" onSet={v => set("llm_api_key", v)} onClear={() => set("llm_api_key", "")} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
        <ProviderModelSelect providerId={selectedId} value={settings.llm_model} onChange={v => set("llm_model", v)} />
      </div>
    </div>
  );
}

const EMBEDDING_MODELS = {
  openai:           ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  gemini:           ["text-embedding-004", "embedding-001"],
  cohere:           ["embed-english-v3.0", "embed-multilingual-v3.0", "embed-english-light-v3.0", "embed-multilingual-light-v3.0"],
  azure:            [],
  ollama:           [],
  lmstudio:         [],
  "generic-openai": [],
};

function EmbeddingTab({ settings, set, savedSettings }) {
  const selectedId = settings.embedding_provider || "openai";
  const savedId    = savedSettings.embedding_provider || "openai";
  const keySaved   = selectedId === savedId && savedSettings.embedding_api_key === "********";
  const models     = EMBEDDING_MODELS[selectedId] || [];

  function handleProviderChange(id) {
    set("embedding_provider", id);
    set("embedding_api_key", "");
    const firstModel = (EMBEDDING_MODELS[id] || [])[0] || "";
    set("embedding_model", firstModel);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-xs text-gray-500">Embedding model used to convert documents and queries into vectors.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
        <select className="input" value={selectedId} onChange={e => handleProviderChange(e.target.value)}>
          {EMBEDDING_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
        <SecretField saved={keySaved} placeholder="Enter API key" onSet={v => set("embedding_api_key", v)} onClear={() => set("embedding_api_key", "")} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
        {models.length ? (
          <select className="input" value={settings.embedding_model || models[0]} onChange={e => set("embedding_model", e.target.value)}>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input className="input" type="text" value={settings.embedding_model || ""} onChange={e => set("embedding_model", e.target.value)} placeholder="Enter model name" />
        )}
      </div>
    </div>
  );
}

function TextSplittingTab({ settings, set }) {
  const chunkSize    = parseInt(settings.chunk_size    ?? 1000);
  const chunkOverlap = parseInt(settings.chunk_overlap ?? 150);
  const ragTopK      = parseInt(settings.rag_top_k     ?? 15);

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">Controls how documents are split into chunks before embedding, and how many chunks are retrieved at query time.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Chunk Size <span className="text-gray-400 font-normal">(characters)</span></label>
        <p className="text-xs text-gray-400 mb-2">Maximum number of characters per chunk. Recommended: 500 – 2000. Default: 1000.</p>
        <input className="input" type="number" min={100} max={10000} step={50} value={chunkSize} onChange={e => set("chunk_size", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Chunk Overlap <span className="text-gray-400 font-normal">(characters)</span></label>
        <p className="text-xs text-gray-400 mb-2">Characters shared between consecutive chunks. Recommended: 10 – 25% of Chunk Size. Default: 150.</p>
        <input className="input" type="number" min={0} max={2000} step={10} value={chunkOverlap} onChange={e => set("chunk_overlap", e.target.value)} />
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
        <p><strong>Current settings:</strong> {chunkSize} chars / chunk · {chunkOverlap} chars overlap</p>
        <p>A 10 000-character document will produce approximately {Math.ceil(10000 / Math.max(chunkSize - chunkOverlap, 1))} chunks at these settings.</p>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Retrieval Settings</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Top K Results <span className="text-gray-400 font-normal">(chunks per query)</span></label>
          <p className="text-xs text-gray-400 mb-2">Number of document chunks sent to the LLM as context. Higher values use more tokens. Default: 15.</p>
          <input className="input" type="number" min={1} max={100} step={1} value={ragTopK} onChange={e => set("rag_top_k", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function VectorDBTab({ settings, set }) {
  const [search, setSearch] = useState("");
  const selectedId = settings.vector_db_provider || "lancedb";
  const selectedProvider = VECTOR_DBS.find(p => p.id === selectedId);
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Choose the vector database for storing and searching document embeddings.</p>
      <ProviderGrid providers={VECTOR_DBS} selectedId={selectedId} onSelect={id => set("vector_db_provider", id)} search={search} onSearch={setSearch} />
      {selectedProvider && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{selectedProvider.name} configuration</p>
          <ProviderFields provider={selectedProvider} settings={settings} set={set} isLLM={false} />
        </div>
      )}
    </div>
  );
}

function AudioProviderPicker({ providers, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = providers.find(p => p.value === value) || providers[0];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-indigo/40 transition-colors">
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-gray-800">{selected.label}</span>
          <span className="text-xs text-gray-400 mt-0.5">{selected.desc}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {providers.map(p => (
              <button key={p.value} type="button" onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full flex flex-col text-left px-4 py-3 transition-colors hover:bg-gray-50 border-l-2 ${value === p.value ? "bg-indigo/5 border-indigo" : "border-transparent"}`}>
                <span className={`text-sm font-medium ${value === p.value ? "text-indigo" : "text-gray-800"}`}>{p.label}</span>
                <span className="text-xs text-gray-400 mt-0.5">{p.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TTS_PROVIDERS = [
  { value: "native",         label: "System Native",     desc: "Browser built-in speech synthesis — no API calls, works offline." },
  { value: "openai",         label: "OpenAI TTS",        desc: "High-quality voices via OpenAI tts-1 model. Uses configured OpenAI API key." },
  { value: "elevenlabs",     label: "ElevenLabs",        desc: "Premium AI voices via ElevenLabs API. Requires an ElevenLabs API key." },
  { value: "generic-openai", label: "OpenAI Compatible", desc: "Any OpenAI-compatible TTS endpoint (local or hosted)." },
];

const STT_PROVIDERS = [
  { value: "native",         label: "System Native",     desc: "Browser built-in speech recognition (Chrome/Edge). No API calls." },
  { value: "openai",         label: "OpenAI Whisper",    desc: "Transcribe via OpenAI Whisper API. Uses configured OpenAI API key." },
  { value: "deepgram",       label: "Deepgram",          desc: "Transcribe via Deepgram Nova-2. Requires a Deepgram API key." },
  { value: "generic-openai", label: "OpenAI Compatible", desc: "Any OpenAI-compatible transcription endpoint." },
];

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

function AudioTab({ settings, set }) {
  const ttsProvider = settings.tts_provider || "native";
  const sttProvider = settings.stt_provider || "native";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Text-to-Speech (TTS)</p>
        <p className="text-xs text-gray-400 mb-3">Controls the speaker icon on AI messages in chat.</p>
        <AudioProviderPicker providers={TTS_PROVIDERS} value={ttsProvider} onChange={v => set("tts_provider", v)} />
        {ttsProvider === "openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
              <select className="input" value={settings.tts_voice || "alloy"} onChange={e => set("tts_voice", e.target.value)}>
                {TTS_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select className="input" value={settings.tts_model || "tts-1"} onChange={e => set("tts_model", e.target.value)}>
                <option value="tts-1">tts-1 — faster, standard quality</option>
                <option value="tts-1-hd">tts-1-hd — slower, higher quality</option>
              </select>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Uses the OpenAI API key from <strong>LLM Provider</strong> settings.
            </div>
          </div>
        )}
        {ttsProvider === "elevenlabs" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ElevenLabs API Key</label>
              <input className="input" type="password" value={settings.tts_elevenlabs_key || ""} onChange={e => set("tts_elevenlabs_key", e.target.value)} placeholder="sk-..." autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice ID</label>
              <input className="input" value={settings.tts_elevenlabs_voice_id || ""} onChange={e => set("tts_elevenlabs_voice_id", e.target.value)} placeholder="21m00Tcm4TlvDq8ikWAM" />
              <p className="text-xs text-gray-400 mt-1">Find voice IDs in your ElevenLabs dashboard → Voices.</p>
            </div>
          </div>
        )}
        {ttsProvider === "generic-openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input className="input" value={settings.tts_generic_base_url || ""} onChange={e => set("tts_generic_base_url", e.target.value)} placeholder="http://localhost:8080/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input className="input" type="password" value={settings.tts_generic_api_key || ""} onChange={e => set("tts_generic_api_key", e.target.value)} placeholder="Leave blank if not required" autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
              <input className="input" value={settings.tts_generic_voice || ""} onChange={e => set("tts_generic_voice", e.target.value)} placeholder="alloy" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-6">
        <p className="text-sm font-semibold text-gray-700 mb-1">Speech-to-Text (STT)</p>
        <p className="text-xs text-gray-400 mb-3">Controls the microphone button in the chat input bar.</p>
        <AudioProviderPicker providers={STT_PROVIDERS} value={sttProvider} onChange={v => set("stt_provider", v)} />
        {sttProvider === "openai" && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              Uses the OpenAI API key from <strong>LLM Provider</strong> settings. Audio recorded in chat is sent to Whisper for transcription.
            </div>
          </div>
        )}
        {sttProvider === "deepgram" && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Deepgram API Key</label>
            <input className="input" type="password" value={settings.stt_deepgram_key || ""} onChange={e => set("stt_deepgram_key", e.target.value)} placeholder="Your Deepgram API key" autoComplete="off" />
          </div>
        )}
        {sttProvider === "generic-openai" && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input className="input" value={settings.stt_generic_base_url || ""} onChange={e => set("stt_generic_base_url", e.target.value)} placeholder="http://localhost:8080/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input className="input" type="password" value={settings.stt_generic_api_key || ""} onChange={e => set("stt_generic_api_key", e.target.value)} placeholder="Leave blank if not required" autoComplete="off" />
            </div>
          </div>
        )}
        {sttProvider !== "native" && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Non-native STT: click mic to start recording, click again to stop and transcribe.
          </div>
        )}
      </div>
    </div>
  );
}

function BrandingTab({ settings, set }) {
  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("branding_logo", ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-xs text-gray-500">
        White-label the app name, logo, and footer. Leave blank to keep the Open Enterprise defaults.
      </p>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            {settings.branding_logo
              ? <img src={settings.branding_logo} alt="logo" className="w-full h-full object-contain" />
              : <span className="text-white font-black text-sm">{(settings.branding_name?.[0] || "E").toUpperCase()}</span>
            }
          </div>
          <div className="flex-1">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {settings.branding_logo && (
              <button type="button" onClick={() => set("branding_logo", "")}
                className="ml-2 text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
            <p className="text-xs text-gray-400 mt-1">PNG, SVG or JPG. Displayed at 32×32 px.</p>
          </div>
        </div>
      </div>

      {/* Brand Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
        <input className="input" type="text" value={settings.branding_name || ""}
          onChange={e => set("branding_name", e.target.value)} placeholder="e.g. Acme Corp" />
        <p className="text-xs text-gray-400 mt-1">Replaces "Open Enterprise" in the top navbar and footer.</p>
      </div>

      {/* Brand URL */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Brand URL</label>
        <input className="input" type="url" value={settings.branding_url || ""}
          onChange={e => set("branding_url", e.target.value)} placeholder="e.g. https://acme.com" />
        <p className="text-xs text-gray-400 mt-1">The footer "Powered by" text links to this URL.</p>
      </div>

      {settings.branding_name && (
        <div className="rounded-lg bg-indigo/5 border border-indigo/20 px-4 py-3 text-sm text-indigo">
          Preview: <span className="font-medium">Powered by {settings.branding_name}</span>
          {settings.branding_url && <span className="text-xs text-indigo/60 ml-1">→ {settings.branding_url}</span>}
        </div>
      )}
    </div>
  );
}

const SETTINGS_TABS = [
  { id: "llm",       label: "LLM Provider" },
  { id: "embedding", label: "Embedding Provider" },
  { id: "vectordb",  label: "Vector Database" },
  { id: "splitting", label: "Chunking" },
  { id: "audio",     label: "Audio" },
  { id: "branding",  label: "Branding" },
];

function SettingsForm() {
  const [activeTab, setActiveTab]         = useState("llm");
  const [settings, setSettings]           = useState({});
  const [savedSettings, setSavedSettings] = useState({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [switchConfirm, setSwitchConfirm] = useState(null);

  useEffect(() => {
    api.get("/settings").then(r => {
      const s = r.data.settings || {};
      setSettings(s);
      setSavedSettings(s);
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  async function doSave() {
    setSaving(true);
    try {
      await api.put("/settings", { settings });
      const fresh = (await api.get("/settings")).data.settings || {};
      setSettings(fresh);
      setSavedSettings(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    const llmSwitching = settings.llm_provider !== savedSettings.llm_provider && savedSettings.llm_api_key === "********";
    const embSwitching = settings.embedding_provider !== savedSettings.embedding_provider && savedSettings.embedding_api_key === "********";
    if (llmSwitching || embSwitching) {
      const lines = [
        llmSwitching && { from: PROVIDERS.find(p => p.id === savedSettings.llm_provider)?.name || savedSettings.llm_provider, to: PROVIDERS.find(p => p.id === settings.llm_provider)?.name || settings.llm_provider, label: "LLM" },
        embSwitching && { from: EMBEDDING_PROVIDERS.find(p => p.id === savedSettings.embedding_provider)?.name || savedSettings.embedding_provider, to: EMBEDDING_PROVIDERS.find(p => p.id === settings.embedding_provider)?.name || settings.embedding_provider, label: "Embedding" },
      ].filter(Boolean);
      setSwitchConfirm({ lines, onConfirm: () => { setSwitchConfirm(null); doSave(); } });
      return;
    }
    doSave();
  }

  if (loading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <>
      {switchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Switch Provider?</h3>
                  <p className="text-sm text-gray-500 mt-1">The following changes will remove your existing API key and affect all workspaces immediately.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {switchConfirm.lines.map(l => (
                  <div key={l.label} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-16 shrink-0">{l.label}</span>
                    <span className="font-medium text-gray-700">{l.from}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    <span className="font-semibold text-gray-900">{l.to}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button type="button" onClick={() => setSwitchConfirm(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button type="button" onClick={switchConfirm.onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors">Yes, switch provider</button>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSave}>
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
          {SETTINGS_TABS.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white text-indigo shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-white/60"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "llm"       && <LLMTab settings={settings} set={set} savedSettings={savedSettings} />}
        {activeTab === "embedding" && <EmbeddingTab settings={settings} set={set} savedSettings={savedSettings} />}
        {activeTab === "vectordb"  && <VectorDBTab settings={settings} set={set} />}
        {activeTab === "splitting" && <TextSplittingTab settings={settings} set={set} />}
        {activeTab === "audio"     && <AudioTab settings={settings} set={set} />}
        {activeTab === "branding"  && <BrandingTab settings={settings} set={set} />}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 mt-5">
          {saved && <span className="text-green-600 text-sm font-medium">Settings saved!</span>}
          <button type="submit" className="btn-primary px-5 py-2" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button>
        </div>
      </form>
    </>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Instance Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Configure LLM, embedding, vector database, text splitting, and audio</p>
      </div>
      <div className="px-6 py-5">
        <SettingsForm />
      </div>
    </div>
  );
}
