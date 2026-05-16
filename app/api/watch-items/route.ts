import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchItems } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(watchItems).orderBy(desc(watchItems.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { title, type, notes } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [row] = await db
    .insert(watchItems)
    .values({
      title: title.trim(),
      type: type ?? "film",
      notes: notes?.trim() || null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
