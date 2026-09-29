import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";

/**
 * CORS con lista blanca explícita, nunca `*`: el frontend vive en otro dominio
 * y la sesión viaja en cookies (06-seguridad §2).
 *
 * Un `*` dentro de un origen de la lista (ej. las previews de Vercel) acepta
 * solo letras minúsculas, dígitos y guiones: no puede atravesar un punto ni
 * colar otro dominio.
 */
export function isOriginAllowed(origin: string, allowList: string): boolean {
  return allowList
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .some((allowed) => {
      if (!allowed.includes("*")) return allowed === origin;
      const pattern = allowed
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[a-z0-9-]+");
      return new RegExp(`^${pattern}$`).test(origin);
    });
}

export const corsMiddleware = createMiddleware<AppEnv>((c, next) =>
  cors({
    origin: (origin) => (isOriginAllowed(origin, c.env.CORS_ALLOWED_ORIGINS) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 600,
  })(c, next),
);
