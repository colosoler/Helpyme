import type { ImportJob } from "@helpyme/shared";
import { createApp } from "./app";
import type { Bindings } from "./env";
import { handleAlertsCron } from "./jobs/alerts-cron";
import { handleImportBatch } from "./jobs/imports-consumer";

const app = createApp();

/** Un mismo Worker atiende los tres puntos de entrada: HTTP, cola y cron. */
export default {
  fetch: app.fetch,
  queue: handleImportBatch,
  scheduled: handleAlertsCron,
} satisfies ExportedHandler<Bindings, ImportJob>;
