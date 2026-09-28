# Proceso de equipo — Helpyme

Cómo trabaja el equipo. El TPI evalúa el *cómo* además del *qué*: el historial
de Git, los PR cruzados y el tablero son la evidencia de la participación
individual.

---

## 1. Flujo de una tarea

```
Issue en el tablero → rama → commits chicos → PR → review de otro integrante → merge a main
```

1. Toda tarea nace como **issue** en el tablero. Sin issue no hay rama.
2. Se toma de la columna **Listo** y se pasa a **En curso** respetando el
   límite de WIP (§2).
3. Rama desde `main` con prefijo de tipo: `feat/importar-extracto`,
   `fix/cors-preview`, `docs/adr-0010`.
4. Commits chicos y frecuentes con *Conventional Commits* (§3).
5. PR hacia `main` usando la plantilla. El issue se enlaza con `Closes #N`.
6. **Review de un integrante distinto al autor**, con el CI en verde.
7. *Squash* o *merge*, según convenga al historial; se borra la rama.

**Push directo a `main`: prohibido**, y lo impide la protección de rama (§4).

---

## 2. Tablero Kanban

GitHub Projects, vista *Board*, vinculado al repositorio.

| Columna | Qué significa | Límite de WIP |
|---|---|---|
| **Backlog** | Ideas y tareas sin refinar | — |
| **Listo** | Refinada, con criterio de aceptación, se puede empezar | — |
| **En curso** | Alguien la está trabajando | **1 por integrante** |
| **En revisión** | PR abierto esperando review | **3 en total** |
| **Hecho** | Mergeada a `main` | — |

**Por qué estos límites.** Uno por persona en *En curso* obliga a terminar antes
de empezar otra cosa. El tope en *En revisión* es la señal de cuello de botella:
si hay tres PR esperando, nadie toma trabajo nuevo hasta revisar uno. Revisar es
trabajo, no una interrupción.

Campos del proyecto: **Hito** (Checkpoint 2, Defensa Final), **Tipo** (feat,
fix, docs, chore) y **Tamaño** (S, M, L). Una tarea L se parte antes de pasar a
*Listo*.

### 2.1 Cómo crearlo

1. En GitHub: perfil u organización → **Projects** → **New project** →
   plantilla **Board**. Nombre: `Helpyme`.
2. Renombrar las columnas del campo *Status* para que coincidan con la tabla y
   agregar *Backlog* y *En revisión*.
3. En cada columna → menú `⋯` → **Set limit**: *En curso* = cantidad de
   integrantes, *En revisión* = 3. GitHub muestra la columna en rojo al
   superarlo.
4. **Settings** del proyecto → agregar los campos *Hito* (selección única) y
   *Tamaño* (selección única). Agregar a cada integrante como colaborador.
5. En el repositorio → pestaña **Projects** → **Link a project** → `Helpyme`.
6. **Workflows** del proyecto: activar *Item added to project → Backlog*,
   *Pull request merged → Hecho* e *Item closed → Hecho*.
7. Cargar los issues del Checkpoint 2 (F1 a F11 de
   [01-arquitectura](../entregas-cloud/checkpoint-1/01-arquitectura.md#51-dentro-del-alcance)
   y los pendientes de seguridad y observabilidad) y asignarlos.

---

## 3. Commits

*Conventional Commits*, obligatorio por consigna:

```
<tipo>(<ámbito opcional>): <descripción en imperativo, minúscula>
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Solo documentación |
| `test` | Tests nuevos o corregidos |
| `refactor` | Cambio interno sin cambiar comportamiento |
| `ci` | Workflows de GitHub Actions |
| `chore` | Mantenimiento, dependencias, configuración |

Ámbitos habituales: `api`, `web`, `db`, `shared`.

**Commits chicos y frecuentes.** La consigna no acepta grandes commits de último
momento y audita frecuencia y autoría: cada integrante commitea con su propia
cuenta lo que hizo.

---

## 4. Protección de `main`

En el repositorio → **Settings** → **Branches** → **Add branch ruleset**, sobre
`main`:

- *Require a pull request before merging*, con **1 aprobación**.
- *Dismiss stale approvals when new commits are pushed*.
- *Require status checks to pass*: seleccionar **Typecheck, tests y build**.
- *Block force pushes*.

---

## 5. Definición de terminado

Una tarea está en **Hecho** cuando:

- [ ] Está mergeada a `main` por PR revisado por otro integrante.
- [ ] El CI pasó.
- [ ] Tiene tests si toca lógica de cálculo, aislamiento o seguridad.
- [ ] Si cambió el esquema, la migración está commiteada.
- [ ] Si usó IA, tiene su entrada en [`AI-DECISIONS.md`](../AI-DECISIONS.md) con
      la validación humana escrita por quien la revisó.
- [ ] Si cambió una decisión de arquitectura, hay un ADR nuevo.
