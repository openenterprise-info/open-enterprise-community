import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo border-t-transparent rounded-full animate-spin" />;
}

function ApprovalCard({ approval, onDecide }) {
  const [expanded, setExpanded] = useState(approval.status === "pending");
  const [deciding, setDeciding] = useState(false);

  const statusDot   = approval.status === "pending"  ? "bg-amber-400"
                    : approval.status === "approved" ? "bg-green-400" : "bg-red-400";
  const statusBadge = approval.status === "pending"  ? "bg-amber-100 text-amber-700"
                    : approval.status === "approved" ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600";

  async function handleDecide(decision) {
    setDeciding(true);
    await onDecide(approval.id, decision);
    setDeciding(false);
  }

  return (
    <>
      <div
        onClick={() => setExpanded(e => !e)}
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${statusDot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {approval.sourceAgent?.name || "Agent"}
            </span>
            <span className="text-gray-400 text-xs shrink-0">→</span>
            <span className="text-xs font-mono font-bold text-indigo shrink-0">
              @{approval.nextAgentSlug}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(approval.createdAt).toLocaleString()}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${statusBadge}`}>
          {approval.status}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform mt-0.5 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/60 space-y-3 pt-3">
          {approval.runOutput && (
            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-72 overflow-y-auto bg-white border border-gray-100 rounded-xl px-3 py-2.5 leading-relaxed">
              {approval.runOutput}
            </pre>
          )}
          {approval.status === "pending" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleDecide("approved")}
                disabled={deciding}
                className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecide("rejected")}
                disabled={deciding}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function WorkspaceApprovalsPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const [workspace, setWorkspace]   = useState(null);
  const [approvals, setApprovals]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/workspaces/${slug}`).then(r => setWorkspace(r.data.workspace)).catch(() => {});
  }, [slug]);

  async function loadApprovals(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    try {
      const { data } = await api.get(`/workspaces/${slug}/chain-approvals`);
      setApprovals(data.approvals || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    if (!slug) return;
    loadApprovals();
    const id = setInterval(() => loadApprovals(), 5000);
    return () => clearInterval(id);
  }, [slug]);

  async function decideApproval(id, decision) {
    await api.patch(`/workspaces/${slug}/chain-approvals/${id}`, { decision });
    setApprovals(a => a.map(x => x.id === id ? { ...x, status: decision } : x));
  }

  const pendingCount = approvals.filter(a => a.status === "pending").length;

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Sidebar */}
      <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-gray-200">
          <button
            onClick={() => navigate("/workspaces")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Workspaces</span>
          </button>
        </div>
        <div className="px-3 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="flex-1 text-sm font-semibold text-gray-900 truncate min-w-0">{workspace?.name || "…"}</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 space-y-0.5">
          <button onClick={() => navigate(`/workspace/${slug}`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Chat
          </button>
          <button onClick={() => navigate(`/workspace/${slug}/connectors`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Connectors
          </button>
          <button onClick={() => navigate(`/workspace/${slug}/agents`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Agents
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/workspace/${slug}/agents`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Approvals
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">Review and approve pending agent chain actions</p>
              </div>
            </div>
            <button
              onClick={() => loadApprovals(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {refreshing
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <span>↻</span>
              }
              Refresh
            </button>
          </div>

          {/* Pending alert banner */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-red-500 text-base">🚨</span>
              <span className="text-sm font-semibold text-red-700">
                {pendingCount} pending approval{pendingCount > 1 ? "s" : ""} — action required
              </span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">No approval requests</p>
              <p className="text-xs text-gray-400">Agent chain approvals will appear here automatically</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {approvals.map(approval => (
                <ApprovalCard key={approval.id} approval={approval} onDecide={decideApproval} />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
