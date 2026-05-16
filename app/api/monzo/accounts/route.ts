import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { monzoAccounts } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(monzoAccounts).orderBy(asc(monzoAccounts.createdAt));
  return NextResponse.json(rows);
}
