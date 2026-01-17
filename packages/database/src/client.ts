import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Create a Drizzle client instance for D1
 * @param db - D1Database binding from Cloudflare Workers
 */
export function createDrizzleClient(db: D1Database) {
  return drizzle(db, { schema });
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
