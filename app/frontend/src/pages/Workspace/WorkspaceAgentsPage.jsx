import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import AgentsChatPanel from "../../components/AgentsChatPanel";
import { useAuth } from "../../context/AuthContext";

export default function WorkspaceAgentsPage() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!slug) return;
    api.get(`/workspaces/${slug}`)
      .then(r => setWorkspace(r.data.workspace))
      .catch(() => setError("Workspace not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 border-[2.5px] border-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={() => navigate("/workspaces")} className="btn-primary px-4 py-2 text-sm">Back to Workspaces</button>
        </div>
      </div>
    );
  }

  const canManage = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-64 bg-[#f9f9f9] border-r border-gray-200 flex flex-col flex-shrink-0">

        {/* Back nav */}
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

        {/* Workspace name */}
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

        {/* Bottom workspace nav */}
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 space-y-0.5">
          <button onClick={() => navigate(`/workspace/${slug}`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          <button onClick={() => navigate(`/workspace/${slug}/connectors`)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connectors
          </button>
          <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm bg-indigo/10 text-indigo font-semibold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Agents
          </button>
        </div>
      </div>

      {/* ── Main content — AgentsChatPanel in standalone/full-screen mode ── */}
      <AgentsChatPanel
        slug={slug}
        isManager={canManage}
        standalone={true}
      />
    </div>
  );
}
