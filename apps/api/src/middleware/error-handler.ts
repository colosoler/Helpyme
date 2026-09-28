import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../env";

/**
 * Manejador de errores centralizado. El detalle queda en el log, asociado al
 * requestId; al cliente nunca le llega el stack ni el mensaje interno.
 */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get("requestId");

  if (err instanceof HTTPException) {
    return c.json({ error: err.message || "http_error", requestId }, err.status);
  }

  c.get("logger")?.error("unhandled_error", {
    error: err.name,
    message: err.message,
    stack: err.stack,
  });
  return c.json({ error: "internal_error", requestId }, 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
