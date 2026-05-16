"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const TYPES = [
  { value: "film", label: "Film" },
  { value: "series", label: "Series" },
  { value: "documentary", label: "Documentary" },
  { value: "other", label: "Other" },
] as const;

type WatchType = (typeof TYPES)[number]["value"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddWatchItemSheet({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WatchType>("film");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/watch-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, notes: notes || null }),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watch-items"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setTitle("");
    setType("film");
    setNotes("");
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        <div className="px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-stone-900">Add to Watch List</h2>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are we watching…"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="off"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    type === value
                      ? "bg-stone-800 text-white border-stone-800"
                      : "border-stone-200 text-stone-600 bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Notes <span className="normal-case font-normal text-stone-300">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Who recommended it, where to find it…"
              rows={3}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
            />
          </div>

          <button
            onClick={() => addMutation.mutate()}
            disabled={!title.trim() || addMutation.isPending}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {addMutation.isPending ? "Adding…" : "Add to List"}
          </button>
        </div>
      </div>
    </>
  );
}
