# ADR-0012 — La empresa es la organización de Better Auth

**Estado:** Aceptada · **Fecha:** 2026-10 · **Precisa a:** [ADR-0008](./0008-autenticacion-better-auth.md)

## Contexto

[ADR-0008](./0008-autenticacion-better-auth.md) adoptó el plugin de
organizaciones de Better Auth con el argumento de que «una organización es una
empresa». El esquema del Checkpoint 1 modeló otra cosa: `usuario.empresa_id` y
`usuario.rol`, es decir, un usuario atado a una sola empresa por una columna
propia.

El equipo resolvió la contradicción el 28/09
([`AI-DECISIONS.md`](../../../AI-DECISIONS.md)): se elimina `usuario.empresa_id`
y la relación la gestiona la membresía de Better Auth. Quedaba sin definir cómo
se relacionan exactamente sus tablas con `empresa` y `usuario`, qué tipo de
identificador usan y de dónde sale el `empresaId` de cada request. Sin eso no
se puede escribir ni la migración ni el middleware.

## Alternativas evaluadas

| Opción | Por qué se descartó |
|---|---|
| **Tablas por defecto de Better Auth** (`organization`, `user`) y una `empresa` que referencia a `organization` | Dos tablas para el mismo concepto, en relación uno a uno que hay que mantener sincronizada, y una traducción de `organization_id` a `empresa_id` en cada request. Es justo lo que ADR-0008 quería evitar. |
| **Reemplazar `empresa` por `organization`** y renombrar las claves foráneas | Reescribe todo el esquema y la documentación por una cuestión de nombres. El dominio habla de empresas. |
| **Mantener `usuario.empresa_id` además de la membresía** | La misma relación guardada en dos lugares, con dos fuentes de verdad. Descartada por el equipo el 28/09. |

## Decisión

**Las tablas del dominio son las tablas de Better Auth**, mapeadas con sus
opciones `modelName` y `fields`.

| Modelo de Better Auth | Tabla | Notas |
|---|---|---|
| `organization` | `empresa` | La misma fila y el mismo `id`: toda clave foránea `empresa_id` sigue siendo válida |
| `user` | `usuario` | Sin `empresa_id` ni `rol` |
| `member` | `membresia` | Usuario, empresa y rol dentro de esa empresa |

1. **Los identificadores siguen siendo `uuid` generados por PostgreSQL**, con
   la opción `advanced.database.generateId: "uuid"`.
2. **El rol vive en la membresía**, no en el usuario. Se usan `owner` y
   `member`; el rol `admin` que trae Better Auth queda sin usar en el MVP.
3. **El `empresaId` del request es la organización activa de la sesión.**
   Better Auth la deja vacía después del login, así que se fija al crear la
   sesión con la membresía del usuario. El middleware verifica que esa
   membresía siga existiendo antes de confiar en ella.
4. **El registro crea la empresa y la membresía `owner`.** Better Auth no lo
   hace solo: es código de la aplicación.
5. Las tablas restantes (sesión, cuenta de acceso, verificación, invitación)
   se generan con la CLI de Better Auth en el issue [#14]. La de cuentas de
   acceso no puede llamarse `cuenta`: ese nombre ya es la cuenta bancaria.

El modelo admite que un usuario pertenezca a varias empresas, pero el MVP
asume una sola: multi-empresa por usuario está fuera del alcance
([01-arquitectura §5.2](../01-arquitectura.md)).

## Consecuencias

**A favor**

- Ninguna tabla de negocio cambia su `empresa_id`.
- No hay capa de traducción entre identidad y dominio, que es donde suelen
  aparecer los errores de autorización.
- Una sola fuente de verdad para «a qué empresa pertenece este usuario».

**Lo que aceptamos pagar**

- `empresa` y `usuario` reciben columnas que Better Auth exige y el producto no
  usa. Cuáles son lo determina su CLI en el issue [#14].
- El mapeo de nombres acopla el esquema a la versión de la librería: cada
  actualización mayor de Better Auth hay que probarla contra la migración.
- **El borrado lógico es nuestro.** Better Auth no conoce `deleted_at`: el
  middleware tiene que rechazar la sesión de un usuario o de una empresa dados
  de baja.
- **A validar en el spike del issue [#14]**, antes de escribir más código: que el
  mapeo funcione con el adaptador de Drizzle tal como está descrito, y si el
  adaptador necesita transacciones interactivas, que el driver HTTP de Neon no
  tiene ([ADR-0002](./0002-persistencia-neon-postgres.md)).

[#14]: https://github.com/colosoler/Helpyme/issues/14
