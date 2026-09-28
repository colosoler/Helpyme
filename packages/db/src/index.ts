import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Cliente de base para Workers: driver serverless de Neon sobre HTTP.
 * El driver `pg` abre sockets TCP y no funciona en este runtime (ADR-0002).
 */
export function createDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl), schema });
}

export type Db = ReturnType<typeof createDb>;

export { schema };
