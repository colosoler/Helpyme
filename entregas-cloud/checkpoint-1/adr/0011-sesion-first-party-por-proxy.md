# ADR-0011 — Sesión *first-party*: el frontend hace de proxy inverso de la API

**Estado:** Aceptada · **Fecha:** 2026-10 · **Precisa a:** [ADR-0006](./0006-frontend-vercel.md) y [ADR-0008](./0008-autenticacion-better-auth.md)

## Contexto

El frontend vive en Vercel ([ADR-0006](./0006-frontend-vercel.md)) y la API en
un Worker ([ADR-0001](./0001-backend-cloudflare-workers.md)). La sesión viaja en
una cookie que [06-seguridad](../06-seguridad.md) prometía `HttpOnly`, `Secure`
y `SameSite=Lax`.

Las tres cosas juntas no funcionan. Sin dominio propio, el frontend queda en
`<proyecto>.vercel.app` y la API en `<worker>.<cuenta>.workers.dev`. Tanto
`vercel.app` como `workers.dev` figuran en la *Public Suffix List* (consultada
el 12/10/2026), así que para el navegador son **dos sitios distintos**:

- Una cookie `SameSite=Lax` no se envía en un `fetch` entre sitios. Toda llamada
  a `/v1` desde el navegador llegaría sin sesión.
- Con `SameSite=None` la cookie viajaría, pero como cookie de terceros: Safari
  las bloquea, y la documentación de Better Auth describe ese síntoma exacto
  (login que funciona en Chrome y falla en Safari).

ADR-0006 había anotado «CORS entre dominios» como costo aceptado. CORS resuelve
quién puede leer la respuesta, no si la cookie viaja. El problema se detectó al
planificar el Checkpoint 2, antes de escribir la autenticación.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **`SameSite=None; Secure`** y CORS con credenciales | La sesión pasa a ser una cookie de terceros: bloqueada en Safari y en vías de restricción en el resto. Además renuncia a la protección contra CSRF que da `Lax`. |
| **Dominio propio con subdominios** (`app.` y `api.`) | Resuelve producción, porque ambos quedan en el mismo sitio. No resuelve las previews de Vercel, que siguen en `*.vercel.app`: el review cruzado se haría sobre un entorno donde no se puede iniciar sesión. Queda disponible como mejora de producción. |
| **Token en `localStorage`** enviado como `Authorization` | Expone la sesión a cualquier XSS y abandona `HttpOnly`. En un producto con datos financieros es el intercambio equivocado. |
| **Mover la API a Route Handlers de Next** | Elimina el problema eliminando el Worker, y con él Queues, el cron y todo ADR-0001. |

## Decisión

**El navegador habla únicamente con el origen del frontend.** Next reenvía
`/api/*` al Worker con *rewrites*, y Vercel actúa como proxy inverso.

| Ruta pública (origen del frontend) | Destino en el Worker |
|---|---|
| `/api/auth/*` | `/api/auth/*`, la ruta base por defecto de Better Auth |
| `/api/v1/*` | `/v1/*` |

- La cookie de sesión la fija el origen del frontend, sin atributo `Domain`:
  es *first-party* y `SameSite=Lax` aplica de verdad.
- La URL base de Better Auth es la del frontend, no la del Worker.
- Los Server Components llaman al Worker de servidor a servidor y reenvían la
  cookie del request entrante.
- La URL del Worker deja de exponerse al navegador: `NEXT_PUBLIC_API_URL` se
  reemplaza por una variable de entorno de servidor.
- **La API responde `Cache-Control: no-store`.** En los proyectos de Vercel
  creados desde abril de 2026, el CDN respeta el `Cache-Control` del origen en
  los rewrites externos: una respuesta financiera cacheable podría servirse a
  otro usuario.
- La lista blanca de CORS del Worker se mantiene como defensa en profundidad,
  aunque el navegador ya no la necesita.

Es la primera solución que recomienda la documentación de Better Auth para este
caso. La implementa el issue [#5] y se verifica contra el sistema desplegado:
login desde Safari y desde Chrome en una preview.

## Consecuencias

**A favor**

- La sesión funciona en todos los navegadores, con los atributos que
  06-seguridad prometía.
- Cada preview de Vercel tiene su propia sesión sin tocar la configuración: la
  cookie pertenece al origen de esa preview.
- El comodín de CORS para las previews deja de ser parte del camino crítico.

**Lo que aceptamos pagar**

- **Un salto más en cada request**: navegador → Vercel → Cloudflare. Hay que
  medirlo contra el objetivo de p95 < 300 ms del dashboard.
- **El tráfico de la API consume cuota de Vercel.** El plan Hobby incluye hasta
  10 GB de *Fast Origin Transfer* y corta los requests proxeados a los 120
  segundos (límites consultados el 12/10/2026).
- **Dos comportamientos sin verificar**, cada uno con su alternativa:
  - Que la subida de un extracto de 10 MB pase por el rewrite (issue [#19]). Si
    no pasa, el archivo se sube directo a R2 con una URL firmada.
  - Que el *streaming* del chat no quede en buffer (issue [#28]). Si queda, el
    chat se sirve desde un Route Handler que retransmite el stream.
- **El Worker sigue siendo alcanzable en `workers.dev`.** Una llamada directa
  no lleva la cookie, que es del origen del frontend, así que no puede actuar
  por un usuario. Si hiciera falta cerrarlo, Vercel puede agregar un header
  secreto en cada rewrite y el Worker rechazar lo que no lo traiga.
- El Worker ve la IP de Vercel; la del visitante llega en `x-forwarded-for`. El
  rate limiting del chat es por empresa y no depende de ella.
- Better Auth valida el `Origin` de cada request contra sus orígenes de
  confianza, y las previews tienen URL dinámica: hay que configurarlos con un
  patrón (issue [#14]).

[#5]: https://github.com/colosoler/Helpyme/issues/5
[#14]: https://github.com/colosoler/Helpyme/issues/14
[#19]: https://github.com/colosoler/Helpyme/issues/19
[#28]: https://github.com/colosoler/Helpyme/issues/28
