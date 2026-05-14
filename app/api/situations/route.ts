import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { situations } from "@/db/schema";
import { gte, asc } from "drizzle-orm";
import { toDateStr } from "@/lib/dates";

export async function GET() {
  const db = getDb();
  const todayStr = toDateStr(new Date());
  const rows = await db
    .select()
    .from(situations)
    .where(gte(situations.startDate, todayStr))
    .orderBy(asc(situations.startDate));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { title, categoryId, startDate, endDate, notes } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!categoryId)    return NextResponse.json({ error: "Category required" }, { status: 400 });
  if (!startDate)     return NextResponse.json({ error: "Start date required" }, { status: 400 });

  const [row] = await db
    .insert(situations)
    .values({
      title: title.trim(),
      categoryId,
      startDate,
      endDate: endDate || null,
      notes: notes?.trim() || null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
