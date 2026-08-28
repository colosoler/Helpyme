# Seguridad — Helpyme

Helpyme maneja el dato más sensible que tiene una PyME después de sus
credenciales: **cuánta plata entra, cuánta sale y a quién le debe**. Las
decisiones de este documento parten de ahí.

---

## 1. Aislamiento multi-tenant

Es el control más importante del sistema. Una fuga entre empresas no es un bug:
es el fin del producto.

### 1.1 La regla

> **`empresa_id` se toma siempre de la sesión del servidor. Nunca de un
> parámetro del cliente.**

Un `empresaId` que viaja en el body, en el query string o en la URL es un IDOR
esperando a ocurrir. En Helpyme, el middleware de autenticación resuelve la
empresa a partir de la sesión y la inyecta en el contexto del request; los
handlers **no pueden** recibirla de otro lado.

### 1.2 Las cuatro capas

| Capa | Control |
|---|---|
| **Esquema** | Toda tabla de negocio lleva `empresa_id` con clave foránea |
| **Sesión** | El middleware inyecta `empresaId` en el contexto; sin sesión válida no hay contexto |
| **Consulta** | Toda consulta filtra por `empresa_id`; la capa de acceso a datos no expone un método sin ese filtro |
| **Herramientas del LLM** | `empresa_id` no es parámetro de ninguna función expuesta al modelo: se inyecta al ejecutarla |

La cuarta capa merece énfasis. El modelo **no tiene forma de expresar** una
consulta a otra empresa: no es que esté prohibido, es que no está en su espacio
de acciones. Por eso se descartó text-to-SQL, donde una consulta generada sí
podría omitir el filtro ([ADR-0007](./adr/0007-modelo-llm.md)).

### 1.3 Verificación

El aislamiento se prueba, no se asume. Tests obligatorios antes del Checkpoint 2:

- Un usuario de la empresa A pide un recurso de la empresa B por id → `404`, no
  `403` (un `403` confirma que el recurso existe).
- Un `empresaId` inyectado en el body es ignorado por completo.
- Cada herramienta del asesor, invocada con sesión de A, jamás devuelve filas
  de B.
- Una URL firmada de R2 emitida para A no sirve para un objeto de B.

---

## 2. Autenticación y autorización

- **Better Auth** gestiona sesiones, usuarios y organizaciones
  ([ADR-0008](./adr/0008-autenticacion-better-auth.md)). No escribimos hashing
  de contraseñas ni manejo de sesiones propio.
- Cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- Roles dentro de la empresa: `owner` y `member`. El MVP distingue quién puede
  invitar usuarios y desconectar integraciones.
- **CORS con lista blanca explícita** de orígenes. Nunca `*`: el frontend vive
  en otro dominio ([ADR-0006](./adr/0006-frontend-vercel.md)) y un comodín con
  credenciales es una vulnerabilidad, no una comodidad de desarrollo.

---

## 3. Datos financieros y credenciales de terceros

**El sistema nunca pide ni almacena credenciales bancarias.** Es una decisión de
arquitectura, no una promesa: no existe el campo donde guardarlas. Es la
consecuencia de seguridad de [ADR-0009](./adr/0009-sin-agregacion-bancaria.md) y
elimina de raíz la peor clase de incidente posible en este producto.

| Dato | Tratamiento |
|---|---|
| Credenciales bancarias | **No se piden nunca.** No existen en el modelo de datos |
| Token de Mercado Pago | OAuth oficial; el token se guarda cifrado y se puede revocar desde la app |
| Archivos subidos | R2 privado; acceso solo por URL firmada de vida corta emitida tras verificar propiedad |
| Contraseñas | Hash gestionado por Better Auth; jamás en logs |
| Secretos de la aplicación | Cloudflare Secrets, cifrados en reposo y no legibles desde la consola |

**Los buckets de R2 nunca son públicos.** Cada descarga pasa por el Worker, que
verifica que el objeto pertenezca a la empresa de la sesión antes de firmar una
URL de minutos de vida.

---

## 4. Higiene de secretos en el repositorio

- `.env`, `.dev.vars` y variantes están en [`.gitignore`](../.gitignore) desde el
  primer commit. La plantilla versionada es `.env.example`, **siempre con
  valores vacíos**.
- Escaneo de secretos activo en el repositorio de GitHub.
- **Si un secreto se filtra, se rota inmediatamente.** Borrarlo en un commit
  posterior no sirve: sigue en el historial y hay que asumirlo comprometido.

---

## 5. Validación de entrada

| Superficie | Control |
|---|---|
| Cuerpos de request | Validación por esquema en el borde; nada llega sin validar al dominio |
| Archivos subidos | Tipo MIME y extensión permitidos, máximo 10 MB, verificado antes de escribir en R2 |
| Contenido de extractos | El parser trata cada celda como dato, nunca como fórmula ni como código |
| Consultas SQL | Drizzle parametriza; no se concatenan strings en SQL |
| Entrada al LLM | Los mensajes del usuario nunca se interpolan en el system prompt |

Ese último punto es una defensa contra **inyección de prompt**. Aun si un usuario
lograra manipular al modelo, el diseño acota el daño: el modelo no puede
consultar la base, solo invocar siete funciones acotadas, todas filtradas por la
empresa de su propia sesión. **El peor caso de una inyección exitosa es una
respuesta rara, no una fuga de datos.**

---

## 6. Riesgos específicos de la IA

| Riesgo | Control |
|---|---|
| El modelo inventa una cifra | No calcula: solo redacta sobre datos del backend, verificables contra el dashboard |
| El modelo filtra datos de otra empresa | `empresa_id` inyectado del lado del servidor; fuera del espacio de acciones del modelo |
| Inyección de prompt vía descripción de un movimiento | Datos y instrucciones separados; superficie de acción mínima |
| Dependencia de un proveedor externo | La orquestación está aislada tras una interfaz propia |
| Código generado por IA con vulnerabilidades | Revisión humana obligatoria, registrada en [`AI-DECISIONS.md`](../AI-DECISIONS.md) |

La última fila es la que enfatiza la Clase 0: la IA escribe sintaxis, el
ingeniero audita el sistema. Toda contribución asistida pasa por code review de
un par y queda documentada con su validación humana.

---

## 7. Postura legal

Helpyme es una **herramienta informativa**, no un servicio de asesoramiento
financiero o contable profesional.

- Todo indicador declara que es **resultado de caja**, no ganancia contable.
- Toda simulación muestra sus **supuestos en pantalla y son editables**. En el
  escenario «contratar un empleado», el costo real en Argentina no es el sueldo
  bruto —hay cargas sociales, aguinaldo y provisión de indemnización—: el sistema
  no finge precisión, muestra un supuesto explícito y deja que el usuario lo
  ajuste con el número que le pasó su contador.
- El producto no reemplaza a un contador y así se comunica.

---

## 8. Pendiente para checkpoints siguientes

| Ítem | Hito |
|---|---|
| Tests automatizados de aislamiento multi-tenant | Checkpoint 2 |
| Rate limiting por empresa | Checkpoint 2 |
| Cifrado del token de Mercado Pago en reposo | Checkpoint 2 |
| Auditoría de dependencias en CI (`npm audit`) | Checkpoint 2 |
| Política de retención y borrado de datos | Defensa Final |
