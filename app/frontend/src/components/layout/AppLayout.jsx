import React, { useState, useEffect } from "react";
import { Link, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserMenu from "../UserMenu";

const NAV_GROUPS = [
  {
    label: "Overview",
    managerOnly: true,
    items: [
      {
        id: "dashboard", label: "Dashboard", path: "/dashboard",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        id: "workspaces", label: "Workspaces", path: "/workspaces",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
      },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        id: "marketplace", label: "Templates", path: "/marketplace",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
      },
      {
        id: "agent-builder", label: "Builder", path: "/agent-builder", managerOnly: true, enterpriseOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
      },
      {
        id: "connectors-library", label: "Connectors", path: "/connectors-library",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />,
      },
      {
        id: "runtime", label: "Runtime", path: "/runtime",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />,
      },
    ],
  },
  {
    label: "Users",
    adminOnly: true,
    items: [
      {
        id: "users", label: "Users", path: "/users",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0zM3 17a3 3 0 016 0" />,
      },
    ],
  },
  {
    label: "Developer",
    adminOnly: true,
    items: [
      {
        id: "api-keys", label: "APIs", path: "/developer",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
      },
      {
        id: "embed", label: "Embed", path: "/developer/embed",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
      },
    ],
  },
  {
    label: "Security",
    adminOnly: true,
    enterpriseOnly: true,
    items: [
      {
        id: "compliance", label: "Compliance", path: "/settings/compliance",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
      {
        id: "violations", label: "Violations", path: "/settings/violations",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
      },
    ],
  },
  {
    label: "Observability",
    adminOnly: true,
    enterpriseOnly: true,
    items: [
      {
        id: "token-usage", label: "Token Usage", path: "/settings/token-usage",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      },
      {
        id: "activity", label: "Activity Log", path: "/settings/activity",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
      },
    ],
  },
  {
    label: "Settings",
    adminOnly: true,
    items: [
      {
        id: "settings", label: "Instance Settings", path: "/settings",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
      },
      {
        id: "maintenance", label: "Maintenance", path: "/settings/maintenance",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
      },
      {
        id: "vectors", label: "Vectors", path: "/settings/vectors", adminOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      },
      {
        id: "sso", label: "SSO", path: "/settings/sso", adminOnly: true, enterpriseOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
      },
      {
        id: "tier-limits", label: "Tier Limits", path: "/settings/tier-limits", superAdminOnly: true, enterpriseOnly: true,
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      },
    ],
  },
];

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [expandedGroups, setExpandedGroups] = useState(
    () => new Set(NAV_GROUPS.map(g => g.label))
  );
  const [licenseType, setLicenseType]   = useState("community");
  const [branding, setBranding]         = useState(null);

  useEffect(() => {
    fetch("/api/instance")
      .then(r => r.json())
      .then(d => {
        const lt = d.licenseType || "community";
        setLicenseType(lt);
        if (lt === "enterprise" && d.brandingName) setBranding({ name: d.brandingName, url: d.brandingUrl || null, logo: d.brandingLogo || null });
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  function toggleGroup(label) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const isFullBleed = pathname === "/agent-builder";

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <nav className="shrink-0 flex items-center justify-between px-6 py-3" style={{
        background: "linear-gradient(145deg, #13103a 0%, #1e1b4b 40%, #2e2a80 80%, #4f46e5 100%)",
        borderBottom: "1px solid rgba(99,102,241,0.25)",
        boxShadow: "0 1px 24px rgba(79,70,229,0.12)"
      }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/workspaces")} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow: "0 0 12px rgba(99,102,241,0.5)"
            }}>
              {branding?.logo
                ? <img src={branding.logo} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-white font-black text-sm">{branding?.name?.[0]?.toUpperCase() || "O"}</span>
              }
            </div>
            <span className="text-white font-semibold text-base tracking-tight">{branding?.name || "Open Enterprise"}</span>
          </button>
        </div>
        <UserMenu user={user} logout={logout} licenseType={licenseType} />
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <nav className="p-3 flex-1 overflow-y-auto">
            {NAV_GROUPS.filter(g => {
              if (g.enterpriseOnly && licenseType !== "enterprise") return false;
              if (g.adminOnly) return user?.role === "admin";
              if (g.managerOnly) return user?.role === "admin" || user?.role === "manager";
              return true;
            }).map(group => {
              const isOpen = expandedGroups.has(group.label);
              return (
                <div key={group.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo">{group.label}</span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 mb-3">
                      {group.items.filter(item => {
                        if (item.enterpriseOnly && licenseType !== "enterprise") return false;
                        if (item.superAdminOnly) return user?.id === 0;
                        if (item.adminOnly) return user?.role === "admin";
                        if (item.managerOnly) return user?.role === "admin" || user?.role === "manager";
                        return true;
                      }).map(item => (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={`w-full flex items-center gap-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                            item.sub ? "pl-5 pr-3 py-1.5" : "px-3 py-2"
                          } ${pathname === item.path ? "bg-indigo/10 text-indigo" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                        >
                          <svg className={`shrink-0 fill-none ${item.sub ? "w-3.5 h-3.5" : "w-4 h-4"}`} viewBox="0 0 24 24" stroke="currentColor">
                            {item.icon}
                          </svg>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer — edition badge + CTA */}
          <div className="shrink-0 border-t border-gray-100 px-3 py-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              licenseType === "enterprise"
                ? "bg-indigo/10 text-indigo"
                : "bg-emerald-50 text-emerald-600"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${licenseType === "enterprise" ? "bg-indigo" : "bg-emerald-500"}`} />
              {licenseType === "enterprise" ? "Enterprise Edition" : "Community Edition"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-50 text-amber-600">
              v{__APP_VERSION__}
            </span>
          </div>
        </aside>

        <main className={`flex-1 flex flex-col ${isFullBleed ? "overflow-hidden" : "overflow-y-auto"}`}>
          <div className={`flex-1 ${isFullBleed ? "overflow-hidden" : "p-8"}`}>
            <Outlet />
          </div>
          {(licenseType === "community" || branding) && (
            <footer className="shrink-0 border-t border-gray-100 py-3 px-8 flex items-center justify-center">
              {branding ? (
                branding.url ? (
                  <a href={branding.url} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-indigo transition-colors">
                    Powered by <span className="font-semibold">{branding.name}</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Powered by <span className="font-semibold">{branding.name}</span></span>
                )
              ) : (
                <a href="https://www.openenterprise.info" target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-indigo transition-colors">
                  Powered by <span className="font-semibold">www.openenterprise.info</span>
                </a>
              )}
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
