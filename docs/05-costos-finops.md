# Costos y FinOps — Helpyme

> «Si la factura de AWS explota, la responsabilidad es tuya, Capitán.»
> — Clase 0, *Programación Aumentada*

El control de costos es una responsabilidad de ingeniería, no del área de
administración. Este documento estima el gasto, identifica qué lo hace crecer y
define los límites que evitan una sorpresa.

---

## 1. Costo estimado del MVP

Escenario: **20 empresas piloto**, cada una con ~200 movimientos por mes, 15
consultas al asesor y un import de extracto mensual.

| Servicio | Plan | Costo mensual | Qué cubre |
|---|---|---|---|
| Cloudflare Workers | Paid | **USD 5,00** | 10 M requests incluidos; habilita Queues |
| Cloudflare R2 | Incluido | **USD 0,00** | 10 GB gratis; usaríamos < 100 MB |
| Cloudflare Queues | Incluido en Paid | **USD 0,00** | 1 M operaciones gratis; usaríamos ~40 |
| Neon PostgreSQL | Free | **USD 0,00** | 0,5 GB y horas de cómputo suficientes con scale-to-zero |
| Vercel | Hobby | **USD 0,00** | Uso no comercial |
| Anthropic API | Uso | **~USD 15,00** | Ver desglose abajo |
| **Total** | | **~USD 20 / mes** | Dentro del objetivo de < USD 30 |

**El único costo fijo es el plan de Workers**, y existe porque Queues no está en
el plan gratuito. Todo lo demás sigue a la demanda.

---

## 2. El costo variable real: la API del LLM

Es la única partida que crece con el uso y la única que puede sorprender.
Precios vigentes de `claude-opus-5`: **USD 5 por millón de tokens de entrada** y
**USD 25 por millón de tokens de salida**.

Una consulta al asesor son **dos llamadas** al modelo, por la arquitectura de
*function calling*:

1. El modelo recibe la pregunta y los esquemas, y decide qué herramientas usar.
2. El modelo recibe los resultados calculados y redacta la respuesta.

| Componente por turno | Tokens aprox. |
|---|---|
| System prompt + 7 esquemas de herramientas | 2 000 (idénticos siempre → cacheables) |
| Historial de conversación | 1 500 |
| Resultados de las herramientas | 800 |
| Respuesta redactada (salida) | 400 |

Sin caché, sumando las dos llamadas, un turno ronda **USD 0,05**.
20 empresas × 15 turnos = 300 turnos ≈ **USD 15/mes**.

### 2.1 Las tres palancas que lo contienen

1. **Prompt caching.** El system prompt y los siete esquemas son **byte a byte
   idénticos en cada turno**: es el caso ideal para el caché de prefijo. Como el
   caché coincide por prefijo, el orden importa —lo estable primero, lo volátil
   después— y por eso ninguna marca de tiempo ni identificador por request entra
   en el system prompt. Es la palanca de mayor impacto y la primera a
   implementar.
2. **Alertas por reglas, no por modelo.** Las alertas se disparan con SQL; el
   LLM solo redacta el texto de una ya disparada. Si el modelo evaluara las
   condiciones de las 20 empresas cada día, el costo se multiplicaría y las
   alertas dejarían de ser reproducibles.
3. **Sin datos crudos en el prompt.** El modelo recibe agregados ya calculados,
   nunca cientos de filas de movimientos. Esta decisión de arquitectura
   ([ADR-0007](./adr/0007-modelo-llm.md)) se tomó por corrección, pero además
   reduce los tokens de entrada en un orden de magnitud.

> **A verificar con uso real:** las estimaciones de tokens son aproximaciones de
> diseño. Antes de la Defensa Final hay que contrastarlas contra
> `response.usage` en producción y actualizar esta tabla con números medidos.

---

## 3. Qué pasa si el producto crece

| Escenario | Cambia | Costo estimado |
|---|---|---|
| 20 empresas (MVP) | — | ~USD 20 |
| 100 empresas | Neon supera el plan Free | ~USD 60 |
| 500 empresas | Neon Scale + más consumo de API | ~USD 250 |

El costo crece de forma aproximadamente lineal con el uso y **no hay salto de
arquitectura** en ese recorrido: es la propiedad que se buscaba al elegir
servicios con escalado a cero. No hay que rediseñar nada para pasar de 20 a 500
empresas, solo pagar más.

---

## 4. Controles activos

| Control | Implementación |
|---|---|
| Límite de gasto en Anthropic | Tope mensual configurado en la consola de la organización |
| Alertas de facturación | Notificación de Cloudflare y Neon al superar un umbral |
| Límite de tamaño de archivo | 10 MB por import, validado en el endpoint antes de escribir en R2 |
| Rate limiting del chat | Tope de consultas por empresa y por día, para acotar el peor caso |
| Retención de archivos | Política de borrado de originales de empresas dadas de baja |
| Revisión mensual | Punto fijo en la reunión de equipo: comparar gasto real contra esta tabla |

**El rate limiting del chat no es una restricción de producto, es un fusible.**
Sin él, un bucle de reintentos en el frontend puede generar una factura de tres
dígitos en una noche sin que nadie se entere hasta el resumen.

---

## 5. Lo que se descartó por costo

Registrado acá porque las decisiones económicas también hay que poder
defenderlas:

- **RDS en lugar de Neon** — una instancia encendida 24/7 cuesta más que todo el
  resto del stack junto, para una utilización cercana a cero
  ([ADR-0002](./adr/0002-persistencia-neon-postgres.md)).
- **Auth0 o Clerk** — el precio por usuario activo mensual escala mal para un
  SaaS de PyMEs con margen chico
  ([ADR-0008](./adr/0008-autenticacion-better-auth.md)).
- **S3 en lugar de R2** — el costo de egreso penaliza justamente el flujo de
  reprocesar un extracto ([ADR-0004](./adr/0004-storage-r2.md)).
- **Pasarle datos crudos al LLM** — descartado por corrección, pero también
  habría multiplicado los tokens de entrada por diez.
