import { recordShoppingEmailSent } from "@/lib/shopping-email-scheduler";
import { sendShoppingEmail } from "@/lib/mailer";

// Manual trigger. The in-app scheduler (instrumentation.ts) is what normally
// sends; logging here stops it from sending a second email the same day.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendShoppingEmail();
  if (result.sent) await recordShoppingEmailSent();
  return Response.json(result);
}
