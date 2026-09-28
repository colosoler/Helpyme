# ADR-0008 — Better Auth con modelo de organizaciones

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

Helpyme es multi-tenant: un usuario pertenece a una empresa y **todos los datos
están particionados por empresa**. La sesión no solo tiene que responder «quién
es este usuario», sino «a qué empresa pertenece», porque ese dato alimenta el
filtro obligatorio de cada consulta
([02-diagramas.md](../02-diagramas.md#5-aislamiento-multi-tenant)).

La autenticación es por lo tanto la primera línea del aislamiento, no una
funcionalidad accesoria.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Auth0 / Clerk** | Servicios gestionados, sólidos y sugeridos por la cátedra. Se descartaron por costo: el precio por usuario activo escala mal para un SaaS de PyMEs con margen chico, y el modelo de organizaciones suele estar en los planes superiores. |
| **AWS Cognito** | Barato y robusto, pero traería un tercer proveedor de nube al stack solo por autenticación, con su propia consola y su propio modelo de identidad. |
| **Implementación propia** | Escribir hashing de contraseñas, gestión de sesiones y recuperación de cuenta es superficie de ataque autoinfligida. No se justifica jamás en un producto con datos financieros. |

## Decisión

**Better Auth** con su plugin de **organizaciones**, corriendo dentro del propio
Worker y persistiendo en la misma base de Neon.

Lo determinante es que el **modelo de organizaciones de Better Auth es el modelo
del producto**: una organización es una empresa, y la membresía de un usuario en
ella es el dato que el middleware inyecta en el contexto del request. No hay que
mapear un modelo de identidad ajeno al del dominio, que es donde suelen
aparecer los errores de autorización.

## Consecuencias

**A favor**

- Sesiones, usuarios y organizaciones en las mismas tablas que el resto del
  dominio: una sola base, un solo backup, integridad referencial real.
- Sin costo por usuario activo.
- TypeScript nativo, compatible con el runtime de Workers.
- El `empresa_id` de la sesión sale directo de la membresía, sin traducción.

**Lo que aceptamos pagar**

- **Nosotros operamos la autenticación.** Si aparece una vulnerabilidad en la
  librería, actualizar es responsabilidad del equipo. Se mitiga con Dependabot
  ([07-observabilidad](../07-observabilidad.md)).
- Proyecto más joven que Auth0 o Clerk, con menos material de referencia.
- Funcionalidades empresariales (SSO, SAML) quedarían a cargo del equipo si
  alguna vez se necesitaran. Están fuera del alcance del MVP.
- **`empresa_id` se toma siempre de la sesión del servidor, nunca de un
  parámetro del cliente.** Es la regla que hace que todo lo anterior sirva de
  algo, y está verificada por tests en [06-seguridad](../06-seguridad.md).
