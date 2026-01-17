import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "../../apps/worker/wrangler.toml",
    dbName: "linearflow-db",
  },
} satisfies Config;
