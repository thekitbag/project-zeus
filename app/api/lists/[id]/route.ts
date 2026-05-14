import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { shoppingLists } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  await db.delete(shoppingLists).where(eq(shoppingLists.id, listId));
  return NextResponse.json({ ok: true });
}
