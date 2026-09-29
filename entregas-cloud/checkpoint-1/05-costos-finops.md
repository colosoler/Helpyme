# Costos y FinOps — Helpyme

> «Si la factura de AWS explota, la responsabilidad es tuya, Capitán.»
> — Clase 0, *Programación Aumentada*

El control de costos es una responsabilidad de ingeniería, no del área de
administración. Este documento estima el gasto, identifica qué lo hace crecer y
define los límites que evitan una sorpresa.

Precios relevados el 28/09/2026 en las páginas oficiales de cada proveedor.

---

## 1. Costo estimado del MVP

Escenario: **20 empresas piloto**, cada una con ~200 movimientos por mes, 15
consultas al asesor y un import de extracto mensual.

| Servicio | Plan | Costo mensual | Qué cubre |
|---|---|---|---|
| Cloudflare Workers | Paid | **USD 5,00** | 10 M requests incluidos; habilita Queues |
| Cloudflare R2 | Incluido | **USD 0,00** | 10 GB gratis; usaríamos < 100 MB |
| Cloudflare Queues | Incluido en Paid | **USD 0,00** | 1 M operaciones gratis; usaríamos ~40 |
| Neon PostgreSQL | Free | **USD 0,00** | 0,5 GB y 100 CU-hora por proyecto, suficientes con scale-to-zero |
| Vercel | Hobby | **USD 0,00** | Uso no comercial |
| API de Gemini | Capa paga, por uso | **~USD 4,60** | Ver desglose abajo |
| **Total** | | **~USD 10 / mes** | Dentro del objetivo de < USD 30 |

**El único costo fijo es el plan de Workers**, y existe porque Queues no está en
el plan gratuito. Todo lo demás sigue a la demanda.

---

## 2. El costo variable real: la API del LLM

Es la única partida que crece con el uso y la única que puede sorprender. El
asesor usa `gemini-3.8-flash` ([ADR-0010](./adr/0010-modelo-llm-gemini.md)):

| Período | Entrada (por millón de tokens) | Salida (por millón de tokens) |
|---|---|---|
| Hasta el 31/12/2026 | USD 0,75 | USD 3,75 |
| **Desde el 01/01/2027** | **USD 1,50** | **USD 7,50** |

**Las estimaciones usan el precio de 2027.** El de 2026 es una tarifa
transitoria: dimensionar con él subestimaría el costo a partir del mes siguiente
a la Defensa Final.

Una consulta al asesor son **dos llamadas** al modelo, por la arquitectura de
*function calling*:

1. El modelo recibe la pregunta y las declaraciones, y decide qué funciones
   invocar (varias en paralelo si son independientes).
2. El modelo recibe los resultados calculados y redacta la respuesta.

| Componente por turno | Tokens aprox. |
|---|---|
| System prompt + 7 declaraciones de funciones | 2 000 (se envían en las dos llamadas) |
| Historial de conversación | 1 500 (en las dos llamadas) |
| Resultados de las funciones | 800 (solo en la segunda) |
| Respuesta redactada (salida) | 400 más ~50 de la llamada a funciones |

Sumando las dos llamadas, un turno son ~8 000 tokens de entrada y ~450 de
salida:

| | Precio 2026 | Precio 2027 |
|---|---|---|
| Costo por turno | ~USD 0,008 | **~USD 0,015** |
| 20 empresas × 15 turnos = 300 turnos/mes | ~USD 2,30 | **~USD 4,60** |

Como referencia, el mismo turno con `claude-opus-5`, el modelo de
[ADR-0007](./adr/0007-modelo-llm.md), costaba ~USD 0,05: unas tres veces más
que Gemini Flash con el precio de 2027.

**Sensibilidad al razonamiento.** Los modelos Gemini 3.x razonan antes de
responder y esos tokens se facturan como salida. Si el razonamiento sumara
1 000 tokens por turno, el costo subiría a ~USD 0,023 por turno (~USD 6,90 por
mes en el escenario del MVP). Sigue dentro del objetivo, pero hay que medirlo.

### 2.1 Las palancas que lo contienen

