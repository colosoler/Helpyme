# Observabilidad — Helpyme

El TPI la evalúa explícitamente: *«implementación de métricas, logs
centralizados y estrategias de monitoreo para garantizar que el equipo conozca
el estado de salud de la solución en tiempo real»*.

En una arquitectura serverless no hay un servidor al que entrar a mirar un log.
Si la telemetría no se diseñó, no existe.

---

## 1. Health checks

| Endpoint | Responde | Para qué |
|---|---|---|
| `GET /health` | *Liveness*: el Worker está vivo | Chequeo barato, sin dependencias externas |
| `GET /ready` | *Readiness*: incluye un `SELECT 1` real contra la base | Verifica que las dependencias respondan |

La distinción importa: `/health` puede responder `200` mientras la base está
caída. Un solo endpoint que mezcle ambas cosas o miente sobre el estado, o hace
una consulta a la base en cada ping de monitoreo.

`/ready` devuelve `503` si la base no responde, con el detalle por dependencia y
la latencia medida.

---

## 2. Logs estructurados

Todo log es **JSON en una línea**, nunca texto libre. Un log en prosa no se
filtra ni se agrega; uno estructurado sí.

```json
{
  "level": "info",
  "requestId": "01JQ8ZK3...",
  "method": "POST",
  "path": "/v1/imports",
  "status": 202,
  "durationMs": 43,
  "empresaId": "a3f1...",
  "timestamp": "2026-09-28T14:23:11.482Z"
}
```

**Cada request lleva un `requestId`** generado en el middleware y devuelto en el
header `X-Request-Id`. Con él se sigue una operación desde el endpoint hasta el
consumidor de la cola: cuando un usuario reporta «no me cargó el extracto», ese
identificador es la diferencia entre reconstruir el caso en minutos o no poder
hacerlo.

### 2.1 Qué nunca se loguea

- Contraseñas, tokens o secretos.
- El contenido de los movimientos financieros (montos, descripciones).
- Datos personales del usuario más allá del identificador.

Se loguean **identificadores y metadatos**, no datos de negocio. `empresaId` sí,
porque es necesario para diagnosticar y no revela información financiera por sí
mismo.

### 2.2 Centralización

Cloudflare **Workers Logs** concentra la salida de los tres puntos de ejecución
—API, consumidor de cola y cron— con retención y consultas por campo. Al ser
todos Workers de la misma cuenta, no hace falta un agregador externo en la etapa
de MVP.

---

## 3. Métricas

| Métrica | Por qué importa |
|---|---|
| Requests por minuto, por ruta | Tráfico y detección de picos anómalos |
| Latencia p50 / p95 / p99 | El objetivo de p95 < 300 ms se verifica, no se supone |
| Tasa de error 5xx | Señal primaria de salud |
| Tiempo de CPU por invocación | **La restricción más dura del stack**: acercarse al límite anticipa fallos |
| Profundidad de la cola y mensajes en DLQ | Un mensaje en DLQ es un import que le falló a un usuario real |
| Duración del procesamiento de un import | Regresión temprana del parser |
| Latencia y tokens por llamada al LLM | Alimenta el seguimiento de costos de [05-costos-finops](./05-costos-finops.md) |
| Consultas lentas en Postgres | Detecta índices faltantes antes de que se noten |

Cloudflare Analytics cubre las de plataforma; las de negocio se emiten como logs
estructurados y se agregan por consulta.

---

## 4. Alertas operativas

Distintas de las alertas financieras del producto: estas le avisan **al equipo**.

| Condición | Severidad | Acción |
|---|---|---|
| Tasa de 5xx > 1 % en 5 minutos | Alta | Investigar de inmediato; considerar rollback |
| Cualquier mensaje en la DLQ | Alta | Un usuario tiene un import roto; revisar la causa |
| `/ready` falla 3 veces seguidas | Crítica | Base inaccesible; revisar estado de Neon |
| p95 > 1 s sostenido 10 minutos | Media | Investigar en el día |
| Gasto de API del LLM > 150 % del presupuesto | Media | Revisar posible bucle de reintentos |
| CPU cerca del límite de invocación | Media | Refactorizar antes de que empiece a fallar |

---

## 5. Trazabilidad de la IA

Además de los logs, cada turno del asesor persiste en `mensaje.tool_calls` **qué
funciones invocó el modelo y con qué argumentos**
([03-modelo-datos](./03-modelo-datos.md#34-mensajetool_calls-en-jsonb)).

Esto permite responder la pregunta que más importa en este producto: *¿de dónde
salió este número que el asistente le mostró al usuario?* La respuesta es una
fila en la base, no una reconstrucción.

Es la contracara en tiempo de ejecución de [`AI-DECISIONS.md`](../../AI-DECISIONS.md):
uno audita la IA que escribió el código, el otro la IA que le responde al
usuario.

---

## 6. Estado y pendientes

| Ítem | Estado |
|---|---|
| `/health` y `/ready` con chequeo real de dependencias | Diseñado, implementación pendiente |
| Middleware de `requestId` y logs estructurados | Diseñado, implementación pendiente |
| Manejador de errores centralizado que nunca filtra el stack al cliente | Diseñado, implementación pendiente |
| Dashboards de Cloudflare Analytics | Checkpoint 2 |
| Alertas configuradas con notificación al equipo | Checkpoint 2 |
| Métricas de negocio (imports, turnos de chat) | Checkpoint 2 |
| Monitoreo sintético externo del endpoint público | Defensa Final |
