import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { taskItems } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  const body = await req.json();
  const [item] = await db
    .update(taskItems)
    .set({ completed: body.completed })
    .where(eq(taskItems.id, itemId))
    .returning();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  await db.delete(taskItems).where(eq(taskItems.id, itemId));
  return NextResponse.json({ ok: true });
}
