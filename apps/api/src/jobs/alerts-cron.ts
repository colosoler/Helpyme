import type { Bindings } from "../env";
import { createLogger } from "../lib/logger";

/**
 * Cron diario (06:00 ART): evalúa las reglas de alerta por empresa con SQL.
 * El LLM solo redacta el texto de una alerta ya disparada; nunca decide si
 * alertar (02-diagramas §4).
 */
export async function handleAlertsCron(
  controller: ScheduledController,
  env: Bindings,
): Promise<void> {
  const logger = createLogger({ job: "alerts-cron", environment: env.ENVIRONMENT });
  logger.info("cron_inicio", {
    cron: controller.cron,
    scheduledTime: new Date(controller.scheduledTime).toISOString(),
  });

  // Reglas de alerta (desvío de gasto, vencimientos, saldo proyectado negativo):
  // Checkpoint 2.

  logger.info("cron_fin", { cron: controller.cron });
}
