# ADR-0004 — Cloudflare R2 para archivos originales

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

El sistema recibe dos tipos de archivo del usuario: extractos bancarios (CSV o
XLSX) y comprobantes o facturas adjuntos a un gasto.

Estos archivos se conservan **por trazabilidad**, no por comodidad: si una PyME
cuestiona una cifra del dashboard —y en un producto financiero lo va a hacer— el
equipo tiene que poder volver al archivo exactamente como lo subió el usuario y
reconstruir el cálculo. Sin el original, una discusión sobre un número no se
puede cerrar.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Guardar los binarios en PostgreSQL** (`bytea`) | Infla los backups, encarece cada consulta y desperdicia el almacenamiento más caro del stack en el dato más frío del sistema. |
| **AWS S3** | El estándar de la industria y funciona perfectamente, pero desde Workers exige credenciales de otra nube, firma de requests y **cobra egreso**. Cada descarga de un extracto para reprocesar cuesta dinero. |
| **No guardar el original** | Se descartó por lo dicho arriba: sin el archivo fuente no hay forma de auditar un cálculo cuestionado. |

## Decisión

**Cloudflare R2**, integrado al Worker por *binding* nativo.

- **Binding nativo**: el bucket se accede como un objeto del entorno
  (`c.env.BUCKET`), sin claves de acceso que gestionar ni rotar.
- **Sin costo de egreso**, que es la diferencia económica relevante frente a S3
  para un flujo que relee archivos.
- API compatible con S3, así que migrar es viable si hiciera falta.

## Consecuencias

**A favor**

- Trazabilidad completa: todo cálculo se puede rastrear hasta el archivo fuente.
- Una credencial menos que administrar en el stack.
- Costo de almacenamiento marginal para el volumen del MVP (archivos de
  kilobytes, decenas por empresa y por mes).

**Lo que aceptamos pagar**

- Más acoplamiento a Cloudflare, ya asumido en
  [ADR-0001](./0001-backend-cloudflare-workers.md).
- **Los objetos nunca se exponen públicamente.** El acceso es siempre por URL
  firmada de vida corta, generada por el Worker tras verificar que el archivo
  pertenece a la empresa de la sesión. Un bucket público acá sería una fuga de
  datos financieros ([06-seguridad](../06-seguridad.md)).
- Hay que definir política de retención y borrado: si una empresa se da de baja,
  sus archivos se eliminan.
