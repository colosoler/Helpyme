# AI Decision Log — Helpyme

Bitácora obligatoria del TPI (§3 de la consigna). Registra cada fragmento de
código o diseño generado con asistentes de IA y, sobre todo, **la validación
humana**: qué se revisó, qué estaba mal y qué se corrigió.

El ingeniero es responsable del código que llega a producción, lo haya escrito
quien lo haya escrito. Una entrada sin validación humana no está terminada.

## Cómo agregar una entrada

Copiar la plantilla al final del archivo, en el mismo PR que el código.

```markdown
## AAAA-MM-DD — Título corto

- **Problema abordado:** qué desafío técnico había.
- **Prompt / Herramienta:** instrucción enviada y asistente usado.
- **Código / Arquitectura generada:** resumen de la propuesta de la IA.
- **Riesgos señalados por la IA:** lo que el propio asistente marcó para revisar.
- **Validación y corrección humana:** análisis crítico de quien revisó.
  Alucinaciones, ineficiencias o riesgos de seguridad encontrados y cómo se
  corrigieron. Firmado por el integrante (@usuario).
```

---

## 2026-09-28 — Reorganización del entregable del Checkpoint 1

- **Problema abordado:** la consigna pide una carpeta `entregas-cloud/checkpoint-1`
  con toda la información del hito; la documentación estaba suelta en `docs/`.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5). *«Hay que crear una
  carpeta "entregas-cloud" y dentro una carpeta checkpoint-1 con toda la
  información del checkpoint 1. Para saber todo lo que engloba el checkpoint 1
  debes analizar el PDF»* (se adjuntó la consigna del TPI).
- **Código / Arquitectura generada:** movió con `git mv` la arquitectura,
  diagramas, modelo de datos, infraestructura, costos, seguridad, observabilidad
  y ADR; escribió el índice `entregas-cloud/checkpoint-1/README.md`, que
  relaciona cada requisito de la consigna con su documento, y corrigió los
  enlaces relativos.
- **Riesgos señalados por la IA:** los documentos marcaban como «Listo» e
  «Implementado» archivos que no existían en el repositorio (`wrangler.toml`,
  `schema.ts`, workflows, `AI-DECISIONS.md`, health checks). La IA cambió esos
  estados a «Pendiente» antes de implementar nada. Si esos documentos se habían
  generado con un asistente, faltan las entradas correspondientes en esta
  bitácora.
- **Validación y corrección humana:** Se verificó manualmente la estructura contra la consigna y se recorrieron los enlaces del índice. Los estados inicialmente marcados como implementados fueron corregidos cuando no existían artefactos verificables.

## 2026-09-28 — Contratos de herramientas del asesor (`packages/shared`)

- **Problema abordado:** definir las siete funciones que el LLM puede invocar,
  garantizando que no pueda expresar consultas a otra empresa (ADR-0007).
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5). *«Los workspace ya
  los podemos hacer: las apps, packages, wrangler toml y el esquema drizzle,
  además el workflow de CI y AI-DECISIONS.md»*.
- **Código / Arquitectura generada:** `advisor-tools.ts` con esquemas
  `strict: true` y `additionalProperties: false`, tipos de entrada por
  herramienta y un test que falla si alguna herramienta acepta un parámetro
  relacionado con empresa, tenant u organización.
- **Riesgos señalados por la IA:**
  - Las fechas se declaran como `string` sin `format` porque no está verificado
    qué palabras clave de JSON Schema admite el modo estricto de la API de
    Anthropic. Hay que contrastarlo con la documentación vigente.
  - Los rangos (1 a 90 días, 1 a 12 meses) solo están en la descripción: el
    modelo puede ignorarlos, así que el servidor **debe** validarlos antes de
    ejecutar.
  - Los parámetros de `simularEscenario` (`tipo`, `valor`, `meses`) los propuso
    la IA; la documentación no los definía.
- **Validación y corrección humana:**  Se revisó manualmente advisor-tools.ts y se ejecutaron los tests asociados. Se verificó que existan las siete herramientas del MVP, que ninguna acepte empresa_id, tenant u organización, que los esquemas sean cerrados y que el modo de llamadas sea VALIDATED.
La validación de rangos, fechas, inyección de empresa_id, ejecución de funciones y aislamiento multi-tenant queda pendiente hasta implementar el orquestador, la autenticación y la capa de cálculo.

## 2026-09-28 — Esquema Drizzle y migración inicial (`packages/db`)

- **Problema abordado:** llevar el modelo de datos de `03-modelo-datos.md` a
  código tipado y a una migración SQL versionada.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5), mismo prompt que la
  entrada anterior.
- **Código / Arquitectura generada:** 13 tablas con `empresa_id` en toda tabla
  de negocio, montos en `numeric(14,2)`, índice único `(empresa_id, hash_dedup)`,
  los índices de la sección 4 del modelo y enums de Postgres para los campos
  con valores cerrados. Migración `0000_inicial.sql` generada con Drizzle Kit.
