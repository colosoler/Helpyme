/**
 * Máquina de estados de un import de extracto (ADR-0005 y ADR-0014):
 * `pendiente → procesando → listo → confirmado`, o `error`.
 * En `listo` las filas esperan la revisión del usuario; los movimientos
 * existen recién en `confirmado`.
 */
export const ESTADOS_IMPORT = ["pendiente", "procesando", "listo", "confirmado", "error"] as const;

export type EstadoImport = (typeof ESTADOS_IMPORT)[number];

/** Mensaje que el endpoint de carga encola y el consumidor procesa. */
export interface ImportJob {
  importId: string;
  empresaId: string;
  r2Key: string;
}

export function isImportJob(value: unknown): value is ImportJob {
  if (typeof value !== "object" || value === null) return false;
  const job = value as Record<string, unknown>;
  return (
    typeof job.importId === "string" &&
    typeof job.empresaId === "string" &&
    typeof job.r2Key === "string"
  );
}
