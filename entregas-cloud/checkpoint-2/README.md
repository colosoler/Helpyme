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

## 3. Estado del hito

| Ítem | Estado |
|---|---|
| Plan de trabajo, milestone e issues | Listo |
| Tablero Kanban, ruleset de `main` y dueños por frente | Pendiente |
| Decisiones de arquitectura de la semana 1 (ADR-0011, migración `0001`) | Pendiente |
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
