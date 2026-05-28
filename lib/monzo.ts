import { getDb } from "@/db";
import { monzoTokens, budgetCategories } from "@/db/schema";
import type { BudgetCategory } from "@/db/schema";

const MONZO_API = "https://api.monzo.com";

export class MonzoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonzoAuthError";
  }
}

// Monzo category → Zeus category name
const MONZO_CATEGORY_MAP: Record<string, string> = {
  groceries: "Groceries",
  eating_out: "Takeaway",
  transport: "Travel",
  entertainment: "Entertainment",
  bills: "Bills",
  shopping: "Household",
  holidays: "Travel",
  general: "Miscellaneous",
  expenses: "Miscellaneous",
  cash: "Miscellaneous",
  personal_care: "Miscellaneous",
  savings: "Miscellaneous",
};

export function mapMonzoCategory(monzoCategory: string, categories: BudgetCategory[]): BudgetCategory | null {
  const zeusName = MONZO_CATEGORY_MAP[monzoCategory] ?? "Miscellaneous";
  return categories.find((c) => c.name === zeusName) ?? categories.find((c) => c.name === "Miscellaneous") ?? null;
}

export function accountDisplayName(type: string): string {
  if (type === "uk_retail_joint") return "Monzo Joint";
  if (type === "uk_retail") return "Monzo Personal";
  return "Monzo";
}

async function refreshTokens() {
  const db = getDb();
  const [tokens] = await db.select().from(monzoTokens);
  if (!tokens) throw new MonzoAuthError("Not connected to Monzo");

  const expiresAt = new Date(tokens.expiresAt).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) return tokens;

  const res = await fetch(`${MONZO_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MONZO_CLIENT_ID!,
      client_secret: process.env.MONZO_CLIENT_SECRET!,
      refresh_token: tokens.refreshToken ?? "",
    }),
  });

  if (!res.ok) throw new MonzoAuthError("Monzo token refresh failed");
  const data = await res.json();

  await db.delete(monzoTokens);
  await db.insert(monzoTokens).values({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    monzoUserId: tokens.monzoUserId,
    createdAt: new Date().toISOString(),
  });

  return { ...tokens, accessToken: data.access_token as string };
}

export async function monzoFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const tokens = await refreshTokens();
  const res = await fetch(`${MONZO_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Monzo API ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function isConnected(): Promise<boolean> {
  const db = getDb();
  const [tokens] = await db.select().from(monzoTokens);
  return !!tokens;
}

export async function getSuggestedCategoryId(monzoCategory: string): Promise<number | null> {
  const db = getDb();
  const cats = await db.select().from(budgetCategories);
  return mapMonzoCategory(monzoCategory, cats)?.id ?? null;
}
