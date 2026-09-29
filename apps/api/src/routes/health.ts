import { Hono } from "hono";
import type { AppEnv, Bindings } from "../env";

export type DatabasePing = (env: Bindings) => Promise<void>;

/**
 * `/health` (liveness) no toca dependencias: responde si el Worker está vivo.
 * `/ready` (readiness) hace un `SELECT 1` real y devuelve 503 si la base no
 * responde. Separarlos evita que un ping de monitoreo consulte la base, y que
 * un 200 oculte una base caída (07-observabilidad §1).
 */
export function healthRoutes(pingDatabase: DatabasePing) {
  const app = new Hono<AppEnv>();

  app.get("/health", (c) => c.json({ status: "ok", environment: c.env.ENVIRONMENT }));

  app.get("/ready", async (c) => {
    const inicio = Date.now();
    try {
      await pingDatabase(c.env);
      return c.json({
        status: "ready",
        checks: { database: { status: "ok", latencyMs: Date.now() - inicio } },
      });
    } catch (err) {
      c.get("logger").error("readiness_database_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return c.json(
        {
          status: "not_ready",
          checks: { database: { status: "error", latencyMs: Date.now() - inicio } },
        },
        503,
      );
    }
  });

  return app;
}
