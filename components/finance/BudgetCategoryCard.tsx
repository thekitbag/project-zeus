"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLongPress } from "@/lib/useLongPress";
import { formatMoney, parsePence } from "@/lib/money";
import type { BudgetCategory } from "@/db/schema";

interface Props {
  category: BudgetCategory;
  spentPence: number;
}

export function BudgetCategoryCard({ category, spentPence }: Props) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const ratio = category.monthlyBudget > 0 ? spentPence / category.monthlyBudget : 0;
  const pct = Math.min(ratio * 100, 100);
  const barColour = ratio >= 1 ? "bg-red-400" : ratio >= 0.75 ? "bg-amber-400" : "bg-green-400";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/finance/budget-categories/${category.id}`, { method: "DELETE" });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["budget-categories"] });
      const prev = qc.getQueryData(["budget-categories"]);
      qc.setQueryData<BudgetCategory[]>(["budget-categories"], (old) =>
        old?.filter((c) => c.id !== category.id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["budget-categories"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["budget-categories"] }),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (monthlyBudget: number) => {
      const res = await fetch(`/api/finance/budget-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-categories"] }),
  });

  const longPress = useLongPress(() => setConfirming(true));

  const handleBudgetSave = () => {
    const pence = parsePence(budgetInput);
    if (pence > 0) updateBudgetMutation.mutate(pence);
    setEditingBudget(false);
    setBudgetInput("");
  };

  if (confirming) {
    return (
      <div className="bg-red-50 rounded-2xl p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700 font-medium truncate">Remove &ldquo;{category.name}&rdquo;?</p>
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
    <div
      {...longPress}
      className="bg-white rounded-2xl p-4 border border-stone-100"
      style={{ borderLeftWidth: 4, borderLeftColor: category.colour }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-stone-800">
          {category.emoji} {category.name}
        </span>
        <span className="text-xs text-stone-400">
          {formatMoney(spentPence)}{" "}
          <span className="text-stone-300">/</span>{" "}
          {editingBudget ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-stone-400">£</span>
              <input
                autoFocus
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={handleBudgetSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleBudgetSave(); if (e.key === "Escape") { setEditingBudget(false); setBudgetInput(""); } }}
                className="w-16 text-xs text-stone-700 border-b border-amber-400 outline-none bg-transparent"
                inputMode="decimal"
              />
            </span>
          ) : (
            <button
              onClick={() => { setEditingBudget(true); setBudgetInput(String(category.monthlyBudget / 100)); }}
              className="underline decoration-dotted text-stone-400 hover:text-stone-600 transition-colors"
            >
              {formatMoney(category.monthlyBudget)}
            </button>
          )}
        </span>
      </div>

      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColour}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {ratio > 1 && (
        <p className="text-[10px] text-red-400 mt-1.5">
          {formatMoney(spentPence - category.monthlyBudget)} over budget
        </p>
      )}
    </div>
  );
}
