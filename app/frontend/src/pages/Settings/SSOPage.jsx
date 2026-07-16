import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

const SSO_PROVIDERS = [
  { id: "google",    label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "github",    label: "GitHub" },
  { id: "facebook",  label: "Facebook" },
  { id: "apple",     label: "Apple", note: "Requires p8 private key — contact support" },
  { id: "zoho",      label: "Zoho" },
];

export default function SSOPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [provider,     setProvider]     = useState("");
  const [clientId,     setClientId]     = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [enabled,      setEnabled]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [saved,        setSaved]        = useState(false);
  const [callbackUrl,  setCallbackUrl]  = useState("");

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const [settingsRes, configRes] = await Promise.all([
        api.get("/settings"),
        api.get("/sso/config"),
      ]);
      const s = settingsRes.data.settings || {};
      setProvider(s["sso.provider"] || "");
      setClientId(s["sso.clientId"] || "");
      setClientSecret(s["sso.clientSecret"] ? "********" : "");
      setEnabled(s["sso.enabled"] === "true");
      setCallbackUrl(configRes.data.callbackUrl || "");
    } catch {
      setError("Failed to load SSO config");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.put("/sso/config", { provider, clientId, clientSecret, enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Single Sign-On</h1>
        <p className="text-sm text-gray-500 mt-1">
          Allow users to log in with their existing identity provider. Users must already have an account matching their SSO email.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-4 font-bold text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Provider selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">OAuth 2.0 Provider</h3>
        <div className="grid grid-cols-2 gap-2">
          {SSO_PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                provider === p.id
                  ? "border-indigo bg-indigo/5 text-indigo"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${provider === p.id ? "bg-indigo" : "bg-gray-300"}`} />
              {p.label}
            </button>
          ))}
        </div>
        {provider === "apple" && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Apple requires a p8 private key to generate the client secret. Contact support to enable this provider.
          </p>
        )}
      </div>

      {/* Credentials */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Credentials</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="Paste your OAuth 2.0 Client ID"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            placeholder="Paste your OAuth 2.0 Client Secret"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Callback URL (register this in your provider)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={callbackUrl}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 select-all"
            />
            <button
              onClick={() => navigator.clipboard.writeText(callbackUrl)}
              className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              title="Copy"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Enable SSO on login page</p>
          <p className="text-xs text-gray-400 mt-0.5">Shows "Login via SSO" button on the sign-in page</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-indigo" : "bg-gray-200"
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`} />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={saving || !provider}
          className="px-5 py-2 rounded-lg bg-indigo text-white text-sm font-semibold hover:bg-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save SSO Configuration"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
