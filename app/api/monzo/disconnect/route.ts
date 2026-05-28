import { getDb } from "@/db";
import { monzoTokens, monzoAccounts, monzoTransactions } from "@/db/schema";
import { ne } from "drizzle-orm";

export async function DELETE() {
  const db = getDb();
  // Keep approved transactions — they are permanent dedup guards linked to spending entries.
  // Re-importing after reconnect would otherwise create duplicate pending entries.
  await db.delete(monzoTransactions).where(ne(monzoTransactions.status, "approved"));
  await db.delete(monzoAccounts);
  await db.delete(monzoTokens);
  return new Response(null, { status: 204 });
}
