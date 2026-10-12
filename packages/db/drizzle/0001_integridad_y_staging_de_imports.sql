ALTER TYPE "public"."estado_import" ADD VALUE 'confirmado' BEFORE 'error';--> statement-breakpoint
CREATE TABLE "import_fila" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"numero_fila" integer NOT NULL,
	"fecha" date,
	"monto" numeric(14, 2),
	"descripcion" text,
	"hash_dedup" text,
	"categoria_id" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_fila_valida_o_error" CHECK ("import_fila"."error" is not null or ("import_fila"."fecha" is not null and "import_fila"."monto" is not null and "import_fila"."descripcion" is not null and "import_fila"."hash_dedup" is not null))
);
--> statement-breakpoint
ALTER TABLE "alerta" DROP CONSTRAINT "alerta_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "categoria" DROP CONSTRAINT "categoria_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "contacto" DROP CONSTRAINT "contacto_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "conversacion" DROP CONSTRAINT "conversacion_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "conversacion" DROP CONSTRAINT "conversacion_usuario_id_usuario_id_fk";
--> statement-breakpoint
ALTER TABLE "cuenta" DROP CONSTRAINT "cuenta_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "cuenta_corriente" DROP CONSTRAINT "cuenta_corriente_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "documento" DROP CONSTRAINT "documento_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "import" DROP CONSTRAINT "import_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "movimiento" DROP CONSTRAINT "movimiento_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "movimiento" DROP CONSTRAINT "movimiento_cuenta_id_cuenta_id_fk";
--> statement-breakpoint
ALTER TABLE "regla_categoria" DROP CONSTRAINT "regla_categoria_empresa_id_empresa_id_fk";
--> statement-breakpoint
ALTER TABLE "usuario" DROP CONSTRAINT "usuario_empresa_id_empresa_id_fk";
--> statement-breakpoint
DROP INDEX "usuario_empresa_idx";--> statement-breakpoint
ALTER TABLE "alerta" ADD COLUMN "clave_dedup" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cuenta" ADD COLUMN "saldo_inicial" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "cuenta" ADD COLUMN "fecha_saldo_inicial" date;--> statement-breakpoint
ALTER TABLE "empresa" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import" ADD COLUMN "cuenta_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "mensaje" ADD COLUMN "empresa_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "movimiento" ADD COLUMN "contacto_id" uuid;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_fila" ADD CONSTRAINT "import_fila_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_fila" ADD CONSTRAINT "import_fila_import_id_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."import"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_fila" ADD CONSTRAINT "import_fila_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_fila_import_numero_uq" ON "import_fila" USING btree ("import_id","numero_fila");--> statement-breakpoint
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta" ADD CONSTRAINT "cuenta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_corriente" ADD CONSTRAINT "cuenta_corriente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_cuenta_id_cuenta_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_contacto_id_contacto_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contacto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_cuenta_id_cuenta_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuenta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regla_categoria" ADD CONSTRAINT "regla_categoria_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alerta_empresa_clave_uq" ON "alerta" USING btree ("empresa_id","clave_dedup");--> statement-breakpoint
ALTER TABLE "usuario" DROP COLUMN "empresa_id";--> statement-breakpoint
ALTER TABLE "usuario" DROP COLUMN "rol";--> statement-breakpoint
ALTER TABLE "cuenta" ADD CONSTRAINT "cuenta_saldo_inicial_completo" CHECK (("cuenta"."saldo_inicial" is null) = ("cuenta"."fecha_saldo_inicial" is null));--> statement-breakpoint
DROP TYPE "public"."rol_usuario";