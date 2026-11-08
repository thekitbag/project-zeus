import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { emailLog } from "@/db/schema";
import { sendShoppingEmail } from "@/lib/mailer";

// Sends the groceries email on the configured days, once per day, at or after
// the configured hour (London time). Checking on an interval rather than at an
// exact minute means a send missed while the Pi was down still goes out later
// that day; email_log stops restarts from sending it twice.
const KIND = "shopping";
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DAYS = (process.env.SHOPPING_EMAIL_DAYS ?? "Mon,Thu")
  .split(",")
  .map((d) => d.trim().slice(0, 3).toLowerCase());
const HOUR = Number(process.env.SHOPPING_EMAIL_HOUR ?? 18);

function londonNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return {
    day: parts.weekday.toLowerCase(),
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export async function recordShoppingEmailSent() {
  await getDb().insert(emailLog).values({
    kind: KIND,
    sentOn: londonNow().date,
    createdAt: new Date().toISOString(),
  });
}

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const now = londonNow();
    if (!DAYS.includes(now.day) || now.hour < HOUR) return;

    const db = getDb();
    const [already] = await db
      .select({ id: emailLog.id })
      .from(emailLog)
      .where(and(eq(emailLog.kind, KIND), eq(emailLog.sentOn, now.date)))
      .limit(1);
    if (already) return;

    const result = await sendShoppingEmail();
    if (result.sent) {
      await recordShoppingEmailSent();
      console.log(`[shopping-email] sent for ${now.date}`);
    } else {
      // Not logged as sent, so an empty list is retried if items are added later today.
      console.log(`[shopping-email] skipped for ${now.date}: ${result.reason}`);
    }
  } catch (err) {
    console.error("[shopping-email] send failed, will retry next check:", err);
  } finally {
    running = false;
  }
}

export function startShoppingEmailScheduler() {
  console.log(`[shopping-email] scheduled for ${DAYS.join(",")} from ${HOUR}:00 Europe/London`);
  void tick();
  setInterval(tick, CHECK_INTERVAL_MS).unref();
}
