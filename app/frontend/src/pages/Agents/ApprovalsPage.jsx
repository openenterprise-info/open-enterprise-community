import React from "react";
import { Link } from "react-router-dom";

export default function ApprovalsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Approvals</h2>
          <p className="text-sm text-gray-400 mt-0.5">Review and approve pending agent actions</p>
        </div>
        <Link to="/agents"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors">
          ← Agent Studio
        </Link>
      </div>

      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700">Approvals coming soon</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Human-in-the-loop approvals for agent actions will appear here.
        </p>
      </div>
    </div>
  );
}
