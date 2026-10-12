# Checkpoint 2 — Demo Funcional (pre-entrega)

> **Hito:** Checkpoint 2 del TPI · **Fecha de entrega:** 09/11/2026
> **Proyecto:** Helpyme — Asesor Financiero Inteligente para PyMEs
> **Línea base:** [Checkpoint 1 — Definición de Arquitectura](../checkpoint-1/README.md)
> **Estado:** en curso

La consigna pide para este hito: *«Sistema con infraestructura desplegada,
backend operativo y pruebas de integración»*. Esta carpeta reúne el plan de
trabajo y, a medida que se cumpla, la evidencia de cada requisito.

**Para empezar:** [01-plan.md](./01-plan.md) — alcance, frentes, cronograma y
tareas.

---

## 1. Qué pide la consigna y cómo se cumple

| Requisito del Checkpoint 2 | Cómo se cumple | Tareas | Evidencia |
|---|---|---|---|
| **Infraestructura desplegada** | Worker de producción con R2, Queues y cron; PostgreSQL en Neon; frontend en Vercel; deploy automático por GitHub Actions | [#3], [#4], [#5], [#7] | Pendiente |
| **Backend operativo** | Camino de demo en producción: registro, import de CSV, categorización, dashboard y asesor | [#14], [#15], [#19], [#21], [#22], [#26], [#27], [#28] | Pendiente |
| **Pruebas de integración** | Suite en el runtime de Workers contra una branch efímera de Neon, corrida por el CI; incluye el aislamiento entre empresas | [#8], [#16], [#21], [#25] | Pendiente |

El detalle de qué funcionalidades entran y cuáles pasan a la Defensa Final está
en [01-plan.md §2](./01-plan.md#2-alcance).

## 2. Estándares de ingeniería de la consigna (§6 y §7)

| Estándar | Qué se agrega en este hito | Tareas |
|---|---|---|
| Conventional Commits y autoría individual | Un frente por integrante, con commits propios desde la semana 1 | [01-plan.md §4](./01-plan.md#4-frentes-de-trabajo) |
| Pull Requests cruzados | Ruleset de `main` activo; cada PR lo revisa alguien de otro frente | [#2] |
| Kanban con límites de WIP | Tablero en GitHub Projects con los issues del hito | [#2] |
| Observabilidad | `empresaId` y métricas de negocio en los logs; dashboards y alertas operativas probadas con un simulacro | [#10], [#11] |
| CI/CD | Lint, auditoría de dependencias, deploy de preview por PR, deploy de producción con smoke test | [#4], [#6], [#7] |
| Seguridad | Tests de aislamiento multi-tenant, rate limiting del chat | [#9], [#16] |
| `AI-DECISIONS.md` | Una entrada por cada PR con código o diseño asistido, con validación humana | [`AI-DECISIONS.md`](../../AI-DECISIONS.md) |

## 3. Decisiones de arquitectura de este hito

Al planificar aparecieron diferencias entre la documentación del Checkpoint 1,
el esquema y lo que el equipo ya había decidido. Cada una se cerró con un ADR
que **precisa** al original, y con la corrección de los documentos afectados.
Lo entregado el 28/09 se conserva en el tag
[`v0.1`](https://github.com/colosoler/Helpyme/tree/v0.1).

| ADR | Qué decide | Qué corrigió |
|---|---|---|
| [0011](../checkpoint-1/adr/0011-sesion-first-party-por-proxy.md) | El navegador habla solo con el frontend, que reenvía `/api/*` al Worker: la cookie de sesión no viaja entre `vercel.app` y `workers.dev` | [01-arquitectura §1.1](../checkpoint-1/01-arquitectura.md), [04-infraestructura §5](../checkpoint-1/04-infraestructura.md), [06-seguridad §2](../checkpoint-1/06-seguridad.md) |
| [0012](../checkpoint-1/adr/0012-empresa-es-la-organizacion.md) | `empresa` y `usuario` son las tablas de Better Auth; el rol y la pertenencia viven en la membresía | [06-seguridad §2](../checkpoint-1/06-seguridad.md) |
| [0013](../checkpoint-1/adr/0013-preview-compartido.md) | Un preview compartido, y una branch efímera de Neon por corrida para las pruebas de integración | [02-diagramas §2](../checkpoint-1/02-diagramas.md), [03-modelo-datos §5](../checkpoint-1/03-modelo-datos.md), [04-infraestructura §5](../checkpoint-1/04-infraestructura.md) |
| [0014](../checkpoint-1/adr/0014-staging-de-imports.md) | Las filas de un import esperan en `import_fila`; los movimientos existen recién al confirmar | [01-arquitectura §3.1](../checkpoint-1/01-arquitectura.md), [02-diagramas §3](../checkpoint-1/02-diagramas.md), [03-modelo-datos](../checkpoint-1/03-modelo-datos.md) |

La migración `0001` lleva esas decisiones al esquema y cierra el resto de los
huecos del modelo: borrado lógico y `ON DELETE RESTRICT`, saldo inicial de las
cuentas, proveedor del movimiento, idempotencia de las alertas y `empresa_id`
en `mensaje`. El porqué de cada uno está en
[03-modelo-datos §3.6 a §3.10](../checkpoint-1/03-modelo-datos.md).

## 4. Estado del hito

| Ítem | Estado |
|---|---|
| Plan de trabajo, milestone e issues | Listo |
| Ruleset de `main` activo y tablero Kanban con campos | Listo |
| Límites de WIP del tablero y dueños por frente | Pendiente |
| ADR-0011 a 0014 y corrección de la documentación | Listo |
| Migración `0001`, con tests del esquema | Listo; falta aplicarla en Neon |
| Infraestructura desplegada | Pendiente |
| Backend del camino de demo | Pendiente |
| Pruebas de integración | Pendiente |
| Observabilidad con evidencia | Pendiente |
| Evaluación del asesor | Pendiente |
| Datos de demo, guion y ensayo | Pendiente |

Los documentos de evidencia (despliegue, pruebas de integración,
observabilidad y evaluación del asesor) se agregan a esta carpeta al cerrar
cada tarea; los reúne [#32].

[#2]: https://github.com/colosoler/Helpyme/issues/2
[#3]: https://github.com/colosoler/Helpyme/issues/3
[#4]: https://github.com/colosoler/Helpyme/issues/4
[#5]: https://github.com/colosoler/Helpyme/issues/5
[#6]: https://github.com/colosoler/Helpyme/issues/6
[#7]: https://github.com/colosoler/Helpyme/issues/7
[#8]: https://github.com/colosoler/Helpyme/issues/8
[#9]: https://github.com/colosoler/Helpyme/issues/9
[#10]: https://github.com/colosoler/Helpyme/issues/10
[#11]: https://github.com/colosoler/Helpyme/issues/11
[#14]: https://github.com/colosoler/Helpyme/issues/14
[#15]: https://github.com/colosoler/Helpyme/issues/15
[#16]: https://github.com/colosoler/Helpyme/issues/16
[#19]: https://github.com/colosoler/Helpyme/issues/19
[#21]: https://github.com/colosoler/Helpyme/issues/21
[#22]: https://github.com/colosoler/Helpyme/issues/22
[#25]: https://github.com/colosoler/Helpyme/issues/25
[#26]: https://github.com/colosoler/Helpyme/issues/26
[#27]: https://github.com/colosoler/Helpyme/issues/27
[#28]: https://github.com/colosoler/Helpyme/issues/28
[#32]: https://github.com/colosoler/Helpyme/issues/32
