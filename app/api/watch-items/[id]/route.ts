import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchItems, type WatchItem } from "@/db/schema";
import { WATCH_TYPES } from "@/lib/voice/types";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const updates: Partial<Pick<WatchItem, "watched" | "title" | "type" | "notes">> = {};
  if (typeof body?.watched === "boolean") updates.watched = body.watched;
  if (body?.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    updates.title = title;
  }
  if (body?.type !== undefined) {
    const type = WATCH_TYPES.find((value) => value === body.type);
    if (!type) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    updates.type = type;
  }
  if (body?.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
    updates.notes = body.notes?.trim() || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [row] = await db
    .update(watchItems)
    .set(updates)
    .where(eq(watchItems.id, itemId))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  await db.delete(watchItems).where(eq(watchItems.id, Number(id)));
  return new Response(null, { status: 204 });
}
