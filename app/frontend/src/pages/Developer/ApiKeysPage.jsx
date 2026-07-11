import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Modal, Spinner, EmptyState, ErrorBanner } from "../../components/ui";

const API_SUB_TABS = [
  { id: "keys",       label: "API Keys" },
  { id: "docs",       label: "Documentation" },
  { id: "quickstart", label: "Quick Start" },
];

function ApiKeysTab() {
  const [keys, setKeys]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);
  const [revealed, setRevealed]     = useState(null);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    try {
      const { data } = await api.get("/admin/api-keys");
      setKeys(data.keys);
    } catch { setError("Failed to load API keys"); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/admin/api-keys", { name: newName.trim() });
      setRevealed({ name: data.apiKey.name, rawKey: data.rawKey });
      setShowCreate(false); setNewName(""); fetchKeys();
    } catch (e) { setError(e.response?.data?.error || "Failed to create key"); }
    finally { setCreating(false); }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "revoke") {
        await api.patch(`/admin/api-keys/${confirmAction.key.id}/revoke`);
        setKeys(prev => prev.map(k => k.id === confirmAction.key.id ? { ...k, revoked: true } : k));
      } else {
        await api.delete(`/admin/api-keys/${confirmAction.key.id}`);
        setKeys(prev => prev.filter(k => k.id !== confirmAction.key.id));
      }
      setConfirmAction(null);
    } catch { setError(`Failed to ${confirmAction.type} key`); }
    finally { setActionLoading(false); }
  }

  function copyKey() { navigator.clipboard.writeText(revealed.rawKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Keys authenticate API requests. Generate one per application.</p>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">+ New Key</button>
      </div>
      {error && <ErrorBanner message={error} onClose={() => setError("")} />}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : keys.length === 0 ? (
        <EmptyState message="No API keys yet. Create one to start using the REST API." />
      ) : (
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-100">
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Prefix</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Used</th>
              <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {keys.map(k => (
              <tr key={k.id} className="group hover:bg-gray-50 transition-colors">
                <td className="py-3 text-sm font-medium text-gray-800">{k.name}</td>
                <td className="py-3"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{k.keyPrefix}…</code></td>
                <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(k.createdAt).toLocaleDateString()}
                  {k.createdBy && <span className="ml-1 text-gray-300">by {k.createdBy.name || k.createdBy.email}</span>}
                </td>
                <td className="py-3 text-xs text-gray-400 whitespace-nowrap">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</td>
                <td className="py-3">
                  {k.revoked
                    ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />Revoked</span>
                    : <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />Active</span>
                  }
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {!k.revoked && <button onClick={() => setConfirmAction({ type: "revoke", key: k })} className="text-xs text-amber-500 hover:text-amber-700 font-medium transition-colors">Revoke</button>}
                    <button onClick={() => setConfirmAction({ type: "delete", key: k })} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <Modal title="Create API Key" onClose={() => { setShowCreate(false); setNewName(""); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
              <input className="input w-full" placeholder="e.g. Production App, Dev Integration" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowCreate(false); setNewName(""); }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary px-4 py-2 text-sm">{creating ? "Creating…" : "Create"}</button>
            </div>
          </div>
        </Modal>
      )}

      {revealed && (
        <Modal title="API Key Created" onClose={() => setRevealed(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Copy this key now. It will <strong>not</strong> be shown again.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{revealed.name}</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono break-all select-all">{revealed.rawKey}</code>
                <button onClick={copyKey} className="shrink-0 px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors font-medium">{copied ? "Copied!" : "Copy"}</button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700 text-sm">Usage</p>
              <p>Include in the <code className="bg-gray-200 px-1 rounded">Authorization</code> header:</p>
              <code className="block bg-white border border-gray-200 rounded px-2 py-1 mt-1 break-all">Authorization: Bearer {revealed.rawKey}</code>
            </div>
            <div className="flex justify-end pt-1"><button onClick={() => setRevealed(null)} className="btn-primary px-5 py-2 text-sm">Done</button></div>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "revoke" ? "Revoke API Key" : "Delete API Key"}
          message={confirmAction.type === "revoke" ? "Revoke access for key" : "Permanently delete key"}
          detail={confirmAction.key.name}
          confirmLabel={confirmAction.type === "revoke" ? "Revoke" : "Delete"}
          variant={confirmAction.type === "revoke" ? "warning" : "danger"}
          loading={actionLoading}
          onConfirm={handleConfirmAction}
          onCancel={() => !actionLoading && setConfirmAction(null)}
        />
      )}
    </>
  );
}

function ApiDocsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Interactive API reference. Try requests live or import into Postman.</p>
        <a href="/api/v1/docs/postman.json" download="openenterprise-postman.json" className="btn-primary px-4 py-2 text-sm">Download Postman Collection</a>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: "680px" }}>
        <iframe src="/api/v1/docs" title="Open Enterprise API Documentation" className="w-full h-full border-0" />
      </div>
      <p className="text-xs text-gray-400">
        Import into Postman: click <strong>Download Postman Collection</strong> above → Postman → File → Import → upload the JSON. All endpoints will be grouped by category (Workspaces, Chat, Threads, Documents, Agents).
      </p>
    </div>
  );
}

