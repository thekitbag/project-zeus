import { getDb } from "@/db";
import { spendingEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  await db.delete(spendingEntries).where(eq(spendingEntries.id, Number(id)));
  return new Response(null, { status: 204 });
}
