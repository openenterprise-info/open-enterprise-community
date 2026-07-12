import React from "react";

export default function MarketplacePage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo/10 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Marketplace</h2>
      <p className="text-sm text-gray-400">Coming soon.</p>
    </div>
  );
}
