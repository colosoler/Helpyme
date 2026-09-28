# ADR-0009 — Sin agregación bancaria automática en v1

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

La propuesta de valor de Helpyme es consolidar el dinero disperso de una PyME.
El banco es una de las cuatro fuentes, y la más tediosa de cargar: el usuario
tiene que entrar al homebanking, descargar un archivo y subirlo.

Automatizar eso eliminaría la mayor fricción del producto. Es, sin dudas, la
funcionalidad más pedida. Por eso la decisión de **no** hacerla necesita
justificarse mejor que la de hacerla.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Agregador tipo Plaid o Belvo** | En Argentina no existe una infraestructura de *open banking* estandarizada equivalente. Los agregadores regionales tienen cobertura parcial, contratos comerciales y costo por cuenta conectada, incompatibles con un MVP académico. |
| **Scraping de homebanking con credenciales del usuario** | Descartado por tres motivos independientes, cada uno suficiente por sí solo: **(1) seguridad** — obliga a almacenar y usar credenciales bancarias de un tercero, el peor activo posible en caso de brecha; **(2) fragilidad** — se rompe con cada cambio de front de cada banco, y hay más de veinte; **(3) alcance** — mantener veinte scrapers es un producto en sí mismo, no una funcionalidad del nuestro. |
| **API oficial de cada banco** | Muy pocos bancos argentinos exponen APIs para personas o PyMEs, y las que hay requieren acuerdos comerciales. Inviable para el MVP. |

## Decisión

**No hay integración bancaria automática en v1.** El banco entra por carga de
extracto CSV/XLSX, con previsualización y corrección antes de confirmar.

Para compensar la fricción, el producto ataca el problema por otro lado:

- **Mercado Pago sí se integra automáticamente**, por OAuth oficial, desde el
  día uno. Como la mayoría de las PyMEs del segmento cobra principalmente por
  ahí, el usuario **ve valor real antes de subir su primer archivo**. Es la
  mitigación del riesgo de abandono declarado en
  [01-arquitectura.md](../01-arquitectura.md#7-riesgos-técnicos-y-mitigaciones).
- La ingesta de extractos se diseña para que la **segunda vez cueste menos que
  la primera**: las correcciones de categoría generan reglas persistentes.
- La deduplicación por hash permite subir extractos solapados sin pensar en
  qué período ya se cargó.

## Consecuencias

**A favor**

- **El sistema nunca pide ni almacena credenciales bancarias.** Es un argumento
  de venta ante un usuario desconfiado y elimina de raíz la peor clase de
  incidente de seguridad posible en este producto.
- El alcance del MVP queda acotado a lo que el equipo puede construir y defender
  en el cuatrimestre.
- Sin dependencia de terceros frágiles, no hay una clase entera de fallos en
  producción.

**Lo que aceptamos pagar**

- **La fricción sigue existiendo**, y es el principal riesgo de abandono del
  producto. La decisión no la elimina: la acota y la mitiga.
- Los datos bancarios están tan actualizados como el último extracto subido. La
  UI debe mostrar **la fecha del último movimiento importado** para que el
  usuario sepa qué antigüedad tienen los números que está mirando. Ocultarlo
  sería presentar como actual algo que puede tener tres semanas.
- Cada banco tiene su propio formato. Se soportan **solo los formatos de los
  primeros clientes reales**, con un parser genérico configurable como fallback;
  soportar todos preventivamente es trabajo sin techo.
