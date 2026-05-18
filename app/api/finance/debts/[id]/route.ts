import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { debts, debtSnapshots } from "@/db/schema";
import { eq, sum } from "drizzle-orm";

async function recordDebtSnapshot() {
  const db = getDb();
  const [{ total }] = await db.select({ total: sum(debts.balancePence) }).from(debts);
  await db.insert(debtSnapshots).values({
    date: new Date().toISOString().slice(0, 10),
    totalPence: Number(total ?? 0),
    createdAt: new Date().toISOString(),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(debts)
    .set({
      ...(body.balancePence !== undefined && { balancePence: body.balancePence }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.interestRate !== undefined && { interestRate: body.interestRate }),
      ...(body.monthlyPaymentPence !== undefined && { monthlyPaymentPence: body.monthlyPaymentPence }),
      ...(body.notes !== undefined && { notes: body.notes }),
    })
    .where(eq(debts.id, Number(id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordDebtSnapshot();
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  await db.delete(debts).where(eq(debts.id, Number(id)));
  await recordDebtSnapshot();
  return new Response(null, { status: 204 });
}
