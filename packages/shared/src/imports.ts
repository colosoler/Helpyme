/** Máquina de estados de un import de extracto (ADR-0005). */
export const ESTADOS_IMPORT = ["pendiente", "procesando", "listo", "error"] as const;

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
