# ADR-0013 — Preview compartido y branch efímera de Neon para las pruebas

**Estado:** Aceptada · **Fecha:** 2026-10 · **Precisa a:** [ADR-0002](./0002-persistencia-neon-postgres.md)

## Contexto

[ADR-0002](./0002-persistencia-neon-postgres.md),
[ADR-0006](./0006-frontend-vercel.md) y la documentación de entornos prometían
que cada pull request levanta un entorno completo y aislado, con su propia
branch de Neon.

Al declarar la infraestructura en `wrangler.toml` quedó claro que no es así de
simple. **Una cola de Cloudflare admite un solo Worker consumidor**, y un Worker
tiene una sola `DATABASE_URL`. Un entorno aislado por PR necesita un Worker,
dos colas, un bucket, una branch y sus secretos propios, creados y destruidos
por el CI en cada PR.

El equipo decidió el 28/09 mantener un preview compartido y dejó la
documentación sin corregir ([`AI-DECISIONS.md`](../../../AI-DECISIONS.md)).
Este ADR cierra esa diferencia.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Entorno completo por PR** (Worker, colas, bucket y branch) | Cinco recursos por PR que el CI crea y limpia, con riesgo de dejar huérfanos, para un equipo de cuatro que rara vez tiene más de tres PR abiertos. |
| **Preview compartido y nada más** | Las pruebas de integración correrían contra una base con el estado de todos los PR: no serían reproducibles. Se pierde además el motivo principal por el que se eligió Neon. |
| **Branch de Neon por PR con un Worker compartido** | Un Worker apunta a una sola base. No puede servir a varias branches a la vez. |

## Decisión

**Un entorno de preview compartido, y aislamiento donde afecta la corrección:
en las pruebas.**

| Qué | Cómo queda |
|---|---|
| API de preview | Un solo Worker, `helpyme-api-preview`, con sus colas y su bucket. Cada PR lo redespliega: gana el último |
| Base de preview | Una branch `preview` de Neon, compartida |
| Frontend de preview | Una URL de Vercel por PR, apuntando al Worker compartido |
| Pruebas de integración | **Una branch efímera de Neon por corrida del CI**, creada desde `main` y borrada al terminar |

## Consecuencias

**A favor**

- La infraestructura de preview es fija y está toda en `wrangler.toml`.
- Las pruebas de integración son reproducibles: cada corrida parte del esquema
  de producción y de una base vacía.
- El branching de Neon se usa donde más rinde, sin recursos huérfanos.

**Lo que aceptamos pagar**

- **Dos PR abiertos se pisan en preview.** El límite de tres tareas en
  revisión ([08-proceso-equipo](../../../docs/08-proceso-equipo.md)) lo acota,
  pero no lo elimina: quien revisa confirma que el preview tiene desplegado el
  PR que está mirando.
- **Una migración de un PR sin mergear queda aplicada** en la branch `preview`.
  Si el PR se descarta, la branch se resetea desde `main`.
- El preview muestra que un PR funciona, no que funciona aislado. Esa garantía
  la dan las pruebas de integración.
- Si el equipo o la cantidad de PR simultáneos crecen, hay que revisar esta
  decisión.

La implementan los issues [#7] (deploy de preview) y [#8] (base de las pruebas de
integración).

[#7]: https://github.com/colosoler/Helpyme/issues/7
[#8]: https://github.com/colosoler/Helpyme/issues/8
