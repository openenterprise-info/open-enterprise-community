import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

export default function TierLimitsPage() {
  const { user } = useAuth();
  if (user && user.id !== 0) return <Navigate to="/workspaces" replace />;

  const [config, setConfig]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/superadmin/config")
      .then(r => setConfig(r.data.config || {}))
      .catch(() => setError("Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  function set(key, value) { setConfig(c => ({ ...c, [key]: value })); }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.put("/superadmin/config", { config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tier Limits</h1>
        <p className="text-sm text-gray-500 mt-1">Configure limits and storage for this installation. Changes take effect immediately.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-4 font-bold text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Limits */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "tier.maxWorkspaces",        label: "Max Workspaces",          placeholder: "Unlimited" },
            { key: "tier.maxUsers",             label: "Max Users",               placeholder: "Unlimited" },
            { key: "tier.maxConnectors",        label: "Max Connectors",          placeholder: "Unlimited" },
            { key: "tier.maxAgentRunsPerMonth", label: "Agent Runs per Month",    placeholder: "Unlimited" },
            { key: "tier.ingestionSpaceGb",     label: "Ingestion Space (GB)",    placeholder: "Unlimited" },
            { key: "storage.maxFileSizeMb",     label: "Max Upload File Size (MB)", placeholder: "100" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                min={0}
                placeholder={placeholder}
                value={config[key] || ""}
                onChange={e => set(key, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/10"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Features</h2>
        <div className="space-y-4">
          {[
            { key: "feature.kbSharing",        label: "Knowledge Base Sharing", desc: "Allow workspaces to share their knowledge base with other workspaces." },
            { key: "feature.agentSharing",     label: "Agent Sharing",          desc: "Allow agents to be shared across workspaces." },
            { key: "feature.connectorSharing", label: "Connector Sharing",      desc: "Allow connectors to be shared across workspaces." },
          ].map(({ key, label, desc }) => {
            const on = config[key] === "true";
            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => set(key, on ? "false" : "true")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${on ? "bg-indigo" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Configuration"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Saved</span>}
      </div>
    </div>
  );
}
