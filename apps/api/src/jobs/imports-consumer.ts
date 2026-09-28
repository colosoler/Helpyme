import { type ImportJob, isImportJob } from "@helpyme/shared";
import type { Bindings } from "../env";
import { createLogger } from "../lib/logger";

/**
 * Consumidor de `helpyme-imports`: parseo, deduplicación y categorización de
 * extractos fuera del request HTTP (ADR-0005).
 *
 * La entrega es «al menos una vez»: el procesamiento tiene que ser idempotente,
 * y lo es por el índice único (empresa_id, hash_dedup).
 */
export async function handleImportBatch(
  batch: MessageBatch<ImportJob>,
  _env: Bindings,
): Promise<void> {
  const logger = createLogger({ queue: batch.queue });

  for (const message of batch.messages) {
    if (!isImportJob(message.body)) {
      // Un mensaje malformado no se arregla reintentando: se descarta y se registra.
      logger.error("import_job_invalido", { messageId: message.id });
      message.ack();
      continue;
    }

    logger.info("import_job_recibido", {
      messageId: message.id,
      importId: message.body.importId,
      empresaId: message.body.empresaId,
      attempts: message.attempts,
    });

    // El pipeline de parseo llega en el Checkpoint 2. Hasta entonces el mensaje
    // se reintenta y, agotados los intentos, termina en la DLQ: ningún import
    // se pierde en silencio.
    message.retry();
  }
}
