import type { ImportJob } from "@helpyme/shared";
import type { Logger } from "./lib/logger";

/** Bindings declarados en wrangler.toml más los secretos del Worker. */
export interface Bindings {
  ENVIRONMENT: "development" | "preview" | "production";
  CORS_ALLOWED_ORIGINS: string;
  DOCUMENTOS: R2Bucket;
  IMPORTS_QUEUE: Queue<ImportJob>;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET?: string;
  GEMINI_API_KEY?: string;
  MERCADOPAGO_CLIENT_SECRET?: string;
}

/** Valores que el middleware deja en el contexto de cada request. */
export interface Variables {
  requestId: string;
  logger: Logger;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}
