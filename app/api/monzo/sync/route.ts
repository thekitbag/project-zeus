import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { monzoAccounts, monzoTransactions } from "@/db/schema";
import { monzoFetch, getSuggestedCategoryId } from "@/lib/monzo";
import { eq } from "drizzle-orm";

interface MonzoTransaction {
  id: string;
  amount: number;
  merchant: { name: string } | null;
  description: string;
  category: string;
  created: string;
  notes: string;
  is_load: boolean;
  decline_reason: string | null;
  currency: string;
}

interface MonzoBalance {
  balance: number;
}

export async function POST() {
  const db = getDb();
  const accounts = (await db.select().from(monzoAccounts)).filter(
    (a) => a.type === "uk_retail_joint"
  );

  if (accounts.length === 0) {
    return NextResponse.json({ error: "No joint account connected" }, { status: 400 });
  }

  let totalImported = 0;

  for (const account of accounts) {
    // Update balance
    try {
      const balanceData = await monzoFetch<MonzoBalance>(`/balance?account_id=${account.monzoAccountId}`);
      await db
        .update(monzoAccounts)
        .set({ balancePence: balanceData.balance })
        .where(eq(monzoAccounts.monzoAccountId, account.monzoAccountId));
    } catch {
      // Balance fetch failed — non-fatal, continue with transactions
    }

    // Fetch transactions since last sync (or start of current month)
    const since = account.lastSyncedAt
      ? new Date(account.lastSyncedAt).toISOString()
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const params = new URLSearchParams({
      account_id: account.monzoAccountId,
      since,
      limit: "100",
    });

    let transactions: MonzoTransaction[] = [];
    try {
      const data = await monzoFetch<{ transactions: MonzoTransaction[] }>(`/transactions?${params}&expand[]=merchant`);
      transactions = data.transactions;
    } catch {
      continue;
    }

    // Filter to spending only: negative GBP, not a load, not declined
    const spending = transactions.filter(
      (t) => t.amount < 0 && !t.is_load && !t.decline_reason && t.currency === "GBP"
    );

    for (const t of spending) {
      const merchantName = t.merchant?.name ?? t.description ?? "Unknown";
      const date = t.created.slice(0, 10);
      const suggestedCategoryId = await getSuggestedCategoryId(t.category);

      try {
        await db.insert(monzoTransactions).values({
          monzoTransactionId: t.id,
          monzoAccountId: account.monzoAccountId,
          merchantName,
          amountPence: Math.abs(t.amount),
          date,
          monzoCategory: t.category,
          suggestedCategoryId,
          notes: t.notes || null,
          status: "pending",
          createdAt: new Date().toISOString(),
        }).onConflictDoNothing();
        totalImported++;
      } catch {
        // Already exists — skip
      }
    }

    // Update lastSyncedAt
    await db
      .update(monzoAccounts)
      .set({ lastSyncedAt: new Date().toISOString() })
      .where(eq(monzoAccounts.monzoAccountId, account.monzoAccountId));
  }

  return NextResponse.json({ imported: totalImported });
}
