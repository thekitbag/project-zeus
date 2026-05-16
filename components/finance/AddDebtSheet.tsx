"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parsePence } from "@/lib/money";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddDebtSheet({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/finance/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          balancePence: parsePence(balance),
          interestRate: interestRate ? parseFloat(interestRate) : null,
          monthlyPaymentPence: monthlyPayment ? parsePence(monthlyPayment) : null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setName("");
    setBalance("");
    setInterestRate("");
    setMonthlyPayment("");
    setNotes("");
    onClose();
  };

  const canSubmit = name.trim() && parsePence(balance) >= 0 && balance !== "";

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
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-stone-900">Add Debt</h2>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Barclaycard, student loan…"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              autoComplete="off"
            />
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">Current Balance (£)</label>
            <input
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="3420.00"
              inputMode="decimal"
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
                Interest Rate <span className="normal-case font-normal text-stone-300">(%)</span>
              </label>
              <input
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="19.9"
                inputMode="decimal"
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
                Monthly Payment <span className="normal-case font-normal text-stone-300">(£)</span>
              </label>
              <input
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="150.00"
                inputMode="decimal"
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 block mb-1.5">
              Notes <span className="normal-case font-normal text-stone-300">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context…"
              rows={2}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
            />
          </div>

          <button
            onClick={() => addMutation.mutate()}
            disabled={!canSubmit || addMutation.isPending}
            className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {addMutation.isPending ? "Adding…" : "Add Debt"}
          </button>
        </div>
      </div>
    </>
  );
}
