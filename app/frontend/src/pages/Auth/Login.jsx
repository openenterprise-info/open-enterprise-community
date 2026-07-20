import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: "Phase 1",
    title: "AI Assistants",
    desc: "Ask questions from your private enterprise knowledge base.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: "Phase 2",
    title: "AI Tools",
    desc: "Get help doing work with live connectors across all your business systems.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    label: "Phase 3",
    title: "AI Agents",
    desc: "Delegate work with autonomous, scheduled agents that run your workflows.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: "Phase 4",
    title: "AI Workforce",
    desc: "Deploy teams of agents with DLP guardrails, approval gates, and governance.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    ),
    label: "Phase 5",
    title: "AI Ecosystem",
    desc: "Connect memory, marketplace, governance, integrations, and everything that powers enterprise AI.",
  },
];

const SSO_ERRORS = {
  not_configured:      "SSO is not configured on this instance.",
  unknown_provider:    "Unknown SSO provider configured.",
  no_email:            "Your SSO provider did not return an email address.",
  user_not_found:      "No account found for this email. Contact your administrator.",
  account_suspended:   "Your account has been suspended.",
  use_password_login:  "This account must use password login.",
  apple_not_supported: "Apple SSO requires additional server-side setup.",
  no_code:             "SSO provider did not return an authorization code.",
};

