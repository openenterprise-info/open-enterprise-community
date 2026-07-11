import React, { useState, useEffect } from "react";

function DangerIcon() {
  return (
    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  confirmText,        // if set, user must type this exact string to enable confirm
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const isDanger = variant === "danger";
  const [typed, setTyped] = useState("");

  useEffect(() => { setTyped(""); }, [confirmText]);

  const canConfirm = !confirmText || typed === confirmText;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${isDanger ? "bg-red-100" : "bg-amber-100"}`}>
          {isDanger ? <DangerIcon /> : <WarningIcon />}
        </div>

        <h3 className="text-center font-bold text-gray-900 text-base mb-1">{title}</h3>

        {message && (
          <p className="text-center text-gray-500 text-sm mb-1">{message}</p>
        )}

        {detail && (
          <p className="text-center font-medium text-gray-800 text-sm truncate px-2 mb-1" title={detail}>
            "{detail}"
          </p>
        )}

        <p className="text-center text-xs text-gray-400 mb-4">This action cannot be undone.</p>

        {confirmText && (
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-1.5 text-center">
              Type <span className="font-semibold text-gray-800">{confirmText}</span> to confirm
            </p>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && canConfirm && !loading) onConfirm(); }}
              placeholder={confirmText}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-center font-mono"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
