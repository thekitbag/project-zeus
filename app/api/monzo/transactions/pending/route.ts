import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { monzoTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(monzoTransactions)
    .where(eq(monzoTransactions.status, "pending"))
    .orderBy(desc(monzoTransactions.date));
  return NextResponse.json(rows);
}