- **Riesgos señalados por la IA:**
  - **Inconsistencia de diseño sin resolver:** el modelo de datos pone
    `empresa_id` y `rol` en `usuario` (un usuario, una empresa), mientras que
    ADR-0008 adopta el plugin de organizaciones de Better Auth, que modela la
    membresía en una tabla aparte. El equipo tiene que decidirlo antes de
    implementar F1.
  - Las tablas propias de Better Auth (sesiones, cuentas, verificación) no están
    incluidas: se generan con su CLI en el PR de F1.
  - Valores que la IA inventó porque la documentación no los fijaba: estados de
    `cuenta_corriente` (`pendiente`, `saldada`, `anulada`), severidades de alerta
    (`info`, `media`, `alta`), convención de signo del monto (positivo =
    ingreso) y las políticas `ON DELETE`.
  - Columnas agregadas que no estaban en el diagrama: `import.nombre_archivo`,
    `import.detalle_error`, `movimiento.import_id` y `created_at` en todas las
    tablas.
- **Validación y corrección humana:** y se decidió eliminar el atributo empresa_id de la tabla usuario. Una empresa puede tener múltiples usuarios y la relación usuario-empresa se gestionará mediante la tabla membership de Better Auth. De esta forma, Better Auth será la fuente de verdad para determinar a qué empresa u organización pertenece cada usuario, evitando duplicar esa relación en el esquema propio. La incorporación de las tablas y migraciones propias de Better Auth queda pendiente de la implementación de autenticación en F1. Se decidió conservar el historial mediante borrado lógico, utilizando una marca deleted_at en lugar de eliminar físicamente empresas, usuarios o datos financieros.
Esta decisión requiere revisar las relaciones que actualmente utilizan ON DELETE CASCADE, ya que no deben eliminar en cascada el historial de la empresa. La implementación de deleted_at, los filtros de registros activos y la migración correspondiente quedan pendientes de realizarse junto con la definición final de autenticación.

## 2026-09-28 — Infraestructura como código (`apps/api/wrangler.toml`)

- **Problema abordado:** declarar Worker, R2, Queues con DLQ y cron para los
  entornos local, preview y producción.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5), mismo prompt.
- **Código / Arquitectura generada:** bloque raíz solo para `wrangler dev`,
  entornos `preview` y `production` con sus propios bindings, Workers Logs
  activado y cron a las 09:00 UTC. Se validó con `wrangler deploy --dry-run` en
  los tres entornos.
- **Riesgos señalados por la IA:**
  - **Error en la documentación original:** preview y producción compartían la
    cola `helpyme-imports`, pero una cola de Cloudflare admite un solo Worker
    consumidor. Se separaron las colas y se actualizó `04-infraestructura.md`.
  - `triggers` se hereda entre entornos en Wrangler: se anuló explícitamente en
    preview para no correr el cron dos veces.
  - **Inconsistencia sin resolver:** la documentación promete una branch de Neon
    por PR, pero hay un único Worker de preview y un único `DATABASE_URL` por
    entorno. O se acepta una branch compartida de preview, o hace falta un
    Worker por PR.
  - Los dominios de CORS (`helpyme.vercel.app`, `helpyme-git-*.vercel.app`) son
    supuestos: hay que reemplazarlos por los reales al crear el proyecto en
    Vercel.
- **Validación y corrección humana:** Se revisó apps/api/wrangler.toml y se ejecutaron correctamente los deploy --dry-run de preview y producción. Se confirmó que ambos entornos utilizan colas y buckets R2 independientes, y que el cron queda desactivado en preview.
Durante la revisión se detectó una diferencia entre la documentación y la implementación: la documentación promete una branch efímera de Neon por pull request, mientras que el entorno preview actual utiliza una única branch y un único Worker compartidos. La documentación todavía no fue corregida. Se decide mantener el entorno preview compartido durante este checkpoint y postergar el aislamiento por PR para el Checkpoint 2.

## 2026-09-28 — Esqueleto del Worker y del frontend (`apps/api`, `apps/web`)

- **Problema abordado:** tener una API desplegable con health checks, logs
  estructurados y manejo de errores, y un frontend mínimo que la consuma.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5), mismo prompt.
- **Código / Arquitectura generada:** app Hono con `/health` y `/ready`,
  middleware de `requestId` y log de acceso en JSON, CORS con lista blanca que
  acepta comodines acotados, manejador de errores sin stack al cliente,
  esqueletos del consumidor de la cola y del cron, 13 tests. Next.js 15 con una
  página que muestra el estado de la API.
- **Riesgos señalados por la IA:**
  - El consumidor todavía no procesa: hace `retry()` a propósito para que los
    mensajes terminen en la DLQ y no se pierdan. Un `ack()` los descartaría en
    silencio.
  - Los tests corren en Node, no en el runtime `workerd`. Para Checkpoint 2
    conviene evaluar `@cloudflare/vitest-pool-workers`.
  - El comodín de CORS se implementó a mano; los tests cubren intentos de colar
    otro dominio, pero es código de seguridad que merece revisión atenta.
  - Se fijaron Next.js 15 y TypeScript 5 aunque existen versiones mayores
    (Next 16, TypeScript 7), para respetar ADR-0006 y el `package.json` inicial.
