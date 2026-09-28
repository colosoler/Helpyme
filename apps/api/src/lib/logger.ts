/**
 * Logs estructurados: una línea JSON por evento, nunca texto libre.
 * Se loguean identificadores y metadatos; jamás montos, descripciones de
 * movimientos, tokens ni contraseñas (07-observabilidad §2.1).
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export function createLogger(base: LogFields = {}): Logger {
  const write = (level: LogLevel, msg: string, fields?: LogFields) => {
    const line = JSON.stringify({
      level,
      msg,
      ...base,
      ...fields,
      timestamp: new Date().toISOString(),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    debug: (msg, fields) => write("debug", msg, fields),
    info: (msg, fields) => write("info", msg, fields),
    warn: (msg, fields) => write("warn", msg, fields),
    error: (msg, fields) => write("error", msg, fields),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
}
