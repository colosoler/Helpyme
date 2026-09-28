# ADR-0007 — Anthropic Claude con *function calling* estricto

**Estado:** Aceptada · **Fecha:** 2026-09

## Contexto

El TPI exige integrar IA como diferenciador de negocio, y en Helpyme la IA **es**
el producto: sin la capa conversacional queda un dashboard más.

Pero el dominio impone una restricción que domina todo lo demás: **una cifra
inventada destruye la confianza de forma permanente.** Si el asistente le dice a
un dueño de PyME que ganó 400.000 pesos y el número está mal, no hay recuperación
posible —ni del usuario, ni de la nota en la defensa.

El riesgo, entonces, no es «el modelo se equivoca a veces». Es «el modelo produce
una cifra plausible que nadie puede distinguir de una real».

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Pasarle los datos crudos al modelo y pedirle el análisis** | El modelo haría aritmética sobre cientos de filas. Es exactamente el modo de falla que hay que evitar, y encima cuesta muchísimos tokens de entrada. |
| **Text-to-SQL**: el modelo genera la consulta | Superficie de ataque inaceptable en datos financieros multi-tenant. Un SQL generado puede omitir el filtro por `empresa_id` y filtrar datos de otra empresa. |
| **Sin LLM, solo reglas y dashboard** | Cumpliría el resto del TPI pero elimina el diferencial del producto y no satisface el requisito de IA. |

## Decisión

**Anthropic Claude (`claude-opus-5`) con arquitectura de *function calling*
estricto.** El modelo **nunca calcula**: elige qué funciones invocar y redacta
sobre los resultados que le devuelve el backend.

Las siete herramientas del MVP están en
[01-arquitectura.md](../01-arquitectura.md#33-capa-de-ia--function-calling-estricto);
los contratos, en
[`packages/shared/src/advisor-tools.ts`](../../../packages/shared/src/advisor-tools.ts).

Tres controles independientes, en capas distintas:

1. **`empresa_id` no es parámetro del modelo.** Se inyecta desde la sesión al
   ejecutar la función. El modelo no tiene forma de *expresar* una consulta a
   otra empresa: la fuga no está mitigada, está fuera del espacio de acciones
   posibles. Este control es el que reemplaza al text-to-SQL descartado.
2. **`strict: true`** con `additionalProperties: false` en cada esquema, para
   que el input valide exactamente contra el contrato.
3. **El *system prompt* obliga a declarar la falta de datos** en lugar de
   estimarla. Es el control más débil de los tres —es una instrucción, no una
   restricción— y por eso es el último, no el único.

**Las alertas se generan por reglas SQL, no por el modelo.** El LLM solo redacta
el texto de una alerta ya disparada: así son reproducibles, auditables y de
costo fijo.

### Por qué Claude y por qué `claude-opus-5`

- Function calling con esquemas estrictos, que es la primitiva sobre la que se
  apoya todo el diseño.
- Streaming, necesario para que el chat no quede congelado varios segundos.
- *Prompt caching*, que es lo que hace sostenible el costo: el system prompt y
  los esquemas de las siete herramientas son idénticos en cada turno.
- Se usa `claude-opus-5` porque la tarea —elegir la combinación correcta de
  herramientas y explicar una variación financiera sin inventar— es de
  razonamiento, no de redacción. Ver el costo estimado en
  [05-costos-finops](../05-costos-finops.md); si la medición con uso real
  mostrara que un modelo menor alcanza, se revisará con un ADR nuevo.

## Consecuencias

**A favor**

- **Toda cifra que el usuario ve es verificable contra el dashboard**, porque
  ambos salen de la misma capa de cálculo determinística.
- Cada turno queda auditado: `mensaje.tool_calls` guarda qué se invocó y con qué
  argumentos.
- Costo acotado y predecible gracias al caché y a las alertas por reglas.

**Lo que aceptamos pagar**

- **El asistente solo puede responder lo que las siete herramientas permiten.**
  Una pregunta fuera de ese conjunto obtiene un «no tengo esa información». Es
  la limitación deliberada: preferimos un asistente acotado y confiable a uno
  amplio que a veces miente.
- Agregar una capacidad de análisis implica escribir una función nueva, no
  ajustar un prompt.
- Costo variable por uso y dependencia de un proveedor externo. La capa de
  orquestación se mantiene aislada detrás de una interfaz propia para poder
  cambiar de proveedor sin tocar la lógica de negocio.
