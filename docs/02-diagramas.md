# Diagramas — Helpyme

Complementa el diagrama cloud principal de
[01-arquitectura.md](./01-arquitectura.md). Todos los diagramas son Mermaid, así
que se renderizan directo en GitHub y viven versionados junto al código: si la
arquitectura cambia, el diagrama cambia en el mismo pull request.

---

## 1. Contexto del sistema (C4 nivel 1)

Quiénes usan Helpyme y con qué sistemas externos habla.

```mermaid
flowchart TB
    dueno(["Dueno de PyME<br/>usuario primario"])
    contador(["Contador externo<br/>usuario secundario, post-MVP"])

    helpyme["<b>Helpyme</b><br/>SaaS de consolidacion,<br/>diagnostico y asesoramiento<br/>financiero"]

    mp["Mercado Pago<br/>OAuth + API de pagos"]
    anthropic["Anthropic API<br/>redaccion sobre datos"]
    banco["Banco<br/>archivo de extracto<br/>descargado por el usuario"]

    dueno -->|"consulta, carga datos,<br/>pregunta en castellano"| helpyme
    contador -.->|"lectura de reportes<br/>(v1.1)"| helpyme
    helpyme -->|"importa cobros<br/>automaticamente"| mp
    helpyme -->|"pide redaccion sobre<br/>cifras ya calculadas"| anthropic
    banco -.->|"CSV / XLSX subido<br/>manualmente"| dueno

    classDef sys fill:#1f6feb,stroke:#0b3a80,color:#fff
    classDef ext fill:#6e7681,stroke:#30363d,color:#fff
    class helpyme sys
    class mp,anthropic,banco ext
```

**Nota de diseño:** el banco aparece con línea punteada y pasando *por el
usuario*. No hay integración directa —es la decisión de alcance más importante
del MVP y está justificada en [ADR-0009](./adr/0009-sin-agregacion-bancaria.md).

---

## 2. Despliegue y entornos

```mermaid
flowchart LR
    subgraph dev["Local (desarrollo)"]
        d1["next dev<br/>:3000"]
        d2["wrangler dev<br/>:8787"]
        d3[("Neon branch<br/>por developer")]
        d1 --> d2 --> d3
    end

    subgraph prev["Preview — por pull request"]
        p1["Vercel Preview<br/>URL efimera"]
        p2["Worker env=preview"]
        p3[("Neon branch<br/>efimera del PR")]
        p1 --> p2 --> p3
    end

    subgraph prod["Produccion"]
        r1["Vercel Production"]
        r2["Worker env=production"]
        r3[("Neon main branch")]
        r1 --> r2 --> r3
    end

    pr["Pull Request"] -->|"CI: lint, typecheck, test"| prev
    prev -->|"merge a main<br/>tras code review"| prod

    classDef e1 fill:#238636,stroke:#0f5323,color:#fff
    classDef e2 fill:#9e6a03,stroke:#5a3c02,color:#fff
    classDef e3 fill:#8250df,stroke:#4c2889,color:#fff
    class d1,d2,d3 e1
    class p1,p2,p3 e2
    class r1,r2,r3 e3
```

El **branching de base de datos de Neon** es lo que hace viable este esquema:
cada PR obtiene una copia del esquema de producción sin duplicar
infraestructura ni mantener seeds a mano. Es la razón principal de
[ADR-0002](./adr/0002-persistencia-neon-postgres.md).

---

## 3. Ingesta asíncrona de un extracto

El flujo que justifica la existencia de la cola. El endpoint HTTP **no parsea
nada**: guarda y encola.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant N as Next.js
    participant W as Worker API
    participant R as R2
    participant Q as Queue
    participant C as Consumer
    participant DB as PostgreSQL

    U->>N: sube extracto.csv
    N->>W: POST /v1/imports
    W->>R: PUT objeto original
    W->>DB: INSERT import (estado=pendiente)
    W->>Q: send({importId, r2Key})
    W-->>N: 202 Accepted + importId
    N-->>U: "Procesando..."

    Note over W,C: El request HTTP ya termino.<br/>Nada pesado corrio en el.

    Q->>C: entrega el mensaje
    C->>R: GET objeto
    C->>C: parsea, normaliza,<br/>calcula hash_dedup,<br/>aplica reglas de categoria
    C->>DB: INSERT movimientos (ON CONFLICT DO NOTHING)
    C->>DB: UPDATE import (estado=listo, filas_ok, filas_error)

    loop polling cada 2s
        N->>W: GET /v1/imports/:id
        W->>DB: SELECT estado
        W-->>N: estado
    end

    N-->>U: previsualizacion para revisar
    U->>N: corrige categorias y confirma
    N->>W: POST /v1/imports/:id/confirm
    W->>DB: aplica correcciones<br/>+ INSERT regla_categoria
