import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { shoppingItems } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const body = await req.json().catch(() => null);
  const updates: { completed?: boolean; text?: string } = {};
  if (typeof body?.completed === "boolean") updates.completed = body.completed;
  if (body?.text !== undefined) {
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    updates.text = text;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [item] = await db
    .update(shoppingItems)
    .set(updates)
    .where(eq(shoppingItems.id, itemId))
    .returning();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  await db.delete(shoppingItems).where(eq(shoppingItems.id, itemId));
  return NextResponse.json({ ok: true });
}
