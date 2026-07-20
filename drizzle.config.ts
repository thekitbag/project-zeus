import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // Must match the runtime path in db/index.ts (DATABASE_PATH) so drizzle-kit
    // operates on the same database the app actually uses — not a second file.
    url: process.env.DATABASE_PATH || "./data/project-zeus.db",
  },
} satisfies Config;
