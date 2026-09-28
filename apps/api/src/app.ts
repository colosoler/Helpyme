import { createDb } from "@helpyme/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestContext } from "./middleware/request-context";
import { type DatabasePing, healthRoutes } from "./routes/health";

export interface AppDeps {
  pingDatabase: DatabasePing;
}

const defaultDeps: AppDeps = {
  pingDatabase: async (env) => {
    await createDb(env.DATABASE_URL).execute(sql`select 1`);
  },
};

/** Las dependencias externas se inyectan para poder testear sin red. */
export function createApp(deps: AppDeps = defaultDeps) {
  const app = new Hono<AppEnv>();

  app.use("*", requestContext);
  app.use("*", corsMiddleware);

  app.route("/", healthRoutes(deps.pingDatabase));
  // Rutas de negocio (/v1) con middleware de autenticación: Checkpoint 2.

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  return app;
}
