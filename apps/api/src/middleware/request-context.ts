import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { createLogger } from "../lib/logger";

/**
 * Asigna un requestId a cada request, lo devuelve en `X-Request-Id` y emite
 * un log de acceso al terminar. Con ese id se sigue una operación desde el
 * endpoint hasta el consumidor de la cola.
 */
export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger({ requestId, environment: c.env.ENVIRONMENT });
  const inicio = Date.now();

  c.set("requestId", requestId);
  c.set("logger", logger);
  c.header("X-Request-Id", requestId);

  await next();

  logger.info("request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - inicio,
  });
});
