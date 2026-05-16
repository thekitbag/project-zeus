"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parsePence, formatMoney } from "@/lib/money";
import { toDateStr } from "@/lib/dates";
import type { BudgetCategory } from "@/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  defaultCategoryId?: number;
}

export function AddSpendSheet({ open, onClose, categories, defaultCategoryId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategoryId ?? null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(toDateStr(new Date()));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setCategoryId(defaultCategoryId ?? null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultCategoryId]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/finance/spending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          amountPence: parsePence(amount),
          notes: notes || null,
          date,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      const month = date.slice(0, 7);
      qc.invalidateQueries({ queryKey: ["spending", month] });
      handleClose();
    },
  });

  const handleClose = () => {
    setAmount("");
    setCategoryId(defaultCategoryId ?? null);
    setNotes("");
    setDate(toDateStr(new Date()));
    onClose();
  };

  const amountPence = parsePence(amount);
  const canSubmit = amountPence > 0 && categoryId !== null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        <div className="px-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-900">Add Spend</h2>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount — large and prominent */}
          <div className="mb-5 flex items-center gap-2 bg-stone-50 rounded-2xl px-4 py-4 border border-stone-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <span className="text-3xl font-light text-stone-400">£</span>
            <input
              ref={inputRef}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 text-3xl font-semibold text-stone-900 bg-transparent outline-none placeholder:text-stone-300"
            />
            {amountPence > 0 && (
              <span className="text-xs text-stone-400">{formatMoney(amountPence)}</span>
            )}
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">Category</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryId === cat.id ? "border-transparent text-stone-800" : "border-stone-200 text-stone-600 bg-white"
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.colour } : {}}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Notes <span className="normal-case font-normal text-stone-300">(optional)</span>
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tesco, lunch, etc."
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="off"
            />
          </div>

          {/* Date */}
          <div className="mb-6">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>

          <button
            onClick={() => addMutation.mutate()}
            disabled={!canSubmit || addMutation.isPending}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {addMutation.isPending ? "Adding…" : "Log Spend"}
          </button>
        </div>
      </div>
    </>
  );
}
