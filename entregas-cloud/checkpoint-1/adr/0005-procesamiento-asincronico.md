# ADR-0005 — Procesamiento asíncrono con Cloudflare Queues

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

Un extracto bancario mensual puede traer cientos o miles de filas. Procesarlo
implica parsear el archivo, normalizar fechas y montos, calcular el hash de
deduplicación de cada fila y aplicar las reglas de categorización.

**Ese trabajo no entra en el presupuesto de CPU de una invocación de Worker.**
No es una estimación pesimista: es la restricción declarada en
[ADR-0001](./0001-backend-cloudflare-workers.md) y la razón por la que este ADR
existe.

Hay además un motivo de producto: aunque entrara, hacer esperar treinta segundos
a un usuario con un spinner es mal diseño en el flujo que ya es el de mayor
fricción del sistema.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Procesar en el request** | Excede el límite de CPU con archivos reales. Falla justo con los clientes que más datos tienen, que son los más valiosos. |
| **Procesar en el frontend** | Sacaría la carga del servidor, pero pone la lógica de negocio en un cliente no confiable y hace imposible reprocesar un import desde el servidor. |
| **Partir el archivo en varios requests** desde el cliente | Reinventa una cola, con peor semántica: sin reintentos, sin DLQ, y con el navegador del usuario como coordinador de la transacción. |

## Decisión

**Cloudflare Queues**, con un Worker productor y un Worker consumidor.

El flujo, detallado en
[02-diagramas.md](../02-diagramas.md#3-ingesta-asíncrona-de-un-extracto):

1. `POST /v1/imports` guarda el archivo en R2, crea la fila `import` en estado
   `pendiente`, encola `{importId, r2Key}` y responde **`202 Accepted`**.
2. El consumidor toma el mensaje, lee el objeto de R2, parsea, deduplica,
   categoriza e inserta los movimientos.
3. El frontend hace *polling* de `GET /v1/imports/:id` hasta que el estado sea
   `listo` o `error`.

## Consecuencias

**A favor**

- El request HTTP termina en milisegundos, sin importar el tamaño del archivo.
- **Reintentos automáticos** ante fallo transitorio y *dead letter queue* para
  los mensajes que agotan los intentos: un import que falla queda registrado con
  su causa, no se pierde en silencio.
- El consumidor tiene su propio presupuesto de CPU, independiente del request.
- La misma cola sirve mañana para otros trabajos pesados (importación desde
  Mercado Pago, generación de reportes).

**Lo que aceptamos pagar**

- **Complejidad de estado.** El import ahora tiene una máquina de estados
  (`pendiente → procesando → listo | error`) que el frontend debe reflejar
  honestamente. Es complejidad real, no accidental.
- **Polling** en lugar de push. Es más simple que WebSockets y suficiente para
  una operación de segundos; si molesta, se reemplaza sin cambiar el backend.
- **Queues requiere el plan pago de Workers** (USD 5/mes). Ya estaba asumido en
  [05-costos-finops](../05-costos-finops.md).
- **La entrega es «al menos una vez».** El consumidor tiene que ser idempotente.
  Lo es gracias al índice único de `hash_dedup`: un mensaje entregado dos veces
  no duplica movimientos ([03-modelo-datos](../03-modelo-datos.md#32-hash_dedup-con-índice-único-por-empresa)).