1. **Un modelo de la gama adecuada.** El modelo no calcula: elige entre siete
   funciones y redacta sobre agregados. Pagar un modelo de gama alta por esa
   tarea era la mayor ineficiencia del diseño original, y la corrige
   [ADR-0010](./adr/0010-modelo-llm-gemini.md).
2. **Alertas por reglas, no por modelo.** Las alertas se disparan con SQL; el
   LLM solo redacta el texto de una ya disparada. Si el modelo evaluara las
   condiciones de todas las empresas cada día, el costo se multiplicaría y las
   alertas dejarían de ser reproducibles.
3. **Sin datos crudos en el prompt.** El modelo recibe agregados ya calculados,
   nunca cientos de filas de movimientos. Se decidió por corrección, pero
   además reduce los tokens de entrada en un orden de magnitud.
4. **Prefijo estable, preparado para el caché implícito.** Gemini cachea
   automáticamente los prefijos repetidos, pero **solo a partir de 4 096
   tokens** en los modelos Flash. El prefijo fijo del asesor ronda los 2 000, así
   que **hoy el caché no aplica** y la estimación no cuenta con él. Aun así, el
   orden se mantiene: lo estable primero (system prompt y declaraciones), lo
   volátil después, y ninguna marca de tiempo ni identificador por request en el
   system prompt. Si el prompt crece por encima del umbral, el descuento llega
   sin tocar código.

> **A verificar con uso real:** las estimaciones de tokens son aproximaciones de
> diseño. Antes de la Defensa Final hay que contrastarlas contra el `usage` de
> cada respuesta en producción, incluidos los tokens de razonamiento y los
> cacheados, y actualizar esta tabla con números medidos.

### 2.2 La capa gratuita no es para datos de clientes

La API de Gemini tiene capa gratuita, útil para desarrollo con datos inventados.
En los servicios sin pago, Google puede usar el contenido enviado para mejorar
sus productos: **ningún dato real de una empresa pasa por la capa gratuita**.
Producción y cualquier piloto con datos reales usan una API key de un proyecto
con facturación activa. Hay que verificar esta condición contra los términos
vigentes antes del primer piloto ([06-seguridad](./06-seguridad.md)).

---

## 3. Qué pasa si el producto crece

Mismo patrón de uso por empresa, precios de 2027.

| Escenario | Workers | Neon | Gemini | Total estimado |
|---|---|---|---|---|
| 20 empresas (MVP) | USD 5 | Free | ~USD 5 | **~USD 10** |
| 100 empresas | USD 5 | Launch, ~90 CU-hora: ~USD 10 | ~USD 23 | **~USD 38** |
| 500 empresas | USD 5 | Launch, ~240 CU-hora y 2 GB: ~USD 26 | ~USD 113 | **~USD 145** |

Neon Launch no tiene mínimo mensual: USD 0,106 por CU-hora de cómputo y
USD 0,35 por GB-mes de almacenamiento. Las horas de cómputo son un supuesto
(0,25 CU activas ~12 h/día con 100 empresas; 0,5 CU ~16 h/día con 500) y hay
que validarlas con el uso real.

El costo crece de forma aproximadamente lineal con el uso y **no hay salto de
arquitectura** en ese recorrido: es la propiedad que se buscaba al elegir
servicios con escalado a cero. No hay que rediseñar nada para pasar de 20 a 500
empresas, solo pagar más. Con cualquier volumen, **el LLM sigue siendo la
partida dominante**, y es la que hay que vigilar.

Fuera de la tabla: si el producto se comercializa, Vercel exige pasar del plan
Hobby al Pro.

---

## 4. Controles activos

| Control | Implementación |
|---|---|
| Presupuesto del LLM | Presupuesto con alertas en Google Cloud Billing sobre el proyecto de la API key. **Avisa, no corta**: el corte lo hace el rate limiting |
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

- **`claude-opus-5` como modelo del asesor** — unas tres veces más caro por
  turno que Gemini Flash, para una tarea que el diseño ya acota
  ([ADR-0010](./adr/0010-modelo-llm-gemini.md)).
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
