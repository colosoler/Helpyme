# Setup de infraestructura — Helpyme

> Parte del entregable del **Checkpoint 1**. Este documento es el procedimiento
> reproducible para levantar el proyecto desde cero.

La infraestructura se declara en archivos versionados, no en clicks de consola.
Los recursos de Cloudflare viven en
[`apps/api/wrangler.toml`](../../apps/api/wrangler.toml) y el esquema de base en
[`packages/db/src/schema.ts`](../../packages/db/src/schema.ts): si un recurso
cambia, cambia en un pull request y queda en el historial.

---

## 1. Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22 LTS (ver [`.nvmrc`](../../.nvmrc)) | Runtime de desarrollo |
| npm | 10+ | Workspaces del monorepo |
| Git | 2.40+ | Control de versiones |
| Cuenta Cloudflare | Plan Workers Paid (USD 5/mes) | Workers, R2 y Queues |
| Cuenta Neon | Free | PostgreSQL |
| Cuenta Vercel | Hobby | Frontend |
| Cuenta de Google AI Studio | Proyecto con facturación activa (capa paga) | Asesor conversacional (API de Gemini) |

**Por qué el plan pago de Cloudflare:** Cloudflare Queues no está disponible en
el plan gratuito, y la cola es estructural en esta arquitectura
([ADR-0005](./adr/0005-procesamiento-asincronico.md)). Es el único costo fijo
del MVP.

---

## 2. Estructura del repositorio

```
Helpyme/
├── apps/
│   ├── api/                 Worker: API REST (Hono) + consumer + cron
│   │   ├── wrangler.toml    Infraestructura Cloudflare declarada
│   │   └── src/
│   └── web/                 Next.js sobre Vercel
├── packages/
│   ├── db/                  Esquema Drizzle + migraciones versionadas
│   └── shared/              Tipos y contratos compartidos (incluye tools del LLM)
├── docs/                    One-pager y documentación viva del equipo
├── entregas-cloud/          Entregables del TPI, una carpeta por hito
│   └── checkpoint-1/        Arquitectura, diagramas, ADR e infraestructura
├── .github/workflows/       CI/CD
└── AI-DECISIONS.md          Bitácora obligatoria de uso de IA
```

El monorepo usa **npm workspaces**: una sola instalación, tipos compartidos entre
frontend y backend sin publicar paquetes, y un cambio de contrato que rompe la
compilación de ambos lados en el mismo PR.

---

## 3. Puesta en marcha local

```bash
git clone https://github.com/colosoler/Helpyme.git
cd Helpyme
npm install
```

### 3.1 Base de datos (Neon)