export default function Login() {
  const { login, user } = useAuth();
  const navigate          = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sso, setSso]           = useState({ enabled: false, provider: null });
  const [ssoLoading, setSsoLoading] = useState(false);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    fetch("/api/instance").then(r => r.json()).then(d => {
      if (d.licenseType === "enterprise" && d.brandingName) {
        setBranding({ name: d.brandingName, logo: d.brandingLogo || null, url: d.brandingUrl || null });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { if (user) navigate("/"); }, [user]);

  useEffect(() => {
    // Handle SSO callback token
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("sso_token");
    const err    = params.get("sso_error");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        login(token, { id: payload.id, email: payload.email, role: payload.role, name: payload.name }, true);
        navigate("/");
      } catch { setError("SSO login failed — invalid token"); }
      return;
    }
    if (err) {
      setError(SSO_ERRORS[err] || decodeURIComponent(err));
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Fetch SSO config — cache-bust + retry in case server is still starting
    const fetchSso = (retries = 3) => {
      api.get("/sso/config?_=" + Date.now())
        .then(({ data }) => setSso({ enabled: data.enabled, provider: data.provider }))
        .catch(() => { if (retries > 0) setTimeout(() => fetchSso(retries - 1), 800); });
    };
    fetchSso();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user, remember);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(40px, -60px) scale(1.15); }
        }
        @keyframes orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-50px, 40px) scale(1.2); }
        }
        @keyframes orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(30px, 50px) scale(0.9); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .orb-1 { animation: orb-1 8s ease-in-out infinite; }
        .orb-2 { animation: orb-2 11s ease-in-out infinite; }
        .orb-3 { animation: orb-3 14s ease-in-out infinite; }
        .text-shimmer {
          background: linear-gradient(90deg, #fff 0%, #a5b4fc 40%, #fff 60%, #c7d2fe 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .dot-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .input-fancy {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          color: #1e293b;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .input-fancy:focus {
          border-color: #4f46e5;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
        }
        .input-fancy::placeholder { color: #94a3b8; }
        .btn-signin {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 0.625rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #fff;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border: none;
          cursor: pointer;
          transition: opacity 0.15s, box-shadow 0.15s, transform 0.1s;
          box-shadow: 0 4px 14px rgba(79,70,229,0.35);
        }
        .btn-signin:hover:not(:disabled) {
          opacity: 0.93;
          box-shadow: 0 6px 20px rgba(79,70,229,0.45);
          transform: translateY(-1px);
        }
        .btn-signin:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="min-h-screen flex">

        {/* ── Left branding panel ─────────────────────────────── */}
        <div
          className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between py-14 px-14"
          style={{ background: "linear-gradient(145deg, #13103a 0%, #1e1b4b 45%, #2e2a80 80%, #4f46e5 100%)" }}
        >
          <div className="absolute inset-0 dot-grid" />
          <div className="orb-1 absolute top-[-80px] left-[-60px] w-[380px] h-[380px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)" }} />
          <div className="orb-2 absolute bottom-[-100px] right-[-80px] w-[420px] h-[420px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)" }} />
          <div className="orb-3 absolute top-[40%] right-[10%] w-[240px] h-[240px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                {branding?.logo
                  ? <img src={branding.logo} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-white font-black text-xl">{branding ? branding.name[0].toUpperCase() : "E"}</span>
                }
              </div>
              <span className="text-white font-bold text-xl tracking-tight">{branding?.name || "Open Enterprise"}</span>
            </div>

            <h2 className="text-shimmer text-4xl font-black leading-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
              Your Enterprise AI Platform
            </h2>
            <p className="text-indigo-200 text-base leading-relaxed mb-8" style={{ color: "rgba(199,210,254,0.8)" }}>
              From AI assistants to a full enterprise AI Platform — deploy, automate, and govern AI across your entire organisation.
            </p>

            <div className="space-y-3.5">
              {FEATURES.map(f => (
                <div key={f.title} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", color: "#a5b4fc" }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base">{f.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: "rgba(165,180,252,0.75)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(165,180,252,0.9)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              v{__APP_VERSION__}
            </div>
          </div>
        </div>

        {/* ── Right login panel ───────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-8 py-12">

          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-indigo rounded-xl flex items-center justify-center overflow-hidden">
              {branding?.logo
                ? <img src={branding.logo} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-white font-black text-lg">{branding ? branding.name[0].toUpperCase() : "E"}</span>
              }
            </div>
            <span className="text-navy font-bold text-lg">{branding?.name || "Open Enterprise"}</span>
          </div>

          <div className="w-full max-w-[380px]">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-navy" style={{ letterSpacing: "-0.02em" }}>Welcome back</h1>
              <p className="text-slate-500 text-sm mt-1">Sign in to your workspace</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">

              {/* ── Card 1: Email + Password ── */}
              <div style={{
                background: "#fff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "0.875rem",
                padding: "1.25rem 1.25rem 1.375rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4" style={{ letterSpacing: "0.07em" }}>
                  Email &amp; Password
                </p>
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                    <input className="input-fancy" type="email" name="email" autoComplete="email" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <input className="input-fancy" type="password" name="password" autoComplete="current-password" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <div className="flex items-center pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 accent-indigo cursor-pointer" />
                      <span className="text-sm text-slate-600">Remember me</span>
                    </label>
                  </div>
                  <button type="submit" className="btn-signin" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Signing in…
                      </span>
                    ) : "Sign In"}
                  </button>
                </form>
              </div>

              {/* ── Card 2: SSO (only when enabled) ── */}
              {sso.enabled && (
                <div style={{
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "0.875rem",
                  padding: "1.25rem 1.25rem 1.375rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4" style={{ letterSpacing: "0.07em" }}>
                    Single Sign-On
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    Use your {sso.provider ? sso.provider.charAt(0).toUpperCase() + sso.provider.slice(1) : "SSO"} account to sign in instantly — no password needed.
                  </p>
                  <button
                    onClick={() => { setSsoLoading(true); window.location.href = "/api/sso/start"; }}
                    disabled={ssoLoading}
                    className="btn-signin"
                    style={{ background: "linear-gradient(135deg, #4338ca, #6366f1)" }}
                  >
                    {ssoLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Redirecting…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Login via {sso.provider ? sso.provider.charAt(0).toUpperCase() + sso.provider.slice(1) : "SSO"}
                      </span>
                    )}
                  </button>
                </div>
              )}

            </div>

            <p className="text-center text-slate-400 text-xs mt-8">
              {branding?.name || "Open Enterprise"} v{__APP_VERSION__} &mdash; Your Enterprise AI Platform
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
