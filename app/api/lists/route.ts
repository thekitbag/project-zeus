import { NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { shoppingLists } from "@/db/schema";
import { desc } from "drizzle-orm";

function ensureDb() {
  initDb();
}

export async function GET() {
  ensureDb();
  const lists = await db.select().from(shoppingLists).orderBy(desc(shoppingLists.createdAt));
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  ensureDb();
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
