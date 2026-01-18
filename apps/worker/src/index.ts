import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import workspaces from "./routes/workspaces";
import invitations from "./routes/invitations";
import users from "./routes/users";
import issues from "./routes/issues";
import projects from "./routes/projects";
import cycles from "./routes/cycles";
import dev from "./routes/dev";

// Durable Objects
export { WorkspaceDO } from "./durable-objects/workspace";
export { IssueDO } from "./durable-objects/issue";

// Bindings type definition
export type Bindings = {
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
};

export type Env = {
  Bindings: Bindings;
};

const app = new Hono<Env>();

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
app.route("/api/v1/workspaces", workspaces);
app.route("/api/v1/invitations", invitations);
app.route("/api/v1/users", users);
app.route("/api/v1/issues", issues);
app.route("/api/v1/projects", projects);
app.route("/api/v1", cycles);

// Development routes (only enabled in development)
app.route("/api/dev", dev);

app.get("/api/v1/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;

// Queue consumer (will be implemented in M6.3)
export async function queue(
  batch: MessageBatch<any>,
  env: Bindings
): Promise<void> {
  for (const message of batch.messages) {
    console.log("Processing message:", message.body);
    // Queue processing logic will be added later
  }
}
