import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { Spinner } from "../../components/ui";

function CodeSnippet({ id, label, code, copied, onCopy }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <button onClick={() => onCopy(id, code)} className="text-xs text-indigo hover:text-indigo/80 font-medium">
          {copied === id ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

export default function EmbedPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin") return <Navigate to="/workspaces" replace />;

  const [workspaces, setWorkspaces] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState(null);

  useEffect(() => {
    api.get("/admin/workspaces")
      .then(({ data }) => setWorkspaces(data.workspaces || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ws     = workspaces.find(w => w.slug === selected);
  const origin = window.location.origin;
  const embedUrl = ws ? `${origin}/embed/${ws.slug}` : "";

  const iframeSnippet = ws
    ? `<iframe\n  src="${embedUrl}"\n  width="400"\n  height="600"\n  frameborder="0"\n  style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);"\n></iframe>`
    : "";

  const jsSnippet = ws
    ? `<!-- Open Enterprise Chat Widget -->\n<script>\n(function() {\n  var iframe = document.createElement('iframe');\n  iframe.src = '${embedUrl}';\n  iframe.width = '400';\n  iframe.height = '600';\n  iframe.frameBorder = '0';\n  iframe.style.cssText = 'border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);position:fixed;bottom:24px;right:24px;z-index:9999';\n  document.body.appendChild(iframe);\n})();\n</script>`
    : "";

  function copy(id, text) { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Embed</h2>
        <p className="text-gray-500 text-sm mt-0.5">Add a live chat widget to any website — no login required for end users.</p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Select a workspace to get its embed snippet</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner /> Loading…</div>
          ) : workspaces.filter(w => w.embedEnabled).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
              <p className="text-sm text-gray-500">No workspaces have embed access enabled.</p>
              <p className="text-xs text-gray-400 mt-1">Open a workspace → Chat Settings → turn on <strong>Public Embed Access</strong>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {workspaces.filter(w => w.embedEnabled).map(w => {
                const isSelected = selected === w.slug;
                return (
                  <button key={w.slug} onClick={() => setSelected(isSelected ? null : w.slug)}
                    className={`text-left rounded-xl border-2 px-4 py-3 transition-all ${isSelected ? "border-indigo bg-indigo/5 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 text-xs font-bold ${isSelected ? "bg-indigo text-white" : "bg-gray-100 text-gray-500"}`}>
                      {w.name[0].toUpperCase()}
                    </div>
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-indigo" : "text-gray-800"}`}>{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{w._count?.documents ?? w.documents ?? 0} docs</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {ws && (
          <>
            <div className="flex items-center gap-3 bg-indigo/5 border border-indigo/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-indigo shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm text-gray-600 truncate flex-1">{embedUrl}</span>
              <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo hover:underline font-medium shrink-0">Preview →</a>
            </div>
            <CodeSnippet id="iframe" label="iframe (recommended)" code={iframeSnippet} copied={copied} onCopy={copy} />
            <CodeSnippet id="js" label="Floating widget (bottom-right)" code={jsSnippet} copied={copied} onCopy={copy} />
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Notes</p>
              <p>• No login required — users chat anonymously.</p>
              <p>• Answers are grounded only in this workspace's documents.</p>
              <p>• Adjust <code className="bg-gray-200 px-1 rounded">width</code> and <code className="bg-gray-200 px-1 rounded">height</code> on the iframe to fit your layout.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
