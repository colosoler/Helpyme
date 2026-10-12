import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../src/schema";

/**
 * Aplica todas las migraciones, en orden, sobre un PostgreSQL embebido y
 * verifica las garantías que el modelo de datos promete. Lo que se prueba es
 * que cada restricción exista en la base y no solo en `schema.ts`.
 *
 * No reemplaza a las pruebas de integración contra Neon: PGlite es PostgreSQL,
 * pero no es el motor ni el driver de producción.
 */
const db = drizzle({ client: new PGlite(), schema });

function uno<T>(filas: T[]): T {
  const [fila] = filas;
  if (!fila) throw new Error("la consulta no devolvió filas");
  return fila;
}

function mensajeCompleto(error: unknown): string {
  const partes: string[] = [];
  let actual = error;
  while (actual instanceof Error) {
    partes.push(actual.message);
    actual = actual.cause;
  }
  return partes.join(" | ");
}

/** La base rechaza la operación, y lo hace por la restricción indicada. */
async function esperarViolacion(operacion: PromiseLike<unknown>, restriccion: string) {
  const error = await Promise.resolve(operacion).then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, "la base tendría que haber rechazado la operación").not.toBeNull();
  expect(mensajeCompleto(error)).toContain(restriccion);
}

async function crearEmpresa(nombre: string) {
  const empresa = uno(await db.insert(schema.empresa).values({ nombre }).returning());
  const cuenta = uno(
    await db
      .insert(schema.cuenta)
      .values({ empresaId: empresa.id, tipo: "banco", nombre: "Cuenta corriente" })
      .returning(),
  );
  return { empresa, cuenta };
}

async function crearImport(empresaId: string, cuentaId: string) {
  return uno(
    await db
      .insert(schema.imports)
      .values({ empresaId, cuentaId, r2Key: `${empresaId}/extracto.csv`, nombreArchivo: "extracto.csv" })
      .returning(),
  );
}

const movimientosDe = (empresaId: string) =>
  db.select().from(schema.movimiento).where(eq(schema.movimiento.empresaId, empresaId));

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
});

describe("aislamiento multi-tenant", () => {
  it("toda tabla lleva empresa_id, salvo las de identidad", async () => {
    const { rows } = await db.execute<{ table_name: string }>(sql`
      select t.table_name
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and not exists (
          select 1 from information_schema.columns c
          where c.table_schema = t.table_schema
            and c.table_name = t.table_name
            and c.column_name = 'empresa_id'
        )
      order by t.table_name
    `);

    // Sumar una tabla a esta lista es declarar que no guarda datos de una empresa.
    expect(rows.map((r) => r.table_name)).toEqual(["empresa", "usuario"]);
  });
});