```

Puntos de diseño que importan:

- **`202 Accepted`, no `200`.** La API dice «lo recibí», no «lo terminé». El
  contrato con el frontend es explícito sobre la asincronía.
- **`ON CONFLICT DO NOTHING`** sobre el índice único de `hash_dedup`: la
  deduplicación de extractos con períodos solapados la resuelve la base, no un
  `SELECT` previo que sería una condición de carrera.
- **Reintentos y DLQ.** Si el consumer falla, Queues reintenta; agotados los
  intentos, el mensaje va a una *dead letter queue* y el import queda en estado
  `error` con el detalle visible para el usuario.
- **La corrección del usuario genera una regla**, no solo arregla una fila. Es
  lo que hace que el segundo import cueste menos trabajo que el primero.

---

## 4. Recálculo diario de alertas (cron)

Sin procesos residentes, la tarea programada es un *cron trigger* del Worker.

```mermaid
flowchart TB
    t["Cron Trigger<br/>06:00 ART / 09:00 UTC"] --> loop

    subgraph loop["Por cada empresa activa"]
        r1{"gasto del mes ><br/>promedio 3 meses x 1,25"}
        r2{"vencimiento<br/>en menos de 7 dias"}
        r3{"proyeccion de saldo<br/>negativa en 30 dias"}
    end

    r1 -->|si| gen["INSERT alerta<br/>tipo, severidad, payload"]
    r2 -->|si| gen
    r3 -->|si| gen
    r1 -->|no| skip["sin alerta"]
    r2 -->|no| skip
    r3 -->|no| skip

    gen --> redact["El LLM redacta SOLO<br/>el texto de una alerta<br/>ya disparada por regla"]
    redact --> ui["Bandeja de alertas<br/>en el dashboard"]

    classDef rule fill:#bf8700,stroke:#7a5600,color:#fff
    classDef ai fill:#8250df,stroke:#4c2889,color:#fff
    class r1,r2,r3 rule
    class redact ai
```

**La condición la evalúa SQL; el LLM solo redacta.** Si el modelo decidiera
*cuándo* alertar, cada corrida costaría dinero y las alertas no serían
reproducibles ni auditables. Así, dos corridas sobre los mismos datos disparan
exactamente las mismas alertas.

---

## 5. Aislamiento multi-tenant

Cómo se garantiza que una empresa no vea datos de otra.

```mermaid
flowchart TB
    req["Request entrante"] --> auth["Middleware de auth<br/>valida sesion (Better Auth)"]
    auth -->|"sesion invalida"| deny["401 Unauthorized"]
    auth -->|"sesion valida"| ctx["Inyecta empresa_id<br/>en el contexto del request"]

    ctx --> handler["Handler de ruta"]
    handler --> repo["Capa de acceso a datos"]
    repo --> q["Toda consulta lleva<br/>WHERE empresa_id = ctx.empresaId"]
    q --> db[("PostgreSQL")]

    ctx -.->|"NUNCA se toma<br/>del body ni del query"| warn["Parametro de cliente<br/>= vector de fuga"]

    classDef bad fill:#da3633,stroke:#8b1a17,color:#fff
    classDef good fill:#238636,stroke:#0f5323,color:#fff
    class deny,warn bad
    class ctx,q good
```

`empresa_id` se toma **siempre de la sesión del servidor y nunca de un parámetro
del cliente**. Un `empresaId` que viaja en el body o en el query string es un
IDOR esperando a pasar. El detalle completo, incluidos los tests que lo
verifican, está en [06-seguridad.md](./06-seguridad.md).
