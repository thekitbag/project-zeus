export async function GET(req: Request) {
  const clientId = process.env.MONZO_CLIENT_ID;
  const redirectUri = process.env.MONZO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json({ error: "MONZO_CLIENT_ID or MONZO_REDIRECT_URI not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: "zeus",
  });

  return Response.redirect(`https://auth.monzo.com/?${params}`, 302);
}