describe("identidad", () => {
  it("usuario no guarda empresa ni rol: viven en la membresía", async () => {
    const { rows } = await db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'usuario'`,
    );
    expect(rows.map((r) => r.column_name).sort()).toEqual([
      "created_at",
      "deleted_at",
      "email",
      "id",
      "nombre",
    ]);
  });
});

describe("historial financiero", () => {
  it("borrar una empresa con datos falla en lugar de arrastrarlos", async () => {
    const { empresa } = await crearEmpresa("Con historial");

    await esperarViolacion(
      db.delete(schema.empresa).where(eq(schema.empresa.id, empresa.id)),
      "cuenta_empresa_id_empresa_id_fk",
    );
  });

  it("borrar una cuenta con movimientos falla", async () => {
    const { empresa, cuenta } = await crearEmpresa("Cuenta con movimientos");
    await db.insert(schema.movimiento).values({
      empresaId: empresa.id,
      cuentaId: cuenta.id,
      fecha: "2026-10-01",
      monto: "-1500.00",
      descripcion: "Alquiler",
      hashDedup: "h1",
      origen: "manual",
    });

    await esperarViolacion(
      db.delete(schema.cuenta).where(eq(schema.cuenta.id, cuenta.id)),
      "movimiento_cuenta_id_cuenta_id_fk",
    );
  });

  it("borrar una categoría deja el movimiento sin categorizar y se lleva sus reglas", async () => {
    const { empresa, cuenta } = await crearEmpresa("Categoría borrada");
    const categoria = uno(
      await db
        .insert(schema.categoria)
        .values({ empresaId: empresa.id, nombre: "Servicios", tipo: "egreso" })
        .returning(),
    );
    await db
      .insert(schema.reglaCategoria)
      .values({ empresaId: empresa.id, patron: "edenor", categoriaId: categoria.id });
    await db.insert(schema.movimiento).values({
      empresaId: empresa.id,
      cuentaId: cuenta.id,
      categoriaId: categoria.id,
      fecha: "2026-10-02",
      monto: "-800.00",
      descripcion: "EDENOR",
      hashDedup: "h1",
      origen: "manual",
    });

    await db.delete(schema.categoria).where(eq(schema.categoria.id, categoria.id));

    expect(uno(await movimientosDe(empresa.id)).categoriaId).toBeNull();
    const reglas = await db
      .select()
      .from(schema.reglaCategoria)
      .where(eq(schema.reglaCategoria.empresaId, empresa.id));
    expect(reglas).toHaveLength(0);
  });
});

describe("cuenta", () => {
  it("el saldo inicial se declara con su fecha o no se declara", async () => {
    const { empresa } = await crearEmpresa("Saldos");
    const base = { empresaId: empresa.id, tipo: "efectivo", nombre: "Caja" } as const;

    await esperarViolacion(
      db.insert(schema.cuenta).values({ ...base, saldoInicial: "1000.00" }),
      "cuenta_saldo_inicial_completo",
    );
    await esperarViolacion(
      db.insert(schema.cuenta).values({ ...base, fechaSaldoInicial: "2026-09-30" }),
      "cuenta_saldo_inicial_completo",
    );
    await db
      .insert(schema.cuenta)
      .values({ ...base, saldoInicial: "1000.00", fechaSaldoInicial: "2026-09-30" });
  });
});

describe("import", () => {
  it("una fila es válida o trae su error", async () => {
    const { empresa, cuenta } = await crearEmpresa("Filas");
    const imp = await crearImport(empresa.id, cuenta.id);
    const base = { empresaId: empresa.id, importId: imp.id };

    await esperarViolacion(
      db.insert(schema.importFila).values({ ...base, numeroFila: 1, fecha: "2026-10-01" }),
      "import_fila_valida_o_error",
    );
    await db.insert(schema.importFila).values([
      { ...base, numeroFila: 2, error: "fecha ilegible" },
      {
        ...base,
        numeroFila: 3,
        fecha: "2026-10-01",
        monto: "250.00",
        descripcion: "Cobro",
        hashDedup: "h3",
      },
    ]);
  });

  it("reentregar la misma fila no la duplica", async () => {
    const { empresa, cuenta } = await crearEmpresa("Reentrega");
    const imp = await crearImport(empresa.id, cuenta.id);
    const fila = { empresaId: empresa.id, importId: imp.id, numeroFila: 1, error: "monto vacío" };

    await db.insert(schema.importFila).values(fila).onConflictDoNothing();
    await db.insert(schema.importFila).values(fila).onConflictDoNothing();

    const filas = await db
      .select()
      .from(schema.importFila)
      .where(eq(schema.importFila.importId, imp.id));
    expect(filas).toHaveLength(1);
  });

  it("las filas no son movimientos hasta confirmar, y confirmar dos veces no duplica", async () => {
    const { empresa, cuenta } = await crearEmpresa("Confirmación");
    const imp = await crearImport(empresa.id, cuenta.id);
    const base = { empresaId: empresa.id, importId: imp.id };
    await db.insert(schema.importFila).values([
      { ...base, numeroFila: 1, fecha: "2026-10-01", monto: "250.00", descripcion: "Cobro", hashDedup: "a" },
      { ...base, numeroFila: 2, fecha: "2026-10-03", monto: "-90.50", descripcion: "Pago", hashDedup: "b" },
      { ...base, numeroFila: 3, error: "fecha ilegible" },
    ]);

    expect(await movimientosDe(empresa.id)).toHaveLength(0);

    // Un solo statement: el driver HTTP de Neon no tiene transacciones interactivas.
    const confirmar = () =>
      db.execute(sql`
        insert into movimiento
          (empresa_id, cuenta_id, categoria_id, import_id, fecha, monto, descripcion, hash_dedup, origen)
        select f.empresa_id, i.cuenta_id, f.categoria_id, f.import_id, f.fecha, f.monto, f.descripcion, f.hash_dedup, 'import'
        from import_fila f
        join import i on i.id = f.import_id
        where f.import_id = ${imp.id} and f.empresa_id = ${empresa.id} and f.error is null
        on conflict (empresa_id, hash_dedup) do nothing
      `);
    await confirmar();
    await confirmar();
    await db.update(schema.imports).set({ estado: "confirmado" }).where(eq(schema.imports.id, imp.id));

    const movimientos = await movimientosDe(empresa.id);
    expect(movimientos.map((m) => m.monto).sort()).toEqual(["-90.50", "250.00"]);
    expect(movimientos.every((m) => m.cuentaId === cuenta.id && m.origen === "import")).toBe(true);
  });
});

describe("deduplicación", () => {
  it("el mismo hash no se repite en una empresa, pero sí entre empresas", async () => {
    const a = await crearEmpresa("Empresa A");
    const b = await crearEmpresa("Empresa B");
    const movimiento = (empresaId: string, cuentaId: string) => ({
      empresaId,
      cuentaId,
      fecha: "2026-10-05",
      monto: "100.00",
      descripcion: "Transferencia",
      hashDedup: "mismo-hash",
      origen: "manual" as const,
    });

    await db.insert(schema.movimiento).values(movimiento(a.empresa.id, a.cuenta.id));
    await db.insert(schema.movimiento).values(movimiento(b.empresa.id, b.cuenta.id));
    await esperarViolacion(
      db.insert(schema.movimiento).values(movimiento(a.empresa.id, a.cuenta.id)),
      "movimiento_empresa_hash_uq",
    );
  });

  it("correr dos veces la misma regla no duplica la alerta", async () => {
    const { empresa } = await crearEmpresa("Alertas");
    const alerta = {
      empresaId: empresa.id,
      tipo: "desvio_gasto",
      severidad: "media",
      payload: { periodo: "2026-10" },
      claveDedup: "desvio_gasto:2026-10",
    } as const;

    await db.insert(schema.alerta).values(alerta).onConflictDoNothing();
    await db.insert(schema.alerta).values(alerta).onConflictDoNothing();

    const alertas = await db
      .select()
      .from(schema.alerta)
      .where(eq(schema.alerta.empresaId, empresa.id));
    expect(alertas).toHaveLength(1);
  });
});
