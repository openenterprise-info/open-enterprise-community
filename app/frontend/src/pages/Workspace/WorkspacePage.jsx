import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import WorkspaceChat from "./WorkspaceChat";

const TABS = [
  { id: "chat",       label: "Chat" },
  { id: "connectors", label: "Connectors" },
  { id: "agents",     label: "Agents" },
];

function ChatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ConnectorsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

const TAB_ICONS = { chat: <ChatIcon />, connectors: <ConnectorsIcon />, agents: <AgentsIcon /> };

// ── Placeholder panels ─────────────────────────────────────────────────────────

function ConnectorsPlaceholder({ workspaceName }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center mb-4">
        <ConnectorsIcon />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Workspace Connectors</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        Connect your own data sources to <span className="font-medium">{workspaceName}</span>. Each workspace manages its own credentials and connections.
      </p>
      <p className="mt-4 text-xs text-gray-400">Coming in Phase 2</p>
    </div>
  );
}

function AgentsPlaceholder({ workspaceName }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center mb-4">
        <AgentsIcon />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Workspace Agents</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        Agents attached to <span className="font-medium">{workspaceName}</span> will appear here. Users and managers can run them directly from this workspace.
      </p>
      <p className="mt-4 text-xs text-gray-400">Coming in Phase 3</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { slug }     = useParams();
  const navigate     = useNavigate();
  const [tab, setTab]             = useState("chat");
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    api.get("/workspaces").then(({ data }) => {
      const ws = (data.workspaces || []).find(w => w.slug === slug);
      if (ws) setWorkspace(ws);
    }).catch(() => {});
  }, [slug]);

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* ── Top tab bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-gray-200 bg-white shrink-0 px-2" style={{ height: 48 }}>

        {/* Back to workspaces */}
        <button
          onClick={() => navigate("/workspaces")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 mr-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Workspace name */}
        <div className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
            {workspace?.name || slug}
          </span>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 mr-4 shrink-0" />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {TAB_ICONS[t.id]}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "chat"       && <WorkspaceChat />}
        {tab === "connectors" && <ConnectorsPlaceholder workspaceName={workspace?.name || slug} />}
        {tab === "agents"     && <AgentsPlaceholder     workspaceName={workspace?.name || slug} />}
      </div>

    </div>
  );
}
