"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/lib/money";
import type { MonzoTransaction, BudgetCategory } from "@/db/schema";

interface Props {
  transaction: MonzoTransaction;
  categories: BudgetCategory[];
}

export function PendingTransactionCard({ transaction, categories }: Props) {
  const qc = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    transaction.suggestedCategoryId ?? null
  );

  const actionMutation = useMutation({
    mutationFn: async (action: "approve" | "ignore") => {
      const res = await fetch(`/api/monzo/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, categoryId: selectedCategoryId }),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monzo-pending"] });
      qc.invalidateQueries({ queryKey: ["spending"] });
    },
  });

  const dateStr = new Date(transaction.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{transaction.merchantName}</p>
          <p className="text-xs text-stone-400 mt-0.5">{dateStr} · {transaction.monzoCategory.replace(/_/g, " ")}</p>
          {transaction.notes && (
            <p className="text-xs text-stone-400 mt-0.5 italic">{transaction.notes}</p>
          )}
        </div>
        <p className="text-base font-bold text-stone-900 flex-shrink-0">{formatMoney(transaction.amountPence)}</p>
      </div>

      {/* Category picker */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
              selectedCategoryId === cat.id
                ? "border-transparent text-stone-800"
                : "border-stone-200 text-stone-500 bg-white"
            }`}
            style={selectedCategoryId === cat.id ? { backgroundColor: cat.colour } : {}}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => actionMutation.mutate("approve")}
          disabled={!selectedCategoryId || actionMutation.isPending}
          className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
        >
          Log to budget
        </button>
        <button
          onClick={() => actionMutation.mutate("ignore")}
          disabled={actionMutation.isPending}
          className="px-4 py-2 rounded-xl border border-stone-200 text-stone-400 text-xs font-semibold hover:border-stone-400 transition-colors"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
