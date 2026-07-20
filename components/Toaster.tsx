"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, dismissToast, type Toast } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto max-w-sm w-full flex items-start gap-2.5 bg-stone-800 text-white text-sm text-left rounded-xl px-4 py-3 shadow-lg"
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.06 13.95A1.5 1.5 0 003.58 20h16.84a1.5 1.5 0 001.3-2.11L13.66 3.94a1.5 1.5 0 00-2.62 0z" />
          </svg>
          <span className="flex-1 leading-snug">{t.message}</span>
        </button>
      ))}
    </div>
  );
}
