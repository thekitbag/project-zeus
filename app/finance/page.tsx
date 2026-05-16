"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { BudgetCategoryCard } from "@/components/finance/BudgetCategoryCard";
import { DebtCard } from "@/components/finance/DebtCard";
import { AddSpendSheet } from "@/components/finance/AddSpendSheet";
import { AddDebtSheet } from "@/components/finance/AddDebtSheet";
import { MonzoConnect } from "@/components/finance/MonzoConnect";
import { AccountCard } from "@/components/finance/AccountCard";
import { PendingTransactionCard } from "@/components/finance/PendingTransactionCard";
import { formatMoney } from "@/lib/money";
import type { BudgetCategory, SpendingEntry, Debt, MonzoAccount, MonzoTransaction } from "@/db/schema";

function financialWeather(categories: BudgetCategory[], spendByCat: Map<number, number>): string {
  const totalBudget = categories.reduce((s, c) => s + c.monthlyBudget, 0);
  const totalSpent = categories.reduce((s, c) => s + (spendByCat.get(c.id) ?? 0), 0);
  if (totalBudget === 0) return "No budget configured. Flying blind.";
  const ratio = totalSpent / totalBudget;
  if (ratio >= 1) return "Unexpected resource depletion detected.";
  if (ratio >= 0.9) return "Discretionary manoeuvres not advised.";
  if (ratio >= 0.75) return "Budget pressure building. Proceed with awareness.";
  return "Operational calm maintained.";
}

function weatherColour(weather: string): string {
  if (weather.startsWith("Unexpected")) return "text-red-400";
  if (weather.startsWith("Discretionary")) return "text-amber-500";
  if (weather.startsWith("Budget pressure")) return "text-amber-400";
  return "text-green-400";
}

function MonzoCallbackHandler() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const status = searchParams.get("monzo");
  const msg = searchParams.get("msg");

  useEffect(() => {
    if (status) {
      qc.invalidateQueries({ queryKey: ["monzo-connected"] });
      qc.invalidateQueries({ queryKey: ["monzo-accounts"] });
    }
  }, [status, qc]);

  if (status === "error") {
    return (
      <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
        <p className="text-sm font-semibold text-red-700">Monzo connection failed</p>
        {msg && <p className="text-xs text-red-500 mt-0.5 font-mono">{msg}</p>}
      </div>
    );
  }
  return null;
}

