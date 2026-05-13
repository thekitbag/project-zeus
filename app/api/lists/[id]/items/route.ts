import { NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { shoppingItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  initDb();
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

  const items = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.listId, listId))
    .orderBy(asc(shoppingItems.createdAt));

  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: Params) {
  initDb();
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const [item] = await db
    .insert(shoppingItems)
    .values({ listId, text: text.trim(), completed: false, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
