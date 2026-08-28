# ADR-0001 — Backend serverless en Cloudflare Workers + Hono

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

El patrón de uso de Helpyme es conocido y particular: una PyME entra al
dashboard unas pocas veces por semana, con un pico al cierre de mes. Son
sesiones cortas, muy espaciadas y de bajo volumen absoluto, con ráfagas
concentradas.

Ese patrón define el problema de cómputo: **la utilización promedio de cualquier
servidor dedicado sería cercana a cero**, pero el servicio tiene que responder
rápido cuando el usuario efectivamente entra.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **VM o contenedor siempre encendido** (EC2, Fly.io, Railway) | Se paga cómputo 24/7 para una utilización marginal. Además agrega carga operativa —parches, escalado, monitoreo del host— que el TPI busca minimizar con servicios gestionados. |
| **AWS Lambda + API Gateway** | Modelo correcto y la referencia sugerida por la cátedra, pero el *cold start* en un runtime con dependencias pesadas va de cientos de milisegundos a segundos. Para una app que se visita esporádicamente, **casi todas las visitas son un cold start**: el peor caso se vuelve el caso típico. Suma además el costo y la configuración de API Gateway. |
| **Contenedores gestionados** (Cloud Run, ECS Fargate) | Escalan a cero, pero el arranque de un contenedor frío es más lento aún y el modelo operativo es más pesado que el de una función. |

## Decisión

Backend sobre **Cloudflare Workers** con **Hono** como framework HTTP.

- **Workers** ejecuta en isolates de V8, no en contenedores. El arranque en frío
  es de milisegundos, así que el problema estructural de Lambda para este patrón
  de tráfico desaparece. Escala a cero de verdad y corre en el edge.
- **Hono** está diseñado para ese runtime: API cercana a Express, tipado fuerte,
  y bindings de Cloudflare tipados en el contexto del request. Express no es una
  opción, porque asume APIs de Node que Workers no expone.

## Consecuencias

**A favor**

- Cold start prácticamente nulo: el peor caso de este perfil de tráfico deja de
  ser un problema.
- Sin servidores, parches ni escalado que administrar.
- El plan pago de Workers (USD 5/mes) cubre el MVP entero e incluye Queues.
- Bindings nativos a R2 y Queues: sin credenciales que rotar entre servicios de
  Cloudflare.

**Lo que aceptamos pagar**

- **Límite de CPU por invocación.** Es la restricción más fuerte del stack y
  obliga a sacar el parseo de extractos del request. No es un costo evitable: es
  el motivo de [ADR-0005](./0005-procesamiento-asincronico.md).
- **No es Node.** No hay sockets TCP ni acceso al filesystem, y parte del
  ecosistema npm no corre. Condiciona directamente la elección de driver de base
  de datos ([ADR-0002](./0002-persistencia-neon-postgres.md)).
- Menos material de referencia que Lambda; el equipo asume una curva de
  aprendizaje mayor.
- Acoplamiento a Cloudflare. Se mitiga manteniendo la lógica de negocio en
  TypeScript puro, sin dependencias del runtime: lo portable es el grueso del
  código, lo específico son los bindings.
