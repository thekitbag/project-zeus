import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { situations } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const situationId = parseInt(id, 10);
  if (isNaN(situationId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  await db.delete(situations).where(eq(situations.id, situationId));
  return NextResponse.json({ ok: true });
}
