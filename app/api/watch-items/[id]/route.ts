import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const { watched } = await req.json();

  const [row] = await db
    .update(watchItems)
    .set({ watched })
    .where(eq(watchItems.id, Number(id)))
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
