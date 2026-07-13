import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />;
}

const BUILTIN_CATEGORIES = [
  { category: "passwords",    name: "Passwords & Secrets",  desc: "Detects password=, secret=, token=, pwd= patterns",      pattern: "" },
  { category: "ip_addresses", name: "IP Addresses",         desc: "Detects any IPv4 address in the message",                pattern: "" },
  { category: "api_keys",     name: "API Keys & Tokens",    desc: "Detects common API key formats (OpenAI, GitHub, AWS…)",  pattern: "" },
  { category: "credit_cards", name: "Credit Card Numbers",  desc: "Detects 16-digit card number patterns",                  pattern: "" },
];

export default function CompliancePage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [policies, setPolicies]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [form, setForm]                   = useState({ name: "", category: "custom", pattern: "", action: "block" });
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [workspaces, setWorkspaces]       = useState([]);
  const [wsLoading, setWsLoading]         = useState(false);

  useEffect(() => { fetchAll(); loadWorkspaces(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/dlp/policies");
      setPolicies(data.policies || []);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load policies");
    } finally { setLoading(false); }
  }

  async function togglePolicy(policy) {
    try {
      const { data } = await api.put(`/admin/dlp/policies/${policy.id}`, { ...policy, enabled: !policy.enabled });
      setPolicies(ps => ps.map(p => p.id === policy.id ? data.policy : p));
    } catch { setError("Failed to update policy"); }
  }

  async function changeAction(policy, action) {
    try {
      const { data } = await api.put(`/admin/dlp/policies/${policy.id}`, { ...policy, action });
      setPolicies(ps => ps.map(p => p.id === policy.id ? data.policy : p));
    } catch { setError("Failed to update action"); }
  }

  async function deletePolicy(id) {
    try {
      await api.delete(`/admin/dlp/policies/${id}`);
      setPolicies(ps => ps.filter(p => p.id !== id));
      setConfirmDelete(null);
    } catch { setError("Failed to delete policy"); }
  }

  async function addBuiltin(cat) {
    if (policies.find(p => p.category === cat.category)) return;
    try {
      const { data } = await api.post("/admin/dlp/policies", { name: cat.name, category: cat.category, pattern: cat.pattern, action: "block" });
      setPolicies(ps => [...ps, data.policy]);
    } catch { setError("Failed to add policy"); }
  }

  async function addCustom() {
    if (!form.name || !form.pattern) { setError("Name and pattern are required"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/admin/dlp/policies", form);
      setPolicies(ps => [...ps, data.policy]);
      setShowAdd(false);
      setForm({ name: "", category: "custom", pattern: "", action: "block" });
    } catch (e) { setError(e.response?.data?.error || "Failed to create policy"); }
    finally { setSaving(false); }
  }

  async function loadWorkspaces() {
    setWsLoading(true);
    try {
      const { data } = await api.get("/admin/workspaces");
      setWorkspaces(data.workspaces || []);
    } catch { setError("Failed to load workspaces"); }
    finally { setWsLoading(false); }
  }

  async function toggleDlp(ws) {
    try {
      const { data } = await api.put(`/admin/workspaces/${ws.id}`, { dlpEnabled: !ws.dlpEnabled });
      setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, dlpEnabled: data.workspace.dlpEnabled } : w));
    } catch { setError("Failed to update workspace"); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Security &amp; Compliance <span className="text-base font-normal text-gray-400">(Organization Guardrails)</span></h1>
        <p className="text-sm text-gray-400 mt-1">Data Loss Prevention — block, redact, or audit sensitive content before it reaches the AI model.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {error}<button onClick={() => setError("")} className="ml-4 font-bold">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Built-in Detectors</h2>
                <p className="text-xs text-gray-400 mt-0.5">One click to activate. Patterns are maintained automatically.</p>
              </div>
            </div>
            <div className="space-y-3">
              {BUILTIN_CATEGORIES.map(cat => {
                const existing = policies.find(p => p.category === cat.category);
                return (
                  <div key={cat.category} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${existing?.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                        <p className="text-xs text-gray-400">{cat.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {existing ? (
                        <>
                          <select value={existing.action} onChange={e => changeAction(existing, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white">
                            <option value="block">Block</option>
                            <option value="warn">Warn</option>
                            <option value="redact">Redact</option>
                            <option value="audit">Audit only</option>
                          </select>
                          <button onClick={() => togglePolicy(existing)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${existing.enabled ? "bg-indigo" : "bg-gray-200"}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${existing.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => addBuiltin(cat)}
                          className="text-xs font-medium text-indigo border border-indigo/30 px-3 py-1.5 rounded-lg hover:bg-indigo/5 transition-colors">
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Custom Policies</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add client names, project codes, or any regex pattern.</p>
              </div>
              <button onClick={() => setShowAdd(s => !s)}
                className="text-xs font-medium text-indigo border border-indigo/30 px-3 py-1.5 rounded-lg hover:bg-indigo/5 transition-colors">
                + Add Policy
              </button>
            </div>

            {showAdd && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Policy Name</label>
                    <input className="input text-sm py-1.5 w-full" placeholder="e.g. Client: Acme Corp"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                    <select className="input text-sm py-1.5 w-full" value={form.action}
                      onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
                      <option value="block">Block</option>
                      <option value="warn">Warn</option>
                      <option value="redact">Redact</option>
                      <option value="audit">Audit only</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pattern (keyword or regex)</label>
                  <input className="input text-sm py-1.5 w-full font-mono" placeholder="e.g. Acme Corp  or  \b[A-Z]{2}-\d{4}\b"
                    value={form.pattern} onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))} />
                  <p className="text-[10px] text-gray-400 mt-1">Plain text is matched case-insensitively. Regex is also supported.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={addCustom} disabled={saving}
                    className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50">{saving ? "Saving…" : "Save Policy"}</button>
                  <button onClick={() => setShowAdd(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                </div>
              </div>
            )}

            {policies.filter(p => p.category === "custom").length === 0 && !showAdd ? (
              <p className="text-sm text-gray-400 text-center py-6">No custom policies yet. Add client names, project codes, or any keyword to protect.</p>
            ) : (
              <div className="space-y-2">
                {policies.filter(p => p.category === "custom").map(policy => (
                  <div key={policy.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${policy.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{policy.name}</p>
                        <code className="text-[10px] text-gray-400 font-mono truncate block">{policy.pattern}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <select value={policy.action} onChange={e => changeAction(policy, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white">
                        <option value="block">Block</option>
                        <option value="warn">Warn</option>
                        <option value="redact">Redact</option>
                        <option value="audit">Audit only</option>
                      </select>
                      <button onClick={() => togglePolicy(policy)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${policy.enabled ? "bg-indigo" : "bg-gray-200"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${policy.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                      </button>
                      <button onClick={() => setConfirmDelete(policy)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Workspace Compliance</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enable or disable compliance enforcement per workspace.</p>
          </div>
          {wsLoading && <div className="flex justify-center py-6"><Spinner /></div>}
          {!wsLoading && workspaces.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No workspaces found.</p>
          )}
          {workspaces.length > 0 && (
            <div className="space-y-2">
              {workspaces.map(ws => (
                <div key={ws.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ws.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{ws.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${ws.dlpEnabled ? "text-emerald-600" : "text-gray-400"}`}>
                      {ws.dlpEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <button onClick={() => toggleDlp(ws)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ws.dlpEnabled ? "bg-indigo" : "bg-gray-200"}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${ws.dlpEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-bold text-gray-900">Remove Policy</h3>
            <p className="text-sm text-gray-600">Remove the "{confirmDelete.name}" policy? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={() => deletePolicy(confirmDelete.id)} className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
