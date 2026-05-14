import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { situationCategories } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const cats = await db.select().from(situationCategories).orderBy(asc(situationCategories.id));
  return NextResponse.json(cats);
}