- **Validación y corrección humana:** Se ejecutaron npm test, npm run typecheck y npm run build. Los tests de la API finalizaron con 13/13 casos aprobados y los tests de packages/shared con 16/16 casos aprobados. El typecheck finalizó correctamente en API, frontend, base de datos y paquetes compartidos.
El build de la API fue validado mediante wrangler deploy --dry-run para producción y finalizó correctamente. El build de Next.js 15 también compiló correctamente, generó las páginas estáticas y completó la verificación de tipos.
Se confirmó el comportamiento de /health, /ready, X-Request-Id, manejo de errores, respuestas 404 y lista blanca de CORS. También se verificó que las herramientas del asesor no acepten parámetros de empresa y utilicen esquemas cerrados.
Como riesgos pendientes, los tests todavía se ejecutan en Node y no en workerd, el consumidor de imports aún no procesa mensajes y el frontend continúa siendo un esqueleto mínimo. La validación corresponde al alcance implementado en este checkpoint.

## 2026-09-28 — Workflow de CI/CD

- **Problema abordado:** validación automática de cada PR y despliegue continuo,
  como pide la consigna.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5), mismo prompt.
- **Código / Arquitectura generada:** `.github/workflows/ci.yml` con typecheck,
  tests, un chequeo que falla si `schema.ts` cambió sin migración, y build
  (incluye el dry-run de Wrangler). Job de deploy que aplica migraciones y
  despliega el Worker, condicionado a la variable `DEPLOY_ENABLED`.
- **Riesgos señalados por la IA:**
  - El deploy aplica migraciones contra producción antes de desplegar el código.
    Solo es seguro si cada migración es compatible hacia atrás, regla que hoy
    depende de la revisión humana.
  - El workflow no pudo ejecutarse en GitHub desde la sesión; se verificaron
    localmente los mismos comandos (`npm ci`, typecheck, tests, build).
- **Validación y corrección humana:** La validación quedó confirmada localmente y mediante GitHub Actions: el PR pasó correctamente el workflow de CI/CD. Se verificaron tests, typecheck, build y sincronización entre el esquema Drizzle y las migraciones. No se detectaron cambios de esquema sin migración asociada. El despliegue real continúa desactivado hasta provisionar las cuentas y secretos necesarios.

## 2026-09-28 — Migración del asesor de Anthropic Claude a Google Gemini

- **Problema abordado:** el equipo decidió usar Gemini como modelo del asesor
  (commit `008639e` en el one-pager); el resto del entregable y el código
  seguían diciendo Anthropic Claude.
- **Prompt / Herramienta:** Claude Code (Claude Opus 5.5). *«Cambiamos a
  Gemini. Vamos a utilizar la IA de Gemini, por lo que hay que cambiar lo
  demás. En esta misma rama.»*
- **Código / Arquitectura generada:** ADR-0010 que reemplaza a ADR-0007 con
  `gemini-3.8-flash`; contratos del asesor en formato `FunctionDeclaration` de
  Gemini (`parametersJsonSchema` y modo `VALIDATED`); variables de entorno
  `GEMINI_API_KEY` y `GEMINI_MODEL`; costos recalculados; diagramas,
  arquitectura, seguridad, infraestructura, README y one-pager actualizados.
  Modelo, precios, caché y formato de funciones se relevaron de la
  documentación oficial de Google el 28/09/2026.
- **Riesgos señalados por la IA:**
  - **Las razones del cambio en ADR-0010 las redactó la IA** (costo, capa
    gratuita, modo `VALIDATED`, llamadas en paralelo). El equipo tiene que
    confirmar que son las suyas: es lo que se va a defender.
  - El caché implícito de Gemini exige 4.096 tokens de prefijo y el del asesor
    ronda los 2.000: la palanca de costo principal del diseño original no
    aplica. Se documentó en lugar de suponer un descuento.
  - El precio de `gemini-3.8-flash` se duplica el 01/01/2027; las estimaciones
    usan el precio de 2027.
  - La capa gratuita de Gemini permite a Google usar el contenido: no se puede
    usar con datos reales. Verificar contra los términos vigentes.
  - La tabla de escala del documento de costos original era inconsistente: a
    100 y 500 empresas, el costo del LLM solo superaba el total declarado. Se
    rehízo con precios de Neon relevados, pero las horas de cómputo son
    supuestos.
  - Gemini 3.8 Flash tiene menos capacidad de razonamiento que `claude-opus-5`.
    Hace falta un set de preguntas de evaluación antes del Checkpoint 2.
- **Validación y corrección humana:** Se ejecutó una búsqueda global de referencias a Anthropic, Claude y ANTHROPIC_API_KEY. Las coincidencias restantes corresponden únicamente a antecedentes, comparaciones de costos, riesgos documentados y al ADR-0007, que figura explícitamente como reemplazado por ADR-0010. No se encontraron dependencias ni variables operativas de Anthropic. La configuración activa utiliza Gemini mediante GEMINI_API_KEY, GEMINI_MODEL, parametersJsonSchema y modo VALIDATED.
