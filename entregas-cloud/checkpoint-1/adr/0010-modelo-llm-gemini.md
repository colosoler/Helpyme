# ADR-0010 — Google Gemini Flash con *function calling* validado

**Estado:** Aceptada · **Fecha:** 2026-09 · **Reemplaza a:** [ADR-0007](./0007-modelo-llm.md)

## Contexto

[ADR-0007](./0007-modelo-llm.md) eligió Anthropic Claude (`claude-opus-5`) con
*function calling* estricto. La **arquitectura** de esa decisión sigue vigente
sin cambios: el modelo nunca calcula, solo elige funciones de la capa de
cálculo y redacta sobre sus resultados. Lo que se revisa es el **proveedor y el
modelo**.

ADR-0007 justificó un modelo de la gama más alta porque «la tarea es de
razonamiento». Revisado con más detalle, el razonamiento numérico ya no está en
el modelo: todas las cifras salen de SQL. Lo que le queda al modelo es elegir
entre siete funciones con contratos cerrados y redactar sobre agregados ya
calculados. Para esa tarea, un modelo de la gama más cara paga capacidad que el
diseño no usa.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Mantener `claude-opus-5`** | USD 5 / USD 25 por millón de tokens de entrada / salida: la partida variable más cara del stack, para una tarea acotada por diseño. |
| **Gemini Flash-Lite** (`gemini-3.5-flash-lite`) | Todavía más barato, pero es el escalón pensado para tareas de alto volumen y baja complejidad. Elegir bien entre siete funciones y explicar una variación financiera sin inventar es la parte del producto donde no conviene recortar. |
| **Gemini 3 Flash** (`gemini-3-flash-preview`) | Está en *preview*: sin garantías de estabilidad para un servicio en producción. |

## Decisión

**Google Gemini con el modelo estable `gemini-3.8-flash`**, a través de la API
de Gemini y el SDK `@google/genai`, manteniendo la arquitectura de *function
calling* de ADR-0007.

Los tres controles de ADR-0007 se mantienen, con sus equivalentes en Gemini:

1. **`empresa_id` no es parámetro del modelo.** No depende del proveedor: se
   inyecta desde la sesión al ejecutar la función, y un test verifica que
   ninguna declaración lo acepte.
2. **Esquemas cerrados y validados.** Las funciones se declaran con
   `parametersJsonSchema` y `additionalProperties: false`, y se invocan con
   `functionCallingConfig.mode = VALIDATED`, que valida cada llamada con
   decodificación restringida. Es el equivalente del `strict: true` de
   Anthropic. Se usa `parametersJsonSchema` y no `parameters` porque el campo
   legado solo admite un subconjunto de OpenAPI 3.0 y rechaza
   `additionalProperties`.
3. **El *system prompt* obliga a declarar la falta de datos.** Sigue siendo el
   control más débil y por eso no es el único.

Contratos en
[`packages/shared/src/advisor-tools.ts`](../../../packages/shared/src/advisor-tools.ts).

### Por qué Gemini Flash

- **Costo.** USD 0,75 / USD 3,75 por millón de tokens de entrada / salida hasta
  el 31/12/2026, y USD 1,50 / USD 7,50 desde el 01/01/2027. Aun con el precio
  de 2027 es entre 3 y 7 veces más barato que `claude-opus-5`. Detalle en
  [05-costos-finops](../05-costos-finops.md).
- **Capa gratuita** para desarrollo y pruebas, sin cargar crédito.
- **Modo `VALIDATED`**, que cubre la primitiva de la que depende el diseño.
- **Llamadas a funciones en paralelo**: «resumen + gastos por categoría», el
  caso típico, se resuelve en una sola ida y vuelta al modelo.
- *Streaming*, necesario para el chat.

## Consecuencias

**A favor**

- El costo variable baja de ~USD 15 a ~USD 2–5 por mes en el escenario del MVP.
- Se mantienen todas las garantías de ADR-0007: toda cifra es verificable contra
  el dashboard y cada turno queda auditado en `mensaje.tool_calls`.

**Lo que aceptamos pagar**

- **El caché implícito no aplica con el prompt actual.** Gemini cachea
  automáticamente, pero solo a partir de 4.096 tokens de prefijo en los modelos
  Flash, y el prefijo fijo del asesor (system prompt más siete declaraciones)
  ronda los 2.000. ADR-0007 contaba con el caché como palanca principal de
  costo; con Gemini, esa palanca pasa a ser el precio base del modelo.
- **El precio se duplica el 01/01/2027.** Las estimaciones se hacen con el
  precio de 2027 para no depender de una tarifa transitoria.
- **La capa gratuita no sirve para datos reales de clientes.** En los servicios
  sin pago, Google puede usar el contenido para mejorar sus productos. En
  producción y en cualquier prueba con datos reales se usa la capa paga.
  Hay que verificarlo contra los términos vigentes antes del primer piloto.
- **Menos capacidad de razonamiento que un modelo de gama alta.** El riesgo es
  que elija mal la función o explique flojo una variación. Se mitiga con un
  set de preguntas de evaluación con respuesta esperada, antes del
  Checkpoint 2. Si Flash no alcanza, se revisa con un ADR nuevo.
- Los modelos Gemini 3.x razonan antes de responder, y ese razonamiento se
  factura como salida. Hay que medir los tokens reales en el `usage` de cada
  respuesta y ajustar el nivel de razonamiento si infla el costo.
- Dependencia de un proveedor externo, igual que antes. La orquestación sigue
  detrás de una interfaz propia: este mismo cambio de proveedor no tocó la capa
  de cálculo.
