"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toDateStr } from "@/lib/dates";
import type { SituationCategory } from "@/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: SituationCategory[];
}

export function AddSituationSheet({ open, onClose, categories }: Props) {
  const qc = useQueryClient();
  const todayStr = toDateStr(new Date());

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/situations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          categoryId,
          startDate,
          endDate: endDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add situation");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["situations"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setTitle("");
    setCategoryId(null);
    setStartDate("");
    setEndDate("");
    setNotes("");
    onClose();
  };

  const canSubmit = title.trim() && categoryId !== null && startDate;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        <div className="px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-stone-900">Add Situation</h2>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening…"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="off"
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryId === cat.id
                      ? "border-transparent text-stone-800"
                      : "border-stone-200 text-stone-600 bg-white"
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.colour } : {}}
                >
                  <span>{cat.emoji}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={startDate}
              min={todayStr}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate("");
              }}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>

          {/* End Date */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              End Date <span className="normal-case font-normal text-stone-300">(optional — for multi-day situations)</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || todayStr}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Notes <span className="normal-case font-normal text-stone-300">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional complications, emotional fallout, etc."
              rows={3}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
            />
          </div>

          <button
            onClick={() => addMutation.mutate()}
            disabled={!canSubmit || addMutation.isPending}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {addMutation.isPending ? "Adding…" : "Add Situation"}
          </button>
        </div>
      </div>
    </>
  );
}
