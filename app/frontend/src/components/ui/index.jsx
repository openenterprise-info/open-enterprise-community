import React from "react";

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="w-6 h-6 border-4 border-indigo border-t-transparent rounded-full animate-spin" />;
}

export function EmptyState({ message, action, actionLabel }) {
  return (
    <div className="py-14 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
      {action && (
        <button onClick={action} className="mt-3 text-xs font-medium text-indigo hover:text-indigo/80 border border-indigo/30 px-3 py-1.5 rounded-lg transition-colors">
          {actionLabel || "Get started →"}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  return (
    <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
      {message}
      <button onClick={onClose} className="ml-4 font-bold text-red-400 hover:text-red-600">&times;</button>
    </div>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    admin:   "bg-indigo/10 text-indigo",
    manager: "bg-amber-100 text-amber-700",
    user:    "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.user}`}>
      {role}
    </span>
  );
}
