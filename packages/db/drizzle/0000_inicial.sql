CREATE TYPE "public"."estado_cuenta_corriente" AS ENUM('pendiente', 'saldada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_import" AS ENUM('pendiente', 'procesando', 'listo', 'error');--> statement-breakpoint
CREATE TYPE "public"."origen_movimiento" AS ENUM('import', 'manual', 'api');--> statement-breakpoint
CREATE TYPE "public"."rol_mensaje" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."severidad_alerta" AS ENUM('info', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."tipo_categoria" AS ENUM('ingreso', 'egreso');--> statement-breakpoint
CREATE TYPE "public"."tipo_contacto" AS ENUM('cliente', 'proveedor');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta" AS ENUM('banco', 'mercadopago', 'efectivo');--> statement-breakpoint
CREATE TYPE "public"."tipo_cuenta_corriente" AS ENUM('cobrar', 'pagar');--> statement-breakpoint
CREATE TABLE "alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"severidad" "severidad_alerta" NOT NULL,
	"payload" jsonb NOT NULL,
	"leida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_categoria" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_contacto" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuenta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_cuenta" NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuenta_corriente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"contacto_id" uuid NOT NULL,
	"tipo" "tipo_cuenta_corriente" NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"estado" "estado_cuenta_corriente" DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"movimiento_id" uuid,
	"r2_key" text NOT NULL,
	"tipo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"cuit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"estado" "estado_import" DEFAULT 'pendiente' NOT NULL,
	"filas_ok" integer DEFAULT 0 NOT NULL,
	"filas_error" integer DEFAULT 0 NOT NULL,
	"detalle_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"rol" "rol_mensaje" NOT NULL,
	"contenido" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"categoria_id" uuid,
	"import_id" uuid,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"descripcion" text NOT NULL,
	"hash_dedup" text NOT NULL,
	"origen" "origen_movimiento" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regla_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"patron" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"email" text NOT NULL,
	"nombre" text,
	"rol" "rol_usuario" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta" ADD CONSTRAINT "cuenta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_corriente" ADD CONSTRAINT "cuenta_corriente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_corriente" ADD CONSTRAINT "cuenta_corriente_contacto_id_contacto_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contacto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_movimiento_id_movimiento_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimiento"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_cuenta_id_cuenta_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuenta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_import_id_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."import"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_categoria" ADD CONSTRAINT "regla_categoria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_categoria" ADD CONSTRAINT "regla_categoria_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerta_empresa_leida_idx" ON "alerta" USING btree ("empresa_id","leida","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "categoria_empresa_nombre_uq" ON "categoria" USING btree ("empresa_id","nombre");--> statement-breakpoint
CREATE INDEX "contacto_empresa_idx" ON "contacto" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "conversacion_empresa_idx" ON "conversacion" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cuenta_empresa_idx" ON "cuenta" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cuenta_corriente_empresa_venc_idx" ON "cuenta_corriente" USING btree ("empresa_id","fecha_vencimiento");--> statement-breakpoint
CREATE INDEX "documento_empresa_idx" ON "documento" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "import_empresa_created_idx" ON "import" USING btree ("empresa_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mensaje_conversacion_created_idx" ON "mensaje" USING btree ("conversacion_id","created_at");--> statement-breakpoint
CREATE INDEX "movimiento_empresa_fecha_idx" ON "movimiento" USING btree ("empresa_id","fecha" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_empresa_hash_uq" ON "movimiento" USING btree ("empresa_id","hash_dedup");--> statement-breakpoint
CREATE INDEX "movimiento_empresa_categoria_idx" ON "movimiento" USING btree ("empresa_id","categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "regla_empresa_patron_uq" ON "regla_categoria" USING btree ("empresa_id","patron");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_email_uq" ON "usuario" USING btree ("email");--> statement-breakpoint
CREATE INDEX "usuario_empresa_idx" ON "usuario" USING btree ("empresa_id");