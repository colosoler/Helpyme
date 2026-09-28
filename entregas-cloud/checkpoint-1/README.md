# Checkpoint 1 — Definición de Arquitectura

> **Hito:** Checkpoint 1 del TPI · **Fecha de entrega:** 28/09/2026
> **Proyecto:** Helpyme — Asesor Financiero Inteligente para PyMEs
> **Línea base:** [One-Pager (Clase 1)](../../docs/00-one-pager.md)

La consigna pide para este hito: *«Diagrama Cloud detallado, setup de
infraestructura y repositorio inicial con actividad»*. Esta carpeta reúne todo
lo que se entrega para cumplirlo.

---

## 1. Qué pide la consigna y dónde está

| Requisito del Checkpoint 1 | Documento |
|---|---|
| **Diagrama Cloud detallado** | [01-arquitectura.md §1.1](./01-arquitectura.md#11-diagrama-cloud-detallado) — diagrama principal con todos los servicios y el flujo de ingesta |
| Diagramas complementarios (contexto C4, entornos, ingesta asíncrona, cron, aislamiento multi-tenant) | [02-diagramas.md](./02-diagramas.md) |
| **Setup de infraestructura** | [04-infraestructura.md](./04-infraestructura.md) — requisitos, recursos de Cloudflare, Neon, secretos, entornos, despliegue y rollback |
| **Repositorio inicial con actividad** | Historial de commits del repositorio, con *Conventional Commits* (ver §3) |

## 2. Justificación del stack

La consigna exige que cada componente esté *«técnicamente fundamentado en los
requisitos de escalabilidad, costos y arquitectura»*. Cada servicio tiene su ADR
con contexto, alternativas descartadas y consecuencias aceptadas:

| Componente | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js en Vercel | [ADR-0006](./adr/0006-frontend-vercel.md) |
| Backend / API | Cloudflare Workers + Hono | [ADR-0001](./adr/0001-backend-cloudflare-workers.md) |
| Persistencia | PostgreSQL en Neon | [ADR-0002](./adr/0002-persistencia-neon-postgres.md) |
| Acceso a datos | Drizzle ORM | [ADR-0003](./adr/0003-orm-drizzle.md) |
| Storage | Cloudflare R2 | [ADR-0004](./adr/0004-storage-r2.md) |
| Procesamiento asíncrono | Cloudflare Queues | [ADR-0005](./adr/0005-procesamiento-asincronico.md) |
| IA | Anthropic Claude con *function calling* | [ADR-0007](./adr/0007-modelo-llm.md) |
| Autenticación | Better Auth | [ADR-0008](./adr/0008-autenticacion-better-auth.md) |
| Alcance | Sin agregación bancaria en v1 | [ADR-0009](./adr/0009-sin-agregacion-bancaria.md) |

Índice completo: [adr/README.md](./adr/README.md).

## 3. Estándares de ingeniería de la consigna (§6 y §7)

| Estándar | Dónde se cubre |
|---|---|
| Modelo de datos multi-tenant | [03-modelo-datos.md](./03-modelo-datos.md) |
| Costos y escalabilidad | [05-costos-finops.md](./05-costos-finops.md) |
| Seguridad y aislamiento entre empresas | [06-seguridad.md](./06-seguridad.md) |
| Observabilidad (métricas, logs centralizados, monitoreo) | [07-observabilidad.md](./07-observabilidad.md) |
| Conventional Commits | Historial de Git: `git log --oneline` |
| CI/CD con GitHub Actions | Pendiente (ver §5) |
| `AI-DECISIONS.md` en la raíz | Pendiente (ver §5) |

## 4. Orden de lectura sugerido

1. [01-arquitectura.md](./01-arquitectura.md) — vista general, diagrama cloud,
   capas, restricciones del runtime, alcance y riesgos.
2. [02-diagramas.md](./02-diagramas.md) — flujos y entornos.
3. [adr/](./adr/) — por qué cada servicio.
4. [04-infraestructura.md](./04-infraestructura.md) — cómo se levanta.
5. [03](./03-modelo-datos.md), [05](./05-costos-finops.md),
   [06](./06-seguridad.md) y [07](./07-observabilidad.md) — detalle por área.

## 5. Estado del hito

| Ítem | Estado |
|---|---|
| Diagrama cloud y diagramas complementarios | Listo |
| Justificación de cada servicio (ADR) | Listo |
| Procedimiento de setup de infraestructura | Listo |
| Tooling raíz del monorepo y plantilla de variables de entorno | Listo |
| Historial de commits convencionales | Listo |
| Workspaces `apps/` y `packages/`, `wrangler.toml` y esquema Drizzle | Pendiente |
| Workflows de GitHub Actions | Pendiente |
| `AI-DECISIONS.md` | Pendiente |
| Tablero Kanban en GitHub Projects con límites de WIP | Pendiente |
| Provisión de cuentas cloud y primer deploy | Pendiente |

El detalle de la infraestructura está en
[04-infraestructura.md §7](./04-infraestructura.md#7-estado-del-checkpoint-1).
