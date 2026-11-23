import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { situationCategories, situations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isRealDate, toDateStr } from "@/lib/dates";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const situationId = parseInt(id, 10);
  if (isNaN(situationId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const { categoryId, startDate } = body ?? {};
  const endDate = body?.endDate || null;
  const notes = body?.notes ?? null;

  if (!title) return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
  if (!Number.isInteger(categoryId)) return NextResponse.json({ error: "Category required" }, { status: 400 });
  if (!isRealDate(startDate)) return NextResponse.json({ error: "Enter a valid date" }, { status: 400 });
  if (endDate !== null && (!isRealDate(endDate) || endDate < startDate)) {
    return NextResponse.json({ error: "The end date must be after the start date" }, { status: 400 });
  }
  if (notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.select().from(situations).where(eq(situations.id, situationId)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The list hides past dates, so moving one there would make it vanish.
  if (startDate !== existing.startDate && startDate < toDateStr(new Date())) {
    return NextResponse.json({ error: "Key dates can't be moved into the past" }, { status: 400 });
  }
  const category = db.select().from(situationCategories).where(eq(situationCategories.id, categoryId)).get();
  if (!category) return NextResponse.json({ error: "That category doesn't exist" }, { status: 400 });

  const [row] = await db
    .update(situations)
    .set({
      title,
      categoryId,
      startDate,
      endDate: endDate === startDate ? null : endDate,
      notes: notes?.trim() || null,
    })
    .where(eq(situations.id, situationId))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const situationId = parseInt(id, 10);
  if (isNaN(situationId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = getDb();
  await db.delete(situations).where(eq(situations.id, situationId));
  return NextResponse.json({ ok: true });
}
