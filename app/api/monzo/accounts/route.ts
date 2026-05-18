import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { monzoAccounts, monzoTokens } from "@/db/schema";
import { asc } from "drizzle-orm";
import { monzoFetch, accountDisplayName } from "@/lib/monzo";

export async function GET() {
  const db = getDb();
  let rows = await db.select().from(monzoAccounts).orderBy(asc(monzoAccounts.createdAt));

  if (rows.length === 0) {
    const tokens = await db.select().from(monzoTokens).limit(1);
    if (tokens.length > 0) {
      try {
        const { accounts } = await monzoFetch<{ accounts: { id: string; type: string; closed: boolean }[] }>("/accounts");
        const active = accounts.filter(
          (a) => !a.closed && a.type === "uk_retail_joint"
        );
        for (const account of active) {
          await db
            .insert(monzoAccounts)
            .values({
              monzoAccountId: account.id,
              name: accountDisplayName(account.type),
              type: account.type,
              balancePence: 0,
              createdAt: new Date().toISOString(),
            })
            .onConflictDoNothing();
        }
        rows = await db.select().from(monzoAccounts).orderBy(asc(monzoAccounts.createdAt));
      } catch {
        // Token may not have full access yet — return empty
      }
    }
  }

  return NextResponse.json(rows);
}
