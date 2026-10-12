# ADR-0014 — Las filas de un import esperan en una tabla aparte hasta confirmarse

**Estado:** Aceptada · **Fecha:** 2026-10 · **Precisa a:** [ADR-0005](./0005-procesamiento-asincronico.md)

## Contexto

[ADR-0005](./0005-procesamiento-asincronico.md) definió que el consumidor de la
cola inserta los movimientos y que después el usuario los previsualiza, corrige
categorías y confirma.

Entre un paso y el otro, los movimientos ya existen. Cuentan en el dashboard y
en las siete herramientas del asesor **antes de que nadie los haya revisado**,
que es justo lo que la previsualización obligatoria venía a impedir
([01-arquitectura §7](../01-arquitectura.md)).

Al mirar el esquema aparecieron dos faltas más con la misma raíz:

- No había dónde guardar las filas que no se pudieron interpretar. La
  previsualización tiene que listarlas, y `import` solo tenía un contador y un
  texto.
- `import` no decía a qué cuenta iban los movimientos, aunque
  `movimiento.cuenta_id` es obligatorio.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Una marca `confirmado` en `movimiento`** | Cada consulta de la capa de cálculo y cada herramienta del asesor tendría que acordarse de filtrarla. Un filtro olvidado es una cifra sin revisar en una respuesta. Además, las filas sin confirmar ocuparían el lugar del índice único de `hash_dedup`: un import abandonado bloquearía volver a subir el mismo archivo. |
| **Filtrar con un `JOIN` contra `import.estado`** | El mismo riesgo de filtro olvidado, más un join en las consultas que son el 80 % de las lecturas. |
| **Guardar las filas interpretadas en R2** hasta confirmar | La previsualización pierde SQL para paginar y editar fila por fila, y confirmar obligaría a insertar miles de filas desde el request: vuelve el problema de CPU que ADR-0005 resolvió. |
| **Previsualizar en el navegador** antes de subir | Pone el parseo en un cliente no confiable. Ya descartado en ADR-0005. |

## Decisión

**El consumidor escribe en `import_fila`. Los movimientos existen recién cuando
el usuario confirma.**

```
pendiente → procesando → listo → confirmado
                 └────────→ error
```

- En `listo`, cada fila del archivo está en `import_fila`: las válidas con su
  hash y la categoría que le asignó una regla, las inválidas con el motivo.
- **Confirmar es un solo statement**: un `INSERT INTO movimiento … SELECT … FROM
  import_fila … ON CONFLICT DO NOTHING`, que copia las filas válidas y descarta
  las que ya existían.
- `import` lleva la cuenta de destino.

El invariante que queda es simple: **toda fila de `movimiento` cuenta**. No hay
filtro que recordar.

Las garantías viven en la base, no en la aplicación:

| Garantía | Cómo |
|---|---|
| Reentregar un mensaje de la cola no duplica filas | Índice único `(import_id, numero_fila)` |
| Una fila es válida o trae su error, nunca ninguna de las dos | Restricción `CHECK` |
| Confirmar dos veces no duplica movimientos | El índice único `(empresa_id, hash_dedup)` que ya existía |

Las tres tienen su test en
[`packages/db/test/migraciones.test.ts`](../../../packages/db/test/migraciones.test.ts).

## Consecuencias

**A favor**

- Ninguna cifra sale de datos sin revisar, y eso no depende de que alguien
  recuerde un filtro.
- Los errores de interpretación quedan guardados fila por fila.
- Un import abandonado es inerte: no bloquea nada ni aparece en ningún lado.
- Confirmar no consume CPU del Worker ni necesita transacciones interactivas,
  que el driver HTTP de Neon no tiene
  ([ADR-0002](./0002-persistencia-neon-postgres.md)).

**Lo que aceptamos pagar**

- Una tabla más, y cada fila válida se escribe dos veces.
- **Hay que limpiar.** Las filas de imports confirmados o abandonados quedan
  ocupando espacio. Cuándo se borran se define al implementar la confirmación
  (issue [#22]).
- **Los duplicados se conocen recién al confirmar.** Para avisar en la
  previsualización que una fila ya existía hace falta un join por `hash_dedup`,
  que el índice único resuelve barato.
- `filas_ok` pasa a significar «filas válidas interpretadas», no «movimientos
  creados».
- El flujo de [02-diagramas §3](../02-diagramas.md) y los criterios de los
  issues [#21] y [#22] cambiaron en consecuencia.

[#21]: https://github.com/colosoler/Helpyme/issues/21
[#22]: https://github.com/colosoler/Helpyme/issues/22
