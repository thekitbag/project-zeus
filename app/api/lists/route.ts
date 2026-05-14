import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { shoppingLists } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const lists = await db.select().from(shoppingLists).orderBy(desc(shoppingLists.createdAt));
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const db = getDb();
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const [list] = await db
    .insert(shoppingLists)
    .values({ name: name.trim(), createdAt: new Date().toISOString() })
    .returning();
  return NextResponse.json(list, { status: 201 });
}
