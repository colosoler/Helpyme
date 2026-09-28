import { defineConfig } from "drizzle-kit";

// DATABASE_URL sale del entorno o del .env de la raíz. `generate` no la
// necesita; `migrate` y `studio`, sí.
try {
  process.loadEnvFile("../../.env");
} catch {
  // Sin .env: se usa el entorno (CI, o variable exportada a mano).
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
