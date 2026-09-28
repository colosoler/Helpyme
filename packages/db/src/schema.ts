/**
 * Esquema de base de datos de Helpyme — fuente de verdad del modelo.
 * El porqué de cada decisión está en entregas-cloud/checkpoint-1/03-modelo-datos.md.
 *
 * Regla de oro: toda tabla de negocio lleva `empresa_id` y toda consulta
 * filtra por él.
 *
 * Las tablas propias de Better Auth (sesiones, cuentas de login, verificación)
 * se generan con su CLI al implementar F1 y se agregan acá en ese PR.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Dinero: numeric exacto, nunca float. Drizzle lo devuelve como string a
// propósito, para que ninguna conversión a number pase desapercibida.
const dinero = (nombre: string) => numeric(nombre, { precision: 14, scale: 2 });

const creadoEn = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Enums ------------------------------------------------------------------

export const rolUsuario = pgEnum("rol_usuario", ["owner", "member"]);
export const tipoCuenta = pgEnum("tipo_cuenta", ["banco", "mercadopago", "efectivo"]);
export const tipoCategoria = pgEnum("tipo_categoria", ["ingreso", "egreso"]);
export const origenMovimiento = pgEnum("origen_movimiento", ["import", "manual", "api"]);
export const tipoContacto = pgEnum("tipo_contacto", ["cliente", "proveedor"]);
export const tipoCuentaCorriente = pgEnum("tipo_cuenta_corriente", ["cobrar", "pagar"]);
export const estadoCuentaCorriente = pgEnum("estado_cuenta_corriente", [
  "pendiente",
  "saldada",
  "anulada",
]);
export const estadoImport = pgEnum("estado_import", ["pendiente", "procesando", "listo", "error"]);
export const rolMensaje = pgEnum("rol_mensaje", ["user", "assistant"]);
export const severidadAlerta = pgEnum("severidad_alerta", ["info", "media", "alta"]);

// --- Identidad y tenant -----------------------------------------------------

export const empresa = pgTable("empresa", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  cuit: text("cuit").unique(),
  createdAt: creadoEn(),
});

export const usuario = pgTable(
  "usuario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    nombre: text("nombre"),
    rol: rolUsuario("rol").notNull().default("member"),
    createdAt: creadoEn(),
  },
  (t) => [uniqueIndex("usuario_email_uq").on(t.email), index("usuario_empresa_idx").on(t.empresaId)],
);

// --- Dinero -----------------------------------------------------------------

export const cuenta = pgTable(
  "cuenta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    tipo: tipoCuenta("tipo").notNull(),
    nombre: text("nombre").notNull(),
    createdAt: creadoEn(),
  },
  (t) => [index("cuenta_empresa_idx").on(t.empresaId)],
);

export const categoria = pgTable(
  "categoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    tipo: tipoCategoria("tipo").notNull(),
    createdAt: creadoEn(),
  },
  (t) => [uniqueIndex("categoria_empresa_nombre_uq").on(t.empresaId, t.nombre)],
);

export const reglaCategoria = pgTable(
  "regla_categoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    patron: text("patron").notNull(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoria.id, { onDelete: "cascade" }),
    createdAt: creadoEn(),
  },
  (t) => [uniqueIndex("regla_empresa_patron_uq").on(t.empresaId, t.patron)],
);

// `imports` en TypeScript porque `import` es palabra reservada; la tabla se
// llama `import`, como en el modelo de datos.
export const imports = pgTable(
  "import",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    nombreArchivo: text("nombre_archivo").notNull(),
    estado: estadoImport("estado").notNull().default("pendiente"),
    filasOk: integer("filas_ok").notNull().default(0),
    filasError: integer("filas_error").notNull().default(0),
    detalleError: text("detalle_error"),
    createdAt: creadoEn(),
  },
  (t) => [index("import_empresa_created_idx").on(t.empresaId, t.createdAt.desc())],
);

export const movimiento = pgTable(
  "movimiento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    cuentaId: uuid("cuenta_id")
      .notNull()
      .references(() => cuenta.id, { onDelete: "cascade" }),
    // Nullable a propósito: «sin categorizar» es un estado válido y visible.
    categoriaId: uuid("categoria_id").references(() => categoria.id, { onDelete: "set null" }),
    importId: uuid("import_id").references(() => imports.id, { onDelete: "set null" }),
    fecha: date("fecha").notNull(),
    // Positivo = ingreso, negativo = egreso.
    monto: dinero("monto").notNull(),
    descripcion: text("descripcion").notNull(),
    hashDedup: text("hash_dedup").notNull(),
    origen: origenMovimiento("origen").notNull(),
    createdAt: creadoEn(),
  },
  (t) => [
    index("movimiento_empresa_fecha_idx").on(t.empresaId, t.fecha.desc()),
    uniqueIndex("movimiento_empresa_hash_uq").on(t.empresaId, t.hashDedup),
    index("movimiento_empresa_categoria_idx").on(t.empresaId, t.categoriaId),
  ],
);

export const documento = pgTable(
  "documento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    movimientoId: uuid("movimiento_id").references(() => movimiento.id, { onDelete: "set null" }),
    // Postgres guarda la referencia; los bytes viven en R2.
    r2Key: text("r2_key").notNull(),
    tipo: text("tipo").notNull(),
    createdAt: creadoEn(),
  },
  (t) => [index("documento_empresa_idx").on(t.empresaId)],
);

// --- Cuentas por cobrar y pagar ---------------------------------------------

export const contacto = pgTable(
  "contacto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    tipo: tipoContacto("tipo").notNull(),
    createdAt: creadoEn(),
  },
  (t) => [index("contacto_empresa_idx").on(t.empresaId)],
);

export const cuentaCorriente = pgTable(
  "cuenta_corriente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    contactoId: uuid("contacto_id")
      .notNull()
      .references(() => contacto.id, { onDelete: "restrict" }),
    tipo: tipoCuentaCorriente("tipo").notNull(),
    monto: dinero("monto").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    estado: estadoCuentaCorriente("estado").notNull().default("pendiente"),
    createdAt: creadoEn(),
  },
  (t) => [index("cuenta_corriente_empresa_venc_idx").on(t.empresaId, t.fechaVencimiento)],
);

// --- Alertas y asesor -------------------------------------------------------

export const alerta = pgTable(
  "alerta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    severidad: severidadAlerta("severidad").notNull(),
    payload: jsonb("payload").notNull(),
    leida: boolean("leida").notNull().default(false),
    createdAt: creadoEn(),
  },
  (t) => [index("alerta_empresa_leida_idx").on(t.empresaId, t.leida, t.createdAt.desc())],
);

export const conversacion = pgTable(
  "conversacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    createdAt: creadoEn(),
  },
  (t) => [index("conversacion_empresa_idx").on(t.empresaId)],
);

export const mensaje = pgTable(
  "mensaje",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversacionId: uuid("conversacion_id")
      .notNull()
      .references(() => conversacion.id, { onDelete: "cascade" }),
    rol: rolMensaje("rol").notNull(),
    contenido: text("contenido").notNull(),
    // Qué funciones invocó el modelo y con qué argumentos: auditoría de cada cifra.
    toolCalls: jsonb("tool_calls"),
    createdAt: creadoEn(),
  },
  (t) => [index("mensaje_conversacion_created_idx").on(t.conversacionId, t.createdAt)],
);
