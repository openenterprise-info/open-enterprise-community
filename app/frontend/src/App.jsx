import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

function HomeRedirect() {
  const { user } = useAuth();
  const dest = (user?.role === "admin" || user?.role === "manager") ? "/dashboard" : "/workspaces";
  return <Navigate to={dest} replace />;
}

function AuthRequired({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

import AppLayout      from "./components/layout/AppLayout";
import Login          from "./pages/Auth/Login";
import EmbedChat      from "./pages/Embed/EmbedChat";
import WorkspaceChat       from "./pages/Workspace/WorkspaceChat";
import WorkspaceConnectorsPage from "./pages/Workspace/WorkspaceConnectorsPage";
import WorkspaceAgentsPage     from "./pages/Workspace/WorkspaceAgentsPage";
import WorkspaceApprovalsPage  from "./pages/Workspace/WorkspaceApprovalsPage";
import WorkspaceRunLogsPage    from "./pages/Workspace/WorkspaceRunLogsPage";
import WorkspaceSettingsPage   from "./pages/Workspace/WorkspaceSettingsPage";

import DashboardPage   from "./pages/Dashboard/DashboardPage";
import WorkspacesPage  from "./pages/Workspaces/WorkspacesPage";
import ChatsPage       from "./pages/Chats/ChatsPage";
import AgentRunsPage   from "./pages/Agents/AgentRunsPage";
import UsersPage       from "./pages/Users/UsersPage";
import ApiKeysPage     from "./pages/Developer/ApiKeysPage";
import EmbedPage       from "./pages/Developer/EmbedPage";
import SettingsPage    from "./pages/Settings/SettingsPage";
import MaintenancePage from "./pages/Settings/MaintenancePage";
import VectorsPage     from "./pages/Settings/VectorsPage";
import ApprovalsPage   from "./pages/Agents/ApprovalsPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"        element={<Login />} />
      <Route path="/embed/:slug"  element={<EmbedChat />} />

      {/* Full-screen routes — auth required, no sidebar shell */}
      <Route path="/workspace/:slug" element={<AuthRequired><WorkspaceChat /></AuthRequired>} />
      <Route path="/workspace/:slug/connectors" element={<AuthRequired><WorkspaceConnectorsPage /></AuthRequired>} />
      <Route path="/workspace/:slug/agents"     element={<AuthRequired><WorkspaceAgentsPage /></AuthRequired>} />
      <Route path="/workspace/:slug/approvals" element={<AuthRequired><WorkspaceApprovalsPage /></AuthRequired>} />
      <Route path="/workspace/:slug/run-logs"  element={<AuthRequired><WorkspaceRunLogsPage /></AuthRequired>} />
      <Route path="/workspace/:slug/settings"  element={<AuthRequired><WorkspaceSettingsPage /></AuthRequired>} />

      {/* Authenticated shell — AppLayout handles auth guard + sidebar */}
      <Route element={<AppLayout />}>
        <Route path="/"                    element={<HomeRedirect />} />
        <Route path="/admin"               element={<HomeRedirect />} />
        <Route path="/dashboard"           element={<DashboardPage />} />
        <Route path="/workspaces"          element={<WorkspacesPage />} />
        <Route path="/chats"               element={<ChatsPage />} />
        <Route path="/agent-runs"          element={<AgentRunsPage />} />
        <Route path="/approvals"           element={<ApprovalsPage />} />
        <Route path="/users"               element={<UsersPage />} />
        <Route path="/developer"           element={<ApiKeysPage />} />
        <Route path="/developer/embed"     element={<EmbedPage />} />
        <Route path="/settings"            element={<SettingsPage />} />
        <Route path="/settings/maintenance" element={<MaintenancePage />} />
        <Route path="/settings/vectors"    element={<VectorsPage />} />
        <Route path="*"                    element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
