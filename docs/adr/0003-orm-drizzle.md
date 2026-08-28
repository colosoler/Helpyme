# ADR-0003 — Drizzle ORM como capa de acceso a datos

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

Necesitamos acceso a PostgreSQL desde Workers con tres condiciones: que sea
compatible con el driver HTTP de Neon, que permita **escribir SQL agregado
explícito** —los indicadores no son CRUD trivial— y que el bundle resultante sea
chico, porque el Worker tiene límite de tamaño.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Prisma** | Su motor de consultas pesa mucho para un Worker y la compatibilidad con runtimes edge exige configuración adicional. Su DSL además abstrae el SQL, lo que estorba cuando la consulta *es* el producto. |
| **SQL crudo** con el template del driver | Máximo control, cero tipado. Un `rows[0].total` sin tipo, dentro de un cálculo financiero, es exactamente donde se cuela un error silencioso. |
| **Kysely** | Muy buen query builder tipado y la alternativa más cercana. Se eligió Drizzle porque trae migraciones integradas (Drizzle Kit); Kysely las delega a otra herramienta. |

## Decisión

**Drizzle ORM** con `drizzle-orm/neon-http`, más **Drizzle Kit** para las
migraciones versionadas.

## Consecuencias

**A favor**

- **Tipado end-to-end**: el tipo del esquema fluye hasta el frontend a través de
  `packages/shared`. Renombrar una columna rompe la compilación, no la
  producción.
- **SQL explícito y legible.** Las agregaciones se escriben casi como SQL, lo
  cual importa en un dominio donde hay que poder defender cada cálculo frente a
  un tribunal.
- Bundle pequeño, adecuado para el límite de tamaño del Worker.
- Migraciones versionadas y commiteadas, revisables dentro del pull request.

**Lo que aceptamos pagar**

- Menos automatismo que Prisma: no hay carga automática de relaciones anidadas y
  los joins se escriben a mano.
- Ecosistema y documentación más chicos.
- `numeric` se devuelve como `string` para no perder precisión. Es correcto,
  pero obliga a una conversión explícita en cada uso. Esa fricción es
  deliberada: ver
  [03-modelo-datos](../03-modelo-datos.md#31-numeric-nunca-float-para-dinero).
