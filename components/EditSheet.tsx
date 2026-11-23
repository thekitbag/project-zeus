"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";

export const editLabelClass =
  "text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5";
export const editFieldClass =
  "w-full text-base bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all";

interface Props {
  heading: string;
  canSave: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}

// Render this beside a row rather than inside it, so taps in the sheet can't
// reach the row's long-press handlers. It stays open if a save fails, so the
// edit isn't lost, and the app's error toast explains what happened.
export function EditSheet({ heading, canSave, saving, onClose, onSave, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSave && !saving) onSave();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="fixed bottom-0 inset-x-0 z-[55] bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>
        <form
          onSubmit={submit}
          className="px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-stone-900">{heading}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
          <button
            type="submit"
            disabled={!canSave || saving}
            className="mt-2 w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </>
  );
}
