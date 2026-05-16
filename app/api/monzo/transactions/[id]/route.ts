import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { monzoTransactions, spendingEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH: approve (with categoryId) or ignore
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const { action, categoryId } = await req.json() as { action: "approve" | "ignore"; categoryId?: number };

  const [tx] = await db.select().from(monzoTransactions).where(eq(monzoTransactions.id, Number(id)));
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "ignore") {
    await db.update(monzoTransactions).set({ status: "ignored" }).where(eq(monzoTransactions.id, Number(id)));
    return NextResponse.json({ status: "ignored" });
  }

  if (action === "approve") {
    if (!categoryId) return NextResponse.json({ error: "categoryId required for approval" }, { status: 400 });

    const [entry] = await db
      .insert(spendingEntries)
      .values({
        categoryId,
        amountPence: tx.amountPence,
        notes: tx.merchantName + (tx.notes ? ` — ${tx.notes}` : ""),
        date: tx.date,
        createdAt: new Date().toISOString(),
      })
      .returning();

    await db
      .update(monzoTransactions)
      .set({ status: "approved", spendingEntryId: entry.id })
      .where(eq(monzoTransactions.id, Number(id)));

    return NextResponse.json({ status: "approved", spendingEntryId: entry.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
