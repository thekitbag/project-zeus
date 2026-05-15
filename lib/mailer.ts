import nodemailer from "nodemailer";
import { getDb } from "@/db";
import { shoppingLists, shoppingItems } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";

type ListWithItems = { name: string; items: string[] };

function buildHtml(lists: ListWithItems[], dateStr: string): string {
  const listSections = lists
    .map(
      (list) => `
    <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#a8a29e;margin:28px 0 8px 0;">${list.name}</h2>
    <ul style="margin:0;padding-left:20px;color:#292524;">
      ${list.items.map((text) => `<li style="padding:3px 0;font-size:15px;">${text}</li>`).join("")}
    </ul>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#292524;background:#ffffff;">
  <p style="font-size:15px;color:#78716c;margin:0 0 4px 0;">Shopping reminder</p>
  <p style="font-size:22px;font-weight:bold;margin:0 0 24px 0;">${dateStr}</p>
  ${listSections}
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:36px 0 20px;" />
  <p style="font-size:11px;color:#a8a29e;margin:0;">Project Zeus &middot; Household operations. Broadly under control.</p>
</body>
</html>`;
}

export async function sendShoppingEmail(): Promise<{ sent: boolean; reason?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.SHANNON_EMAIL;

  if (!gmailUser || !gmailPass || !recipient) {
    return { sent: false, reason: "missing email env vars" };
  }

  const db = getDb();
  const lists = await db.select().from(shoppingLists).orderBy(asc(shoppingLists.id));

  const listsWithItems: ListWithItems[] = (
    await Promise.all(
      lists.map(async (list) => {
        const rows = await db
          .select({ text: shoppingItems.text })
          .from(shoppingItems)
          .where(and(eq(shoppingItems.listId, list.id), eq(shoppingItems.completed, false)))
          .orderBy(asc(shoppingItems.createdAt));
        return { name: list.name, items: rows.map((r) => r.text) };
      })
    )
  ).filter((l) => l.items.length > 0);

  if (listsWithItems.length === 0) {
    return { sent: false, reason: "all lists empty" };
  }

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"Project Zeus" <${gmailUser}>`,
    to: recipient,
    subject: `Shopping — ${dateStr}`,
    html: buildHtml(listsWithItems, dateStr),
  });

  return { sent: true };
}