function ApiQuickStartTab() {
  const [copiedBlock, setCopiedBlock] = useState(null);
  const origin = window.location.origin;

  function copy(id, text) { navigator.clipboard.writeText(text); setCopiedBlock(id); setTimeout(() => setCopiedBlock(null), 2000); }

  function CodeBlock({ id, code }) {
    return (
      <div className="relative group">
        <pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-xs overflow-x-auto leading-relaxed">{code}</pre>
        <button onClick={() => copy(id, code)} className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {copiedBlock === id ? "Copied!" : "Copy"}
        </button>
      </div>
    );
  }

  const slug = "YOUR_WORKSPACE_SLUG";
  const agentSlug = "YOUR_AGENT_SLUG";

  const curlRunAgent = `curl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "Summarise all open Jira tickets assigned to me."}' \\\n  ${origin}/api/v1/workspaces/${slug}/agents/${agentSlug}/run`;

  const jsRunAgent = `const res = await fetch("${origin}/api/v1/workspaces/${slug}/agents/${agentSlug}/run", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer emb_your_key",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ input: "Summarise all open Jira tickets assigned to me." })\n});\n\n// Response is a Server-Sent Events stream\nconst reader = res.body.getReader();\nconst decoder = new TextDecoder();\nwhile (true) {\n  const { done, value } = await reader.read();\n  if (done) break;\n  const lines = decoder.decode(value).split("\\n");\n  for (const line of lines) {\n    if (!line.startsWith("data: ")) continue;\n    const event = JSON.parse(line.slice(6));\n    if (event.done) console.log("Output:", event.output);\n    if (event.tool_calls) console.log("Tools called:", event.tool_calls);\n  }\n}`;

  const pyRunAgent = `import requests, json\n\nheaders = {"Authorization": "Bearer emb_your_key", "Content-Type": "application/json"}\nurl = "${origin}/api/v1/workspaces/${slug}/agents/${agentSlug}/run"\n\nwith requests.post(url, headers=headers, json={"input": "Summarise all open Jira tickets."}, stream=True) as r:\n    for line in r.iter_lines():\n        if not line or not line.startswith(b"data: "):\n            continue\n        event = json.loads(line[6:])\n        if event.get("done"):\n            print("Output:", event["output"])\n        if event.get("tool_calls"):\n            print("Tools called:", event["tool_calls"])`;

  const curlUpload = `curl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -F "file=@/path/to/document.pdf" \\\n  ${origin}/api/v1/workspaces/${slug}/documents/upload`;

  const curlFolder = `# Repeat -F file= for each file in the folder\ncurl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -F "file=@/folder/report.pdf" \\\n  -F "file=@/folder/data.csv" \\\n  -F "file=@/folder/notes.docx" \\\n  ${origin}/api/v1/workspaces/${slug}/documents/folder`;

  const curlOcr = `curl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -F "file=@/path/to/scanned-invoice.png" \\\n  ${origin}/api/v1/workspaces/${slug}/documents/ocr`;

  const curlWebsite = `# Single page\ncurl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://docs.example.com"}' \\\n  ${origin}/api/v1/workspaces/${slug}/documents/website\n\n# Full site crawl\ncurl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://docs.example.com", "crawl": true, "maxPages": 100, "maxDepth": 3}' \\\n  ${origin}/api/v1/workspaces/${slug}/documents/website`;

  const curlCloud = `# S3 pre-signed URL, Dropbox (add ?dl=1), GDrive direct download\ncurl -X POST \\\n  -H "Authorization: Bearer emb_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://my-bucket.s3.amazonaws.com/report.pdf?X-Amz-Signature=..."}' \\\n  ${origin}/api/v1/workspaces/${slug}/documents/cloud`;

  const curlPollStatus = `curl -H "Authorization: Bearer emb_your_key" \\\n  ${origin}/api/v1/workspaces/${slug}/documents/DOC_UID`;

  return (
    <div className="space-y-8">

      {/* Step 1 */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">1. Create an API Key</h3>
        <p className="text-sm text-gray-500 mb-3">Go to the <strong>API Keys</strong> tab → click <strong>+ New Key</strong> → copy the key. It is shown only once.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          All requests need: <code className="font-mono bg-amber-100 px-1 rounded">Authorization: Bearer emb_your_key</code>
        </div>
      </div>

      {/* Step 2 — Agents */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">2. Run an Agent</h3>
        <p className="text-sm text-gray-500 mb-3">Trigger an agent and stream its output via Server-Sent Events. Get the <code className="bg-gray-100 px-1 rounded text-xs">agentSlug</code> from Agent Studio → agent card.</p>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">cURL</p>
          <CodeBlock id="curl-run" code={curlRunAgent} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">JavaScript (fetch + SSE)</p>
          <CodeBlock id="js-run" code={jsRunAgent} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">Python (requests)</p>
          <CodeBlock id="py-run" code={pyRunAgent} />
        </div>
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700">SSE event types</p>
          <p><code className="bg-gray-100 px-1 rounded">{"{ \"tool_calls\": [\"conn_search\"] }"}</code> — agent called a tool</p>
          <p><code className="bg-gray-100 px-1 rounded">{"{ \"done\": true, \"output\": \"...\", \"runId\": 42 }"}</code> — run complete</p>
          <p><code className="bg-gray-100 px-1 rounded">{"{ \"error\": \"...\" }"}</code> — run failed</p>
        </div>
      </div>

      {/* Step 3 — Documents: 5 ingestion endpoints */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">3. Ingest Documents</h3>
        <p className="text-sm text-gray-500 mb-3">Five dedicated endpoints — one per ingestion type. All are async; poll <code className="bg-gray-100 px-1 rounded text-xs">GET /documents/{"{uid}"}</code> until status is <code className="bg-gray-100 px-1 rounded text-xs">ready</code>.</p>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. File upload — <code className="normal-case font-normal text-gray-500">/documents/upload</code></p>
            <CodeBlock id="curl-upload" code={curlUpload} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. Folder — <code className="normal-case font-normal text-gray-500">/documents/folder</code></p>
            <CodeBlock id="curl-folder" code={curlFolder} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3. OCR — <code className="normal-case font-normal text-gray-500">/documents/ocr</code></p>
            <CodeBlock id="curl-ocr" code={curlOcr} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">4. Website — <code className="normal-case font-normal text-gray-500">/documents/website</code></p>
            <CodeBlock id="curl-website" code={curlWebsite} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">5. Cloud storage — <code className="normal-case font-normal text-gray-500">/documents/cloud</code></p>
            <CodeBlock id="curl-cloud" code={curlCloud} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Poll status</p>
            <CodeBlock id="curl-poll" code={curlPollStatus} />
          </div>
        </div>

        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Status progression</p>
          <p><code className="bg-gray-100 px-1 rounded">queued</code> → <code className="bg-gray-100 px-1 rounded">ingesting</code> → <code className="bg-gray-100 px-1 rounded">ready</code> (or <code className="bg-gray-100 px-1 rounded">failed</code>)</p>
        </div>
      </div>

      <div className="bg-indigo/5 border border-indigo/20 rounded-lg px-4 py-3 text-sm text-gray-700">
        Full reference with all endpoints: go to the <strong>Documentation</strong> tab.
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [sub, setSub] = useState("keys");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-0 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Developer API</h2>
        <p className="text-gray-500 text-sm mb-3">
          Integrate Open Enterprise into your applications via the REST API at <code className="bg-gray-100 px-1 rounded text-xs">/api/v1/</code>
        </p>
        <div className="flex">
          {API_SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${sub === t.id ? "border-indigo text-indigo" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {sub === "keys"       && <ApiKeysTab />}
        {sub === "docs"       && <ApiDocsTab />}
        {sub === "quickstart" && <ApiQuickStartTab />}
      </div>
    </div>
  );
}
