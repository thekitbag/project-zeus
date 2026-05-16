import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(budgetCategories)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.colour !== undefined && { colour: body.colour }),
      ...(body.monthlyBudget !== undefined && { monthlyBudget: body.monthlyBudget }),
    })
    .where(eq(budgetCategories.id, Number(id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  await db.delete(budgetCategories).where(eq(budgetCategories.id, Number(id)));
  return new Response(null, { status: 204 });
}
