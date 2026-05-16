"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import { formatMoney, parsePence } from "@/lib/money";
import type { Debt } from "@/db/schema";

export function DebtCard({ debt }: { debt: Debt }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/finance/debts/${debt.id}`, { method: "DELETE" });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["debts"] });
      const prev = qc.getQueryData(["debts"]);
      qc.setQueryData<Debt[]>(["debts"], (old) => old?.filter((d) => d.id !== debt.id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["debts"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (balancePence: number) => {
      const res = await fetch(`/api/finance/debts/${debt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balancePence }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  });

  const longPress = useLongPress(() => setConfirming(true));

  const handleBalanceSave = () => {
    const pence = parsePence(balanceInput);
    if (!isNaN(pence)) updateMutation.mutate(pence);
    setEditingBalance(false);
    setBalanceInput("");
  };

  if (confirming) {
    return (
      <div className="bg-red-50 rounded-2xl p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700 font-medium truncate">Remove &ldquo;{debt.name}&rdquo;?</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setConfirming(false)} className="text-xs text-stone-500 font-medium px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors">
            Reprieve
          </button>
          <button onClick={() => deleteMutation.mutate()} className="text-xs text-white font-medium px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 transition-colors">
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div {...longPress} className="bg-white rounded-2xl p-4 border border-stone-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">{debt.name}</p>
          {debt.interestRate !== null && debt.interestRate !== undefined && (
            <p className="text-xs text-stone-400 mt-0.5">{debt.interestRate}% APR</p>
          )}
          {debt.notes && (
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{debt.notes}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {editingBalance ? (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-sm text-stone-400">£</span>
              <input
                autoFocus
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                onBlur={handleBalanceSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleBalanceSave(); if (e.key === "Escape") { setEditingBalance(false); setBalanceInput(""); } }}
                className="w-24 text-lg font-bold text-stone-900 border-b border-amber-400 outline-none bg-transparent text-right"
                inputMode="decimal"
              />
            </div>
          ) : (
            <p className="text-lg font-bold text-stone-900">{formatMoney(debt.balancePence)}</p>
          )}
          {debt.monthlyPaymentPence !== null && debt.monthlyPaymentPence !== undefined && (
            <p className="text-xs text-stone-400">{formatMoney(debt.monthlyPaymentPence)}/mo</p>
          )}
        </div>
      </div>

      {!editingBalance && (
        <button
          onClick={() => { setEditingBalance(true); setBalanceInput(String(debt.balancePence / 100)); }}
          className="mt-3 text-[10px] font-semibold tracking-wide uppercase text-amber-600 hover:text-amber-700 transition-colors"
        >
          Update balance
        </button>
      )}
    </div>
  );
}
