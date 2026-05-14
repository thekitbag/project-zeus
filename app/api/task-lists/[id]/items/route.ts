import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { taskItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

  const db = getDb();
  const items = await db
    .select()
    .from(taskItems)
    .where(eq(taskItems.listId, listId))
    .orderBy(asc(taskItems.createdAt));
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const db = getDb();
  const [item] = await db
    .insert(taskItems)
    .values({ listId, text: text.trim(), completed: false, createdAt: new Date().toISOString() })
    .returning();
  return NextResponse.json(item, { status: 201 });
}
