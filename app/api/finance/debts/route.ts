import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { debts, debtSnapshots } from "@/db/schema";
import { asc, sum } from "drizzle-orm";

async function recordDebtSnapshot() {
  const db = getDb();
  const [{ total }] = await db.select({ total: sum(debts.balancePence) }).from(debts);
  await db.insert(debtSnapshots).values({
    date: new Date().toISOString().slice(0, 10),
    totalPence: Number(total ?? 0),
    createdAt: new Date().toISOString(),
  });
}

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(debts).orderBy(asc(debts.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { name, balancePence, interestRate, monthlyPaymentPence, notes } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (balancePence === undefined || balancePence < 0) return NextResponse.json({ error: "Balance required" }, { status: 400 });

  const [row] = await db
    .insert(debts)
    .values({
      name: name.trim(),
      balancePence,
      interestRate: interestRate ?? null,
      monthlyPaymentPence: monthlyPaymentPence ?? null,
      notes: notes?.trim() || null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  await recordDebtSnapshot();
  return NextResponse.json(row, { status: 201 });
}
