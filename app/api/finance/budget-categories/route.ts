import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetCategories } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(budgetCategories).orderBy(asc(budgetCategories.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { name, emoji, colour, monthlyBudget } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [row] = await db
    .insert(budgetCategories)
    .values({
      name: name.trim(),
      emoji: emoji || "📦",
      colour: colour || "#d4d4d4",
      monthlyBudget: monthlyBudget ?? 0,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
