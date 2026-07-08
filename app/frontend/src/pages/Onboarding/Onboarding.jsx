import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PROVIDERS, TAG_COLOR } from "../../config/providers";

// ─── Provider card ────────────────────────────────────────────────────────────
function ProviderCard({ p, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${selected ? "border-indigo bg-indigo/5 shadow-sm" : "border-gray-200 hover:border-indigo/40 hover:bg-gray-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold ${selected ? "text-indigo" : "text-gray-800"}`}>{p.name}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_COLOR[p.tag]}`}>{p.tag}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{p.desc}</p>
    </button>
  );
}

// ─── Dynamic model selector ───────────────────────────────────────────────────
function ModelSelect({ providerId, triggerValue, currentModel, defaultModel, onChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (triggerValue) {
          // apiKey or baseUrl depending on provider
          if (providerId === "ollama") params.set("baseUrl", triggerValue.replace(/\/v1$/, ""));
          else params.set("apiKey", triggerValue);
        }
        const { data } = await api.get(`/models/${providerId}?${params}`);
        if (!cancelled) {
          setModels(data.models || []);
          // Auto-select default if current value not in list
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

  if (loading) return (
    <select className="input" disabled>
      <option>Loading models…</option>
    </select>
  );

  const list = models.length ? models : [defaultModel].filter(Boolean);

  return (
    <select className="input" value={currentModel || defaultModel || ""} onChange={e => onChange(e.target.value)}>
      {list.map(m => <option key={m} value={m}>{m}</option>)}
      {!list.includes(currentModel) && currentModel && (
        <option value={currentModel}>{currentModel}</option>
      )}
    </select>
  );
}

// ─── Per-provider field form ──────────────────────────────────────────────────
function ProviderFields({ provider, values, onChange }) {
  if (!provider) return null;

  // Find the field that triggers model fetching (api key or base url)
  const triggerField = provider.fields.find(f => f.triggersModelFetch);
  const triggerValue = triggerField ? values[triggerField.key] : undefined;

  return (
    <div className="space-y-3 pt-1">
      {provider.fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
          {f.type === "model-select" ? (
            <ModelSelect
              providerId={provider.id}
              triggerValue={triggerValue}
              currentModel={values[f.key]}
              defaultModel={f.defaultModel}
              onChange={v => onChange(f.key, v)}
            />
          ) : (
            <input
              className="input"
              type={f.type === "password" ? "password" : "text"}
              value={values[f.key] ?? (f.defaultValue || "")}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              autoComplete="off"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Onboarding ─────────────────────────────────────────────────────────
export default function Onboarding() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [account, setAccount] = useState({ name: "", email: "", password: "" });
  const [selectedProviderId, setSelectedProviderId] = useState("openai");
  const [providerSettings, setProviderSettings] = useState({});

  useEffect(() => {
    if (!user || user.id !== 0) { navigate("/login"); return; }
    api.get("/setup/status").then(r => { if (r.data.setupComplete) navigate("/"); }).catch(() => {});
  }, [user]);

  const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId);

  const filtered = useMemo(() =>
    PROVIDERS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.tag.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  function setProviderField(key, value) {
    setProviderSettings(s => ({ ...s, [key]: value }));
  }

  // Prefill defaults when switching providers
  function selectProvider(id) {
    setSelectedProviderId(id);
    const p = PROVIDERS.find(x => x.id === id);
    const defaults = {};
    p?.fields.forEach(f => { if (f.defaultValue) defaults[f.key] = f.defaultValue; if (f.options) defaults[f.key] = f.options[0]; });
    setProviderSettings(prev => ({ ...defaults, ...prev }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const settings = {
        llm_provider: selectedProviderId,
        ...providerSettings,
        embedding_provider: "openai",
        embedding_model: "text-embedding-3-small",
      };
      await api.post("/setup/complete", { ...account, settings });
      // Stay logged in as super admin — go to admin panel to continue config
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo rounded-2xl mb-4">
            <span className="text-white font-black text-2xl">E</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Welcome to Open Enterprise</h1>
          <p className="text-slate-400 text-sm mt-1">Set up your Knowledge Hub</p>
        </div>

        {/* Step indicators — step 1 (Super Admin Login) is always done */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["Super Admin Login", "Admin Account", "LLM Provider"].map((label, i) => {
            const displayStep = i + 1;
            const internalStep = i; // step 1 done, internal step 1=Account, 2=LLM
            const done = displayStep === 1 || internalStep < step;
            const active = internalStep === step && displayStep !== 1;
            return (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-2 ${done || active ? "opacity-100" : "opacity-50"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-green-500 text-white" : active ? "bg-indigo text-white" : "bg-slate-600 text-slate-300"}`}>
                    {done ? "✓" : displayStep}
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{label}</span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-600" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="card p-6">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <form onSubmit={e => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <h2 className="font-bold text-gray-800 text-base mb-4">Create your admin account</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input className="input" value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input className="input" type="email" value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} placeholder="admin@company.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input className="input" type="password" value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} placeholder="Minimum 8 characters" minLength={8} required />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5 mt-2">Continue &rarr;</button>
            </form>
          )}

          {/* ── Step 2: LLM Provider ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <h2 className="font-bold text-gray-800 text-base mb-1">Choose your LLM provider</h2>
              <p className="text-gray-500 text-xs mb-4">You can change this later in Admin Settings.</p>

              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  className="input pl-9 py-2 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search providers…"
                />
              </div>

              {/* Provider grid */}
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 mb-4">
                {filtered.map(p => (
                  <ProviderCard key={p.id} p={p} selected={selectedProviderId === p.id} onClick={() => selectProvider(p.id)} />
                ))}
                {filtered.length === 0 && <p className="col-span-2 text-center text-sm text-gray-400 py-6">No providers match "{search}"</p>}
              </div>

              {/* Fields for selected provider */}
              {selectedProvider && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{selectedProvider.name} configuration</p>
                  <ProviderFields
                    provider={selectedProvider}
                    values={providerSettings}
                    onChange={setProviderField}
                  />
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-2.5">&larr; Back</button>
                <button type="submit" className="btn-primary flex-1 py-2.5" disabled={loading}>
                  {loading ? "Launching…" : "Launch Open Enterprise"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
