import React, { useState, useEffect } from "react";
import api from "../utils/api";

const STATUS_CONFIG = {
  ready:      { label: "Ready",      cls: "bg-green-100 text-green-700" },
  queued:     { label: "Queued",     cls: "bg-gray-100 text-gray-500" },
  ingesting:  { label: "Ingesting",  cls: "bg-blue-100 text-blue-700" },
  partial:    { label: "Partial",    cls: "bg-amber-100 text-amber-700" },
  failed:     { label: "Failed",     cls: "bg-red-100 text-red-600" },
  processing: { label: "Processing", cls: "bg-yellow-100 text-yellow-700" },
};

const ACTIVE_STATUSES = ["queued", "ingesting", "processing"];

function Spinner({ className = "w-4 h-4" }) {
  return <div className={`${className} border-[2.5px] border-current border-t-transparent rounded-full animate-spin`} />;
}

function StatusBadge({ doc }) {
  const cfg = STATUS_CONFIG[doc.status] || { label: doc.status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.cls}`}>
      {doc.status === "ingesting" && <Spinner className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

function ProgressLine({ doc }) {
  if (!["ingesting", "processing"].includes(doc.status)) return null;
  if (!doc.totalChunks) return <span className="text-[10px] text-gray-400">Extracting text…</span>;
  const pct = Math.round((doc.chunksProcessed / doc.totalChunks) * 100);
  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 shrink-0 font-mono">{doc.chunksProcessed}/{doc.totalChunks}</span>
      </div>
    </div>
  );
}

function TypeIcon({ type }) {
  if (type === "url" || type === "website-crawl") return (
    <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4 text-indigo shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 6.7A1 1 0 0011.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function DeleteConfirmDialog({ title, body, note, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <TrashIcon className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-center font-bold text-gray-900 text-base mb-1">{title}</h3>
        <p className="text-center text-gray-500 text-sm mb-1 break-all">{body}</p>
        {note
          ? <p className="text-center text-xs text-red-500 mb-4">{note}</p>
          : <p className="text-center text-xs text-gray-400 mb-4">This cannot be undone.</p>
        }
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getGroupKey(doc) {
  // Cloud connector — group by connector
  if (doc.connectorId) return `connector:${doc.connectorId}`;
  // Folder / File Upload / OCR batch — group by batchId
  if (doc.batchId) return doc.batchId;
  const name = doc.name || "";
  // Website / URL — group by hostname (check source first, then extract URL from name)
  for (const candidate of [doc.source || "", name]) {
    const urlStr = candidate.startsWith("http") ? candidate : (candidate.match(/https?:\/\/.+/)?.[0] || "");
    if (urlStr) {
      try { return new URL(urlStr).hostname; } catch {}
    }
  }
  // GitHub-style: owner/repo/path/to/file → group by owner/repo (exclude URLs)
  const parts = name.split("/");
  if (parts.length >= 3 && !name.includes("://")) {
    return `${parts[0]}/${parts[1]}`;
  }
  // Singleton: use uid so it never accidentally merges with another doc
  return doc.uid;
}

function buildGroups(docs) {
  const map = new Map();
  for (const doc of docs) {
    const key = getGroupKey(doc);
    if (!map.has(key)) map.set(key, { key, docs: [] });
    map.get(key).docs.push(doc);
  }
  return [...map.values()];
}

function DocRow({ doc, stopping, retrying, onStop, onRetry, onDelete }) {
  const isActive = ACTIVE_STATUSES.includes(doc.status);
  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 group transition-colors">
      <TypeIcon type={doc.type} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate" title={doc.name}>{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <StatusBadge doc={doc} />
          {doc.status === "ready" && doc.chunkCount > 0 && (
            <span className="text-[10px] text-gray-400">{doc.chunkCount} vectors</span>
          )}
          {doc.status === "partial" && doc.chunkCount > 0 && (
            <span className="text-[10px] text-amber-500">{doc.chunkCount}/{doc.totalChunks || "?"} chunks</span>
          )}
          {["failed", "partial"].includes(doc.status) && doc.type !== "url" && !doc.sourcePath && (
            <span className="text-[10px] text-gray-400 italic">Re-upload to retry</span>
          )}
        </div>
        <ProgressLine doc={doc} />
        {doc.errorMessage && doc.status === "failed" && (
          <p className="text-[10px] text-red-400 mt-0.5 truncate" title={doc.errorMessage}>{doc.errorMessage}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        {["ingesting", "queued"].includes(doc.status) && (
          <button onClick={() => onStop(doc.uid)} disabled={stopping === doc.uid} title="Stop"
            className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 disabled:opacity-50">
            {stopping === doc.uid ? <Spinner className="w-2.5 h-2.5" /> : (
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            )}
            Stop
          </button>
        )}
        {["failed", "partial"].includes(doc.status) && (doc.type === "url" || doc.sourcePath) && (
          <button onClick={() => onRetry(doc.uid)} disabled={retrying === doc.uid} title="Retry"
            className="text-[10px] font-semibold text-indigo hover:text-indigo/80 border border-indigo/30 rounded px-1.5 py-0.5 disabled:opacity-50">
            {retrying === doc.uid ? "…" : "Retry"}
          </button>
        )}
        {!isActive && (
          <button onClick={() => onDelete(doc)} title="Remove"
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

const LS_KEY = "oe_group_names";
function loadGroupNames() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } }
function saveGroupNames(map) { try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {} }

export default function SourcesPanel({ workspaceSlug, workspaceId, refreshTrigger, onDocumentDeleted, sharingOnly = false, hideSharing = false }) {
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [retrying, setRetrying]       = useState(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [stopping, setStopping]       = useState(null);
  const [expanded, setExpanded]       = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState("");
  const [groupNames, setGroupNames]   = useState(loadGroupNames);
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [renameGroupVal, setRenameGroupVal] = useState("");
  const [kbShares, setKbShares]       = useState({ outgoing: [], incoming: [] });
  const [peerWorkspaces, setPeerWorkspaces] = useState([]);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [sharingTo, setSharingTo]     = useState(null);
  const [confirmRemoveShare, setConfirmRemoveShare] = useState(null);
  const [kbSharingEnabled, setKbSharingEnabled] = useState(true);

  function getGroupLabel(group) {
    if (groupNames[group.key]) return groupNames[group.key];
    if (group.docs[0]?.connectorName) return group.docs[0].connectorName;
    const key = group.key;
    if (key.startsWith("folder:")) {
      const p = key.slice(7).replace(/\\/g, "/");
      return p.split("/").filter(Boolean).pop() || p;
    }
    if (key.startsWith("upload:") || key.startsWith("ocr:")) {
      const prefix = key.startsWith("ocr:") ? "OCR" : "Upload";
      const date = group.docs[0]?.createdAt ? new Date(group.docs[0].createdAt).toLocaleDateString() : "";
      return `${prefix} ${date}`.trim();
    }
    return key;
  }

  async function commitGroupRename(group) {
    const val = renameGroupVal.trim();
    if (val && val !== getGroupLabel(group)) {
      if (group.docs[0]?.connectorId) {
        const connId = group.docs[0].connectorId;
        try {
          if (workspaceId) await api.put(`/admin/workspaces/${workspaceId}/connectors/${connId}`, { name: val });
          setDocs(ds => ds.map(d => d.connectorId === connId ? { ...d, connectorName: val } : d));
        } catch { /* ignore */ }
      } else {
        const next = { ...groupNames, [group.key]: val };
        setGroupNames(next);
        saveGroupNames(next);
      }
    }
    setRenamingGroup(null);
  }
  const pollRef         = React.useRef(null);
  const prevActiveCount = React.useRef(0);

  useEffect(() => {
    if (!sharingOnly) fetchDocs();
    if (!hideSharing) {
      fetchKbShares();
      api.get("/features").then(r => setKbSharingEnabled(r.data.kbSharing !== false)).catch(() => {});
    }
    return () => clearInterval(pollRef.current);
  }, [workspaceSlug]);

  useEffect(() => { if (refreshTrigger && !sharingOnly) fetchDocs(); }, [refreshTrigger]);

  // Auto-expand groups that have active docs
  useEffect(() => {
    const activeKeys = buildGroups(docs)
      .filter(g => g.docs.some(d => ACTIVE_STATUSES.includes(d.status)))
      .map(g => g.key);
    if (activeKeys.length > 0) {
      setExpanded(prev => {
        const next = new Set(prev);
        activeKeys.forEach(k => next.add(k));
        return next;
      });
    }
  }, [docs]);

  useEffect(() => {
    clearInterval(pollRef.current);
    const activeNow = docs.filter(d => ACTIVE_STATUSES.includes(d.status)).length;
    prevActiveCount.current = activeNow;
    if (activeNow > 0) {
      pollRef.current = setInterval(async () => {
        const { data } = await api.get(`/documents/${workspaceSlug}`).catch(() => ({ data: null }));
        if (!data) return;
        const newActive = data.documents.filter(d => ACTIVE_STATUSES.includes(d.status)).length;
        if (newActive < prevActiveCount.current) onDocumentDeleted?.();
        prevActiveCount.current = newActive;
        setDocs(data.documents);
        if (newActive === 0) clearInterval(pollRef.current);
      }, 2000);
    }
    return () => clearInterval(pollRef.current);
  }, [docs, workspaceSlug]);

  async function fetchDocs() {
    try {
      const { data } = await api.get(`/documents/${workspaceSlug}`);
      setDocs(data.documents);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function fetchKbShares() {
    try {
      const { data } = await api.get(`/workspaces/${workspaceSlug}/kb-shares`);
      setKbShares(data);
    } catch { /* silent */ }
  }

  async function loadPeerWorkspaces() {
    if (peerWorkspaces.length) { setShowSharePicker(true); return; }
    try {
      const { data } = await api.get(`/workspaces/${workspaceSlug}/peer-workspaces`);
      setPeerWorkspaces(data.workspaces);
      setShowSharePicker(true);
    } catch { setError("Failed to load workspaces"); }
  }

  async function addShare(targetSlug) {
    setSharingTo(targetSlug);
    try {
      const { data } = await api.post(`/workspaces/${workspaceSlug}/kb-shares`, { targetWorkspaceSlug: targetSlug });
      setKbShares(s => ({ ...s, outgoing: [...s.outgoing, data.share] }));
      setShowSharePicker(false);
    } catch (err) { setError(err.response?.data?.error || "Failed to share"); }
    finally { setSharingTo(null); }
  }

  async function removeShare(id) {
    try {
      await api.delete(`/workspaces/${workspaceSlug}/kb-shares/${id}`);
      setKbShares(s => ({ ...s, outgoing: s.outgoing.filter(x => x.id !== id) }));
    } catch { setError("Failed to remove share"); }
  }

  async function handleStop(uid) {
    setStopping(uid);
    try { await api.post(`/documents/${workspaceSlug}/${uid}/cancel`); }
    catch (err) { setError(err.response?.data?.error || "Failed to stop"); }
    finally { setStopping(null); }
  }

  async function handleRetry(uid) {
    setRetrying(uid);
    try {
      const { data } = await api.post(`/documents/${workspaceSlug}/${uid}/retry`);
      setDocs(d => d.map(doc => doc.uid === uid ? data.document : doc));
    } catch (err) { setError(err.response?.data?.error || "Retry failed"); }
    finally { setRetrying(null); }
  }

  async function handleRetryAll(docs) {
    setRetryingAll(true);
    try {
      await Promise.allSettled(
        docs.map(d => api.post(`/documents/${workspaceSlug}/${d.uid}/retry`))
      );
      await fetchDocs();
    } catch (err) { setError(err.response?.data?.error || "Retry all failed"); }
    finally { setRetryingAll(false); }
  }

  async function hardDelete(targets) {
    await Promise.allSettled(targets.map(d => api.post(`/documents/${workspaceSlug}/${d.uid}/cancel`).catch(() => {})));
    await Promise.allSettled(targets.map(d => api.delete(`/documents/${workspaceSlug}/${d.uid}`).catch(() => {})));
    const uids = new Set(targets.map(d => d.uid));
    setDocs(prev => prev.filter(d => !uids.has(d.uid)));
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await hardDelete(confirmDelete.docs);
      setConfirmDelete(null);
      onDocumentDeleted?.();
    } catch { setError("Failed to delete"); }
    finally { setDeleting(false); }
  }

  function toggleExpand(key) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const groups    = buildGroups(docs);
  const active    = docs.filter(d => ACTIVE_STATUSES.includes(d.status));
  const ready     = docs.filter(d => d.status === "ready");
  const partial   = docs.filter(d => d.status === "partial");
  const failed    = docs.filter(d => d.status === "failed");
  const totalVecs = ready.reduce((s, d) => s + (d.chunkCount || 0), 0);

  const confirmNote = confirmDelete
    ? (() => {
        const vecs = confirmDelete.docs.reduce((s, d) => s + (d.chunkCount || 0), 0);
        return vecs > 0 ? `Deletes ${vecs.toLocaleString()} vector${vecs !== 1 ? "s" : ""} from the knowledge base.` : null;
      })()
    : null;

  return (
    <div className="flex flex-col">

      {error && (
        <div className="mx-4 mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between shrink-0">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {!sharingOnly && !loading && docs.length > 0 && (
        <div className="mx-4 mt-3 grid grid-cols-5 divide-x divide-gray-200 bg-gray-50 rounded-xl shrink-0 text-center py-2.5">
          {[
            { label: "Total",   value: docs.length,    cls: "text-gray-800" },
            { label: "Ready",   value: ready.length,   cls: "text-green-600" },
            { label: "Active",  value: active.length,  cls: "text-blue-500" },
            { label: "Partial", value: partial.length, cls: "text-amber-600" },
            { label: "Failed",  value: failed.length,  cls: "text-red-500" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="px-1">
              <p className={`text-sm font-bold ${cls}`}>{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}
      {totalVecs > 0 && (
        <p className="text-[10px] text-indigo font-medium text-center mt-1 shrink-0">
          {totalVecs.toLocaleString()} vectors indexed
        </p>
      )}

      {!sharingOnly && <div className="px-4 pt-3 pb-4">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="w-5 h-5 text-indigo" /></div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No documents yet — go to Sources to add your first source.</p>
        ) : (
          <div className="space-y-2">
            {groups.map(group => {
              const isSingleton = group.key === group.docs[0]?.uid;
              const isOpen      = expanded.has(group.key);
              const grpActive   = group.docs.filter(d => ACTIVE_STATUSES.includes(d.status));
              const grpFailed   = group.docs.filter(d => ["failed", "partial"].includes(d.status));
              const grpVecs     = group.docs.reduce((s, d) => s + (d.chunkCount || 0), 0);
              const grpReady    = group.docs.filter(d => d.status === "ready").length;

              if (isSingleton) {
                return (
                  <div key={group.key} className="rounded-lg bg-gray-50 hover:bg-gray-100 group transition-colors">
                    <DocRow
                      doc={group.docs[0]}
                      stopping={stopping}
                      retrying={retrying}
                      onStop={handleStop}
                      onRetry={handleRetry}
                      onDelete={d => setConfirmDelete({ docs: [d], label: d.name })}
                    />
                  </div>
                );
              }

              return (
                <div key={group.key} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Group header row */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
                    onClick={() => toggleExpand(group.key)}
                  >
                    <ChevronIcon open={isOpen} />
                    <FolderIcon />
                    <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                      {renamingGroup === group.key ? (
                        <input autoFocus className="input text-xs py-0.5 w-full max-w-[200px]" value={renameGroupVal}
                          onChange={e => setRenameGroupVal(e.target.value)}
                          onBlur={() => commitGroupRename(group)}
                          onKeyDown={e => { if (e.key === "Enter") commitGroupRename(group); if (e.key === "Escape") setRenamingGroup(null); }} />
                      ) : (
                        <p className="text-xs font-semibold text-gray-800 truncate cursor-pointer hover:text-indigo group/gname"
                          title="Click to rename"
                          onClick={() => { setRenamingGroup(group.key); setRenameGroupVal(getGroupLabel(group)); }}>
                          {getGroupLabel(group)} <span className="text-gray-300 text-[10px] group-hover/gname:text-indigo">✏</span>
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {group.docs.length} files
                        {grpReady > 0 && ` · ${grpVecs.toLocaleString()} vectors`}
                        {grpActive.length > 0 && (
                          <> · <span className="inline-flex items-center gap-1 text-blue-500 font-medium"><Spinner className="w-2 h-2" />{grpActive.length} active</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {grpFailed.length > 0 && !grpActive.length && (
                        <button
                          onClick={() => handleRetryAll(grpFailed)}
                          disabled={retryingAll}
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-2.5 py-1 transition-colors shadow-sm disabled:opacity-50"
                        >
                          Retry All ({grpFailed.length})
                        </button>
                      )}
                      {grpActive.length > 0 && (
                        <button
                          onClick={() => hardDelete(grpActive)}
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2.5 py-1 transition-colors shadow-sm"
                        >
                          <Spinner className="w-2.5 h-2.5" />
                          Stop All
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete({ docs: group.docs, label: group.key })}
                        title="Delete all in group"
                        className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Expanded individual docs */}
                  {isOpen && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {group.docs.map(doc => (
                        <DocRow
                          key={doc.uid}
                          doc={doc}
                          stopping={stopping}
                          retrying={retrying}
                          onStop={handleStop}
                          onRetry={handleRetry}
                          onDelete={d => setConfirmDelete({ docs: [d], label: d.name })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* ── KB Sharing Section ─────────────────────────────────────────────── */}
      {!hideSharing && kbSharingEnabled && (
      <div className="mx-4 mb-4 mt-2">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Knowledge Base Sharing</p>
              <p className="text-xs text-gray-400 mt-0.5">Share this KB with other workspaces so they can query it</p>
            </div>
            <button
              onClick={loadPeerWorkspaces}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo text-white text-xs font-semibold hover:bg-indigo/90 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Share
            </button>
          </div>

          {/* Workspace picker dropdown */}
          {showSharePicker && (
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <p className="text-xs font-medium text-gray-600 mb-2">Select workspace to share with:</p>
              {peerWorkspaces.length === 0 ? (
                <p className="text-xs text-gray-400">No other workspaces available.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {peerWorkspaces
                    .filter(w => !kbShares.outgoing.some(s => s.targetWorkspace?.slug === w.slug))
                    .map(w => (
                      <button
                        key={w.slug}
                        onClick={() => addShare(w.slug)}
                        disabled={sharingTo === w.slug}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo hover:bg-indigo/5 transition-colors text-left disabled:opacity-50"
                      >
                        <span className="text-sm font-medium text-gray-700">{w.name}</span>
                        <span className="text-xs text-gray-400">{sharingTo === w.slug ? "Sharing…" : "Share →"}</span>
                      </button>
                    ))
                  }
                  {peerWorkspaces.filter(w => !kbShares.outgoing.some(s => s.targetWorkspace?.slug === w.slug)).length === 0 && (
                    <p className="text-xs text-gray-400">All workspaces are already added.</p>
                  )}
                </div>
              )}
              <button onClick={() => setShowSharePicker(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
            </div>
          )}

          {/* Outgoing shares */}
          <div className="divide-y divide-gray-100">
            {kbShares.outgoing.length === 0 && kbShares.incoming.length === 0 ? (
              <p className="px-4 py-4 text-xs text-gray-400 text-center">Not shared with any workspace yet.</p>
            ) : null}

            {kbShares.outgoing.map(share => (
              <div key={share.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 bg-indigo/10 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{share.targetWorkspace?.name}</p>
                  <p className="text-xs text-gray-400">Can query this KB from their chat</p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">Shared</span>
                <button onClick={() => setConfirmRemoveShare(share)} title="Remove share" className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            {kbShares.incoming.length > 0 && (
              <div className="px-4 py-2 bg-blue-50/60">
                <p className="text-xs font-semibold text-blue-600 mb-1.5">Receiving from</p>
                {kbShares.incoming.map(share => (
                  <div key={share.id} className="flex items-center gap-2 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{share.sourceWorkspace?.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">their KB is available here</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {confirmDelete && (
        <DeleteConfirmDialog
          title={confirmDelete.docs.length > 1 ? "Remove Group" : "Remove Source"}
          body={
            confirmDelete.docs.length > 1
              ? `Permanently delete all ${confirmDelete.docs.length} files from "${confirmDelete.label}"?`
              : `Remove "${confirmDelete.label}"?`
          }
          note={confirmNote}
          onConfirm={doDelete}
          onCancel={() => !deleting && setConfirmDelete(null)}
          deleting={deleting}
        />
      )}

      {confirmRemoveShare && (
        <DeleteConfirmDialog
          title="Remove KB Share"
          body={`Stop sharing this knowledge base with "${confirmRemoveShare.targetWorkspace?.name}"? They will no longer be able to query your documents from their chat. Note: responses already in their chat history may still reference this content until they start a new thread.`}
          onConfirm={() => { removeShare(confirmRemoveShare.id); setConfirmRemoveShare(null); }}
          onCancel={() => setConfirmRemoveShare(null)}
        />
      )}
    </div>
  );
}
