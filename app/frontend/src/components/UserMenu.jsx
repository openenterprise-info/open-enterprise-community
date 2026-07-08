import React, { useState, useRef, useEffect } from "react";
import api from "../utils/api";

function ProfileModal({ user, onClose }) {
  const [name, setName]               = useState(user?.name || "");
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPw && newPw !== confirmPw) return setError("New passwords do not match");
    setSaving(true);
    try {
      const payload = { name };
      if (newPw) { payload.currentPassword = currentPw; payload.newPassword = newPw; }
      await api.put("/auth/me", payload);
      setSuccess("Profile updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">My Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user?.email} &middot; <span className="capitalize">{user?.role}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {error   && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">{success}</div>}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input w-full"
              placeholder="Your name"
            />
          </div>

          {/* Password section */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Change Password</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserMenu({ user, logout }) {
  const [open, setOpen]             = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayName = user?.name || user?.email || "";
  const initial = displayName?.[0]?.toUpperCase();

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              boxShadow: "0 0 0 2px rgba(99,102,241,0.35)"
            }}>
              {initial}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-navy" />
          </div>
          <span className="text-sm font-medium" style={{ color: "rgba(226,232,240,0.85)" }}>{displayName}</span>
          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(148,163,184,0.7)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 overflow-hidden" style={{
            background: "linear-gradient(145deg, #13103a 0%, #1e1b4b 40%, #2e2a80 80%, #4f46e5 100%)",
            borderColor: "rgba(99,102,241,0.25)",
          }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>Signed in as</p>
              <p className="text-sm font-medium text-white mt-0.5 truncate">{displayName}</p>
            </div>

            <div className="p-1.5">
              {/* Profile — hidden for super admin (.env) and SSO users (no app password) */}
              {user?.id !== 0 && !user?.sso && <button
                onClick={() => { setOpen(false); setShowProfile(true); }}
                className="flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/10"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">Profile &amp; Password</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>Update your name or reset password</p>
                </div>
              </button>}

              {/* Report bug */}
              <a
                href="mailto:support@openenterprise.info?subject=Bug Report"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/10"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">Report a Bug</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>Send an email to support@openenterprise.info</p>
                </div>
              </a>

              <div className="my-1 border-t" style={{ borderColor: "rgba(99,102,241,0.15)" }} />

              <button
                onClick={() => { setOpen(false); logout(); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/10"
              >
                <svg className="w-4 h-4 shrink-0" style={{ color: "rgba(148,163,184,0.8)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "rgba(226,232,240,0.85)" }}>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </>
  );
}
