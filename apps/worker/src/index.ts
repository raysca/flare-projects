import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";

// Durable Objects
export { WorkspaceDO } from "./durable-objects/workspace";
export { IssueDO } from "./durable-objects/issue";

// Bindings type definition
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  WORKSPACE_DO: DurableObjectNamespace;
  ISSUE_DO: DurableObjectNamespace;
  QUEUE: Queue;
  VECTORIZE: VectorizeIndex;
  AI: any; // Workers AI binding
  ANALYTICS: AnalyticsEngineDataset;
  ENVIRONMENT: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "LinearFlow API",
    version: "0.1.0",
    status: "healthy",
  });
});

// API routes
app.route("/api/v1/auth", auth);

app.get("/api/v1/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;

// Queue consumer (will be implemented in M6.3)
export async function queue(
  batch: MessageBatch<any>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    console.log("Processing message:", message.body);
    // Queue processing logic will be added later
  }
}