1. Crear un proyecto en [neon.tech](https://neon.tech), región `aws-us-east-1`
   (la más cercana con plan gratuito).
2. **Crear una branch propia por desarrollador** desde `main`. No se trabaja
   contra la branch principal.
3. Copiar la *connection string* con `?sslmode=require`.

```bash
cp .env.example .env
cp .env.example apps/api/.dev.vars   # el Worker lee .dev.vars, no .env
```

Cargar `DATABASE_URL` en ambos y aplicar el esquema:

```bash
npm run db:generate    # genera el SQL desde schema.ts
npm run db:migrate     # lo aplica a tu branch
```

### 3.2 Recursos de Cloudflare

```bash
npx wrangler login

# Buckets R2 (produccion y preview)
npx wrangler r2 bucket create helpyme-documentos
npx wrangler r2 bucket create helpyme-documentos-preview

# Colas de produccion: principal y dead letter
npx wrangler queues create helpyme-imports
npx wrangler queues create helpyme-imports-dlq

# Colas de preview: una cola admite un solo Worker consumidor,
# asi que preview no puede compartir las de produccion
npx wrangler queues create helpyme-imports-preview
npx wrangler queues create helpyme-imports-preview-dlq
```

Los recursos `*-dev` del bloque raíz de `wrangler.toml` no se crean: `wrangler
dev` los simula en la máquina local.

Los nombres deben coincidir con los declarados en `wrangler.toml`. Si difieren,
el despliegue falla en el momento del `wrangler deploy` —falla temprano y
ruidosamente, que es lo deseable.

### 3.3 Levantar el entorno

```bash
npm run dev:api    # Worker en http://localhost:8787
npm run dev:web    # Next.js en http://localhost:3000
```

Verificación rápida:

```bash
curl http://localhost:8787/health   # liveness
curl http://localhost:8787/ready    # readiness: incluye chequeo real de la base
```

---

## 4. Secretos

**Ningún secreto se commitea.** `.env`, `.dev.vars` y sus variantes están en
[`.gitignore`](../../.gitignore); la plantilla vacía y documentada es
[`.env.example`](../../.env.example).

| Entorno | Dónde viven |
|---|---|
| Local | `apps/api/.dev.vars` (Worker) y `.env` (Next.js) |
| Preview y producción — Worker | `wrangler secret put <NOMBRE> --env <entorno>` |
| Preview y producción — Frontend | Variables de entorno del proyecto en Vercel |
| CI | GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` (entorno `production`) |

```bash
# Desde apps/api, repetir con --env preview
npx wrangler secret put DATABASE_URL --env production
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put BETTER_AUTH_SECRET --env production
npx wrangler secret put MERCADOPAGO_CLIENT_SECRET --env production
```

Los secretos de Cloudflare están cifrados en reposo y **no se pueden volver a
leer** desde la consola: si uno se pierde, se rota. Es la propiedad que se
quiere.

---

## 5. Entornos

| Entorno | Frontend | API | Base de datos |
|---|---|---|---|
| **Local** | `localhost:3000` | `localhost:8787` (`wrangler dev`) | Branch de Neon por desarrollador |
| **Preview** | URL efímera de Vercel por PR | Worker `env=preview` | Branch de Neon efímera del PR |
| **Producción** | Dominio de producción | Worker `env=production` | Branch `main` de Neon |

Cada pull request levanta un entorno completo y aislado. Es lo que hace que el
code review cruzado que exige el TPI sea sobre algo que funciona y no sobre un
diff a ciegas.

---

## 6. Despliegue

Automático vía GitHub Actions al mergear a `main`
([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). **Está prohibido
el push directo a `main`**: todo cambio entra por pull request revisado
([08-proceso-equipo](../../docs/08-proceso-equipo.md)).

| Capa | Cómo se despliega |
|---|---|
| API (Worker) | Job `deploy-api` del CI: aplica migraciones y corre `wrangler deploy --env production`. Queda desactivado hasta crear la variable de repositorio `DEPLOY_ENABLED=true` y los secretos del entorno `production` |
| Frontend | Integración Git de Vercel, con *Root Directory* `apps/web`: preview por PR y producción al mergear |

Despliegue manual, solo para emergencias:

```bash
npm run build --workspace @helpyme/api
npx wrangler deploy --env production
```

### Rollback

| Capa | Cómo |
|---|---|
| Worker | `npx wrangler rollback` (vuelve a la versión anterior) |
| Frontend | Promover el deployment anterior desde el panel de Vercel |
| Base de datos | Restore a un punto en el tiempo desde Neon |

Las migraciones de base **deben ser compatibles hacia atrás**: primero se
despliega el esquema que acepta ambas versiones, después el código. Sin eso, un
rollback del Worker deja la aplicación hablándole a una base que ya no entiende.

---

## 7. Estado del Checkpoint 1

| Recurso | Estado |
|---|---|
| Repositorio con historial de commits convencionales | Listo |
| Tooling raíz del monorepo (`package.json` con workspaces, `tsconfig.base.json`, `.editorconfig`, `.nvmrc`, `.env.example`, `.gitignore`) | Listo |
| Arquitectura, diagramas, modelo de datos y ADR | Listo |
| Workspaces `apps/api`, `apps/web`, `packages/db`, `packages/shared` | Listo |
| [`wrangler.toml`](../../apps/api/wrangler.toml) con Worker, R2, Queues con DLQ y cron por entorno | Listo |
| [Esquema Drizzle](../../packages/db/src/schema.ts) y migración inicial generada | Listo |
| API con `/health`, `/ready`, middleware y tests | Listo |
| Workflow de CI con deploy (desactivado hasta provisionar) | Listo |
| [`AI-DECISIONS.md`](../../AI-DECISIONS.md) en la raíz del repositorio | Listo; validación humana de cada entrada a cargo del equipo |
| Provisión de cuentas cloud reales y primer deploy | Pendiente de ejecución por el equipo |

La provisión de cuentas requiere credenciales del equipo y se ejecuta con este
documento como guía.
