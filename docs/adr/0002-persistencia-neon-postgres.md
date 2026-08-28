# ADR-0002 — PostgreSQL gestionado en Neon

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

El dominio es intrínsecamente relacional y transaccional: movimientos que
pertenecen a cuentas, cuentas a empresas, cuentas corrientes con vencimientos.

Los indicadores del producto **son consultas agregadas**: sumas por período,
rankings por categoría y proveedor, evolución mensual comparada, proyección de
saldo día a día. Es exactamente lo que SQL resuelve bien y lo que un motor de
documentos obliga a resolver en la aplicación.

Además, el runtime elegido en [ADR-0001](./0001-backend-cloudflare-workers.md)
no maneja sockets TCP: la base tiene que ser accesible sobre HTTP.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **DynamoDB u otro NoSQL** | Modelo desacertado para este dominio. Las agregaciones financieras arbitrarias por rango de fecha exigirían desnormalizar por cada vista o mover el cálculo a la aplicación, y el TPI evalúa precisamente la corrección de ese cálculo. |
| **AWS RDS PostgreSQL** | SQL correcto, pero no escala a cero: se paga la instancia encendida siempre, lo que contradice el criterio de costo de todo el stack. Levantar un entorno por PR implicaría duplicar infraestructura. |
| **Supabase** | Muy buena opción y sugerida por la cátedra. Se descartó porque trae autenticación y capa de API propias que se solapan con Better Auth y con el Worker: se pagaría complejidad por features que no usaríamos. Tampoco ofrece branching de base equivalente. |

## Decisión

**Neon**: PostgreSQL 16 gestionado y serverless, accedido con el driver
`@neondatabase/serverless` sobre HTTP.

Tres razones concretas:

1. **Escala a cero.** El costo sigue a la demanda, igual que el cómputo.
2. **Branching de base de datos.** Cada pull request obtiene una branch con el
   esquema idéntico a producción, sin duplicar infraestructura ni mantener
   seeds a mano. Es lo que hace viable la topología de entornos de
   [02-diagramas.md](../02-diagramas.md#2-despliegue-y-entornos).
3. **Driver serverless sobre HTTP.** Es un requisito duro, no una comodidad: el
   driver `pg` tradicional abre sockets TCP y **no funciona** en Workers.

## Consecuencias

**A favor**

- SQL completo para los cálculos financieros, con `numeric` exacto para dinero.
- Un entorno aislado por PR, a costo prácticamente nulo.
- Backups automáticos y recuperación a un punto en el tiempo, gestionados.

**Lo que aceptamos pagar**

- **Latencia de reactivación.** Tras un período inactivo, la primera consulta
  paga la reactivación del endpoint. Es aceptable para este perfil de uso, pero
  hay que medirlo y no asumirlo.
- El driver HTTP **no soporta transacciones interactivas multi-statement** del
  mismo modo que una conexión TCP. Las operaciones que las requieran usan la API
  de transacción del driver o se rediseñan como un único statement.
- Límites del plan gratuito en horas de cómputo y almacenamiento; el seguimiento
  está en [05-costos-finops](../05-costos-finops.md).
