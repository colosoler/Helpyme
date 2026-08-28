# Architecture Decision Records

Cada decisión de arquitectura relevante se registra acá, con el contexto que la
motivó, las alternativas que se evaluaron y las consecuencias que aceptamos.

El TPI exige justificar técnicamente cada servicio cloud. Un ADR es esa
justificación, escrita cuando la decisión se toma y no reconstruida en la
defensa.

## Formato

`Contexto` (qué problema real había) · `Alternativas` (qué más se evaluó y por
qué se descartó) · `Decisión` · `Consecuencias` (lo bueno y lo que aceptamos
pagar).

## Índice

| # | Decisión | Estado |
|---|---|---|
| [0001](./0001-backend-cloudflare-workers.md) | Backend serverless en Cloudflare Workers + Hono | Aceptada |
| [0002](./0002-persistencia-neon-postgres.md) | PostgreSQL gestionado en Neon | Aceptada |
| [0003](./0003-orm-drizzle.md) | Drizzle ORM como capa de acceso a datos | Aceptada |
| [0004](./0004-storage-r2.md) | Cloudflare R2 para archivos originales | Aceptada |
| [0005](./0005-procesamiento-asincronico.md) | Procesamiento asíncrono con Cloudflare Queues | Aceptada |
| [0006](./0006-frontend-vercel.md) | Next.js sobre Vercel para el frontend | Aceptada |
| [0007](./0007-modelo-llm.md) | Anthropic Claude con *function calling* estricto | Aceptada |
| [0008](./0008-autenticacion-better-auth.md) | Better Auth con modelo de organizaciones | Aceptada |
| [0009](./0009-sin-agregacion-bancaria.md) | Sin agregación bancaria automática en v1 | Aceptada |

## Estados posibles

`Propuesta` · `Aceptada` · `Rechazada` · `Reemplazada por ADR-XXXX`

Una decisión que cambia **no se edita**: se marca como reemplazada y se escribe
un ADR nuevo. El historial de por qué pensábamos distinto es información útil.
