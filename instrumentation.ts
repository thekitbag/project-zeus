export async function register() {
  // Production only, so `next dev` on a laptop never emails anyone.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { startShoppingEmailScheduler } = await import("./lib/shopping-email-scheduler");
    startShoppingEmailScheduler();
  }
}
