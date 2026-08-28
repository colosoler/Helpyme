# ADR-0006 — Next.js sobre Vercel para el frontend

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

El frontend tiene que resolver tres cosas distintas: un dashboard con gráficos y
tablas, formularios de carga con previsualización de datos tabulares, y un chat
con respuesta en *streaming*.

El usuario objetivo tiene perfil técnico bajo y entra desde escritorio y desde
el celular, así que la interfaz debe ser responsive —no hay app nativa en el
alcance del MVP.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **SPA con Vite + React**, servida desde R2 o Pages | Perfectamente viable y más simple de desplegar. Se descartó por el render inicial: un dashboard es la primera pantalla tras el login y conviene servirlo con datos ya resueltos en el servidor. |
| **Renderizar desde el propio Worker** (Hono + JSX) | Elimina un servicio del stack, pero mezcla la API con la presentación, rompiendo el desacoplamiento que el TPI pide demostrar. Peor experiencia de desarrollo para una UI con estado. |
| **Astro** | Excelente para contenido mayormente estático. Helpyme es una aplicación con estado y sesión, que no es su caso de uso más fuerte. |

## Decisión

**Next.js 15 con App Router**, desplegado en **Vercel**.

- **Next.js**: React Server Components para el render inicial del dashboard,
  soporte natural de streaming para el chat, y TypeScript de punta a punta con
  los tipos compartidos desde `packages/shared`.
- **Vercel**: es la plataforma de referencia para Next.js —la que la desarrolla—
  y está explícitamente listada en la matriz sugerida por la cátedra.

Lo decisivo en lo operativo son las **previews automáticas por pull request**:
cada PR obtiene una URL desplegada. Combinado con el branch de base de datos de
Neon ([ADR-0002](./0002-persistencia-neon-postgres.md)), el revisor no lee un
diff: **abre la feature funcionando**. Eso hace que el code review cruzado que
exige el TPI sea real y no un trámite.

## Consecuencias

**A favor**

- Previews por PR, que elevan la calidad del code review obligatorio.
- CDN global y optimización de assets sin configuración.
- Despliegue por `git push`, sin pipeline propio para el frontend.
- Frontend y backend escalan y se despliegan por separado, como pide el TPI.

**Lo que aceptamos pagar**

- **Un proveedor más en el stack** (Vercel además de Cloudflare). Se acepta
  conscientemente: cada uno es el mejor en su capa, y la alternativa —Cloudflare
  Pages— no ofrece la misma integración con Next.js.
- **CORS entre dominios**, porque el frontend y la API viven en orígenes
  distintos. Se resuelve con una lista blanca explícita de orígenes en el
  middleware del Worker, nunca con un comodín.
- El plan gratuito de Vercel es para uso no comercial; si el producto se
  comercializara habría que migrar al plan pago.
