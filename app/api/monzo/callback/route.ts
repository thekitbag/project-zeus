import { getDb } from "@/db";
import { monzoTokens, monzoAccounts } from "@/db/schema";
import { accountDisplayName } from "@/lib/monzo";

function financeRedirect(req: Request, params: Record<string, string>): Response {
  const url = new URL("/finance", req.url);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return Response.redirect(url, 302);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return financeRedirect(req, { monzo: "error", msg: error ?? "no_code" });
  }

  const clientId = process.env.MONZO_CLIENT_ID!;
  const clientSecret = process.env.MONZO_CLIENT_SECRET!;
  const redirectUri = process.env.MONZO_REDIRECT_URI!;

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.monzo.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.json().catch(() => ({})) as { message?: string; error?: string };
    const msg = body.message ?? body.error ?? `HTTP ${tokenRes.status}`;
    return financeRedirect(req, { monzo: "error", msg });
  }

  const tokenData = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: string;
  };

  const db = getDb();

  // Store tokens (one row only)
  await db.delete(monzoTokens);
  await db.insert(monzoTokens).values({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    monzoUserId: tokenData.user_id,
    createdAt: new Date().toISOString(),
  });

  // Fetch and store accounts
  const accountsRes = await fetch("https://api.monzo.com/accounts", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (accountsRes.ok) {
    const { accounts } = await accountsRes.json() as {
      accounts: { id: string; type: string; closed: boolean }[];
    };
    const active = accounts.filter(
      (a) => !a.closed && (a.type === "uk_retail" || a.type === "uk_retail_joint")
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
  }

  return financeRedirect(req, { monzo: "connected" });
}
