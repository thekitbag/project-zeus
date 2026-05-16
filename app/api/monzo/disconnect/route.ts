import { getDb } from "@/db";
import { monzoTokens, monzoAccounts, monzoTransactions } from "@/db/schema";

export async function DELETE() {
  const db = getDb();
  await db.delete(monzoTransactions);
  await db.delete(monzoAccounts);
  await db.delete(monzoTokens);
  return new Response(null, { status: 204 });
}