export default function FinancePage() {
  const [spendOpen, setSpendOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const qc = useQueryClient();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["budget-categories"],
    queryFn: () => fetch("/api/finance/budget-categories").then((r) => r.json()),
  });

  const { data: entries = [] } = useQuery<SpendingEntry[]>({
    queryKey: ["spending", currentMonth],
    queryFn: () => fetch(`/api/finance/spending?month=${currentMonth}`).then((r) => r.json()),
  });

  const { data: debtList = [] } = useQuery<Debt[]>({
    queryKey: ["debts"],
    queryFn: () => fetch("/api/finance/debts").then((r) => r.json()),
  });

  const { data: monzoConnected = false } = useQuery<boolean>({
    queryKey: ["monzo-connected"],
    queryFn: async () => {
      const res = await fetch("/api/monzo/accounts");
      const accounts = await res.json() as MonzoAccount[];
      return accounts.length > 0;
    },
  });

  const { data: monzoAccounts = [] } = useQuery<MonzoAccount[]>({
    queryKey: ["monzo-accounts"],
    queryFn: () => fetch("/api/monzo/accounts").then((r) => r.json()),
    enabled: monzoConnected,
  });

  const { data: pendingTransactions = [] } = useQuery<MonzoTransaction[]>({
    queryKey: ["monzo-pending"],
    queryFn: () => fetch("/api/monzo/transactions/pending").then((r) => r.json()),
    enabled: monzoConnected,
  });

  const spendByCat = new Map<number, number>();
  for (const entry of entries) {
    spendByCat.set(entry.categoryId, (spendByCat.get(entry.categoryId) ?? 0) + entry.amountPence);
  }

  const totalBudget = categories.reduce((s, c) => s + c.monthlyBudget, 0);
  const totalSpent = categories.reduce((s, c) => s + (spendByCat.get(c.id) ?? 0), 0);
  const totalDebt = debtList.reduce((s, d) => s + d.balancePence, 0);
  const weather = financialWeather(categories, spendByCat);
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <Suspense fallback={null}><MonzoCallbackHandler /></Suspense>
      <header className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-600">Project Zeus</p>
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-200 shadow-sm flex-shrink-0">
            <Image src="/johnson.jpeg" alt="Johnson" fill className="object-cover object-top" sizes="40px" />
          </div>
        </div>
        <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-3 shadow-sm">
          <Image src="/marknestegg.jpeg" alt="Mark Corrigan" fill className="object-cover object-center" sizes="(max-width: 512px) 100vw, 512px" priority />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Finance</h1>
        <p className="text-sm text-stone-400 mt-0.5 leading-relaxed">
          &ldquo;You ate your nest egg? You&apos;re meant to sit on your nest egg until it hatches, not eat it like some greedy, mad chicken.&rdquo;
        </p>
      </header>

      <div className="px-4 pb-6 space-y-6">

        {/* Monzo connection */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-2">Accounts</p>
          <div className="space-y-2">
            {monzoAccounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
            <MonzoConnect
              connected={monzoConnected}
              onSynced={() => {
                qc.invalidateQueries({ queryKey: ["monzo-accounts"] });
                qc.invalidateQueries({ queryKey: ["monzo-pending"] });
              }}
            />
          </div>
        </div>

        {/* Pending transactions */}
        {pendingTransactions.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 mb-2">
              Review Transactions
              <span className="ml-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingTransactions.length}
              </span>
            </p>
            <div className="space-y-2">
              {pendingTransactions.map((tx) => (
                <PendingTransactionCard key={tx.id} transaction={tx} categories={categories} />
              ))}
            </div>
          </div>
        )}

        {/* Financial Weather */}
        <div className="bg-stone-900 rounded-2xl p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-500 mb-2">Financial Weather</p>
          <p className={`text-base font-semibold ${weatherColour(weather)}`}>{weather}</p>
          {totalBudget > 0 && (
            <p className="text-xs text-stone-500 mt-2">
              {formatMoney(totalSpent)} of {formatMoney(totalBudget)} budgeted for {monthLabel}
            </p>
          )}
          {totalDebt > 0 && (
            <p className="text-xs text-stone-500 mt-1">{formatMoney(totalDebt)} total tracked debt</p>
          )}
        </div>

        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
              Budget — {monthLabel}
            </p>
            <button
              onClick={() => setSpendOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors px-3 py-1.5 rounded-full"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Spend
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <BudgetCategoryCard key={cat.id} category={cat} spentPence={spendByCat.get(cat.id) ?? 0} />
            ))}
          </div>

          {categories.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">No budget categories. Things remain undefined.</p>
          )}
        </div>

        {/* Debts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">Debts</p>
            <button
              onClick={() => setDebtOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-500 border border-stone-200 hover:border-stone-400 transition-colors px-3 py-1.5 rounded-full"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Debt
            </button>
          </div>

          {debtList.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
              <p className="text-sm text-stone-400">No tracked debts.</p>
              <p className="text-xs text-stone-300 mt-1">An operational rarity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {debtList.map((debt) => (
                <DebtCard key={debt.id} debt={debt} />
              ))}
            </div>
          )}
        </div>

      </div>

      <AddSpendSheet open={spendOpen} onClose={() => setSpendOpen(false)} categories={categories} />
      <AddDebtSheet open={debtOpen} onClose={() => setDebtOpen(false)} />
    </>
  );
}
