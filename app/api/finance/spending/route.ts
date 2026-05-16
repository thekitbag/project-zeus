import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { spendingEntries } from "@/db/schema";
import { and, gte, lt, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const [year, mon] = month.split("-").map(Number);
  const start = `${year}-${String(mon).padStart(2, "0")}-01`;
  const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

  const rows = await db
    .select()
    .from(spendingEntries)
    .where(and(gte(spendingEntries.date, start), lt(spendingEntries.date, nextMonth)))
    .orderBy(asc(spendingEntries.date));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { categoryId, amountPence, notes, date } = await req.json();

  if (!categoryId) return NextResponse.json({ error: "Category required" }, { status: 400 });
  if (!amountPence || amountPence <= 0) return NextResponse.json({ error: "Amount required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Date required" }, { status: 400 });

  const [row] = await db
    .insert(spendingEntries)
    .values({
      categoryId,
      amountPence,
      notes: notes?.trim() || null,
      date,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
