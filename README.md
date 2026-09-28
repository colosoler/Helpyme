# Helpyme

Asesor financiero inteligente para PyMEs. Consolida el dinero de la empresa,
calcula indicadores determinísticos y responde en castellano sobre los números
reales del negocio. El modelo de lenguaje nunca calcula una cifra: solo redacta
sobre datos que le devuelve el backend.

TPI de Desarrollo de Software Cloud, UTN FRLP 2026.

## Entregas

| Hito | Dónde |
|---|---|
| One-Pager (Clase 1) | [docs/00-one-pager.md](docs/00-one-pager.md) |
| Checkpoint 1: Definición de Arquitectura | [entregas-cloud/checkpoint-1/](entregas-cloud/checkpoint-1/) |

## Stack

Next.js en Vercel · Cloudflare Workers + Hono · Neon PostgreSQL + Drizzle ·
Cloudflare R2 y Queues · Better Auth · Anthropic Claude · GitHub Actions.
Cada elección está justificada en los [ADR](entregas-cloud/checkpoint-1/adr/).

## Estructura

```
apps/api         Worker: API REST, consumidor de la cola y cron (wrangler.toml)
apps/web         Frontend Next.js
packages/db      Esquema Drizzle y migraciones
packages/shared  Contratos compartidos (herramientas del asesor, jobs)
docs/            One-pager y proceso del equipo
entregas-cloud/  Entregables del TPI por hito
```

## Desarrollo

Requiere Node 22 (ver `.nvmrc`).

```bash
npm install
npm run dev:api     # http://localhost:8787
npm run dev:web     # http://localhost:3000
npm run typecheck
npm test
```

Setup completo de infraestructura y secretos:
[04-infraestructura.md](entregas-cloud/checkpoint-1/04-infraestructura.md).

## Cómo trabajamos

Conventional Commits, PR revisado por otro integrante y tablero Kanban con
límites de WIP: [docs/08-proceso-equipo.md](docs/08-proceso-equipo.md). Todo uso
de IA queda registrado en [AI-DECISIONS.md](AI-DECISIONS.md).
