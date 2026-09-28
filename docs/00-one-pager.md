# One-Pager — Helpyme

> **Entregable:** Hito *Clase 1* (24/08/2026) del TPI.
> **Estado:** cerrado. Sirve de línea base para el [Checkpoint 1](../entregas-cloud/checkpoint-1/README.md).

---

## 1. Nombre del proyecto

**Helpyme** — Asesor Financiero Inteligente para PyMEs.

El nombre condensa la propuesta: *help* + *PyME*. El producto no es un ERP ni un
sistema contable: es un asistente que responde qué está pasando con la plata.

---

## 2. Problema

Una PyME argentina típica tiene el dinero repartido en al menos cuatro lugares:
la cuenta bancaria, Mercado Pago, una planilla de Excel con gastos y un sistema
—o cuaderno— de facturación.

Las consecuencias son concretas y medibles:

- El dueño sabe **cuánto facturó**, pero no **cuánto ganó**.
- No tiene visibilidad de la caja futura: no sabe si llega a fin de mes con los
  pagos ya comprometidos.
- Detecta los problemas tarde: se entera de que un proveedor le aumentó cuando
  ya pagó tres facturas más caras.
- Las decisiones que más impactan —contratar, subir precios, comprar stock— se
  toman por intuición.

**El diagnóstico preciso importa porque define el producto:** no es un problema
de *falta de datos*, es un problema de **datos sin consolidar y sin
interpretar**. Por eso la solución no es capturar más información, sino unificar
y explicar la que la empresa ya genera.

---

## 3. Propuesta de valor

> «Sabés exactamente cómo está tu negocio hoy, qué se te viene en las próximas
> semanas, y podés preguntarle en castellano qué conviene hacer.»

El diferencial **no es el dashboard** —eso ya existe y está resuelto— sino la
**capa de análisis conversacional apoyada sobre datos propios y verificables**.
El sistema no da consejos genéricos de manual: responde con los números reales
de esa empresa y explica *por qué* pasó lo que pasó.

Se entregan tres capas:

| Capa | Qué hace |
|---|---|
| **Consolidación** | Todo el movimiento de dinero en un solo lugar, categorizado y deduplicado. |
| **Diagnóstico** | Indicadores determinísticos (caja, rentabilidad, deudas, evolución) más alertas automáticas por reglas. |
| **Asesoramiento** | Asistente conversacional que responde sobre el negocio y permite simular decisiones antes de tomarlas. |

**Principio de diseño no negociable:** el modelo de lenguaje **nunca calcula ni
inventa una cifra**. Todos los números provienen de SQL y lógica de negocio; el
LLM solo redacta sobre datos que le devuelve el backend. En un producto
financiero, una cifra alucinada destruye la confianza de forma permanente.

---

## 4. Usuarios objetivo

**Usuario primario** — dueño o socio de una PyME de 1 a 20 empleados
(gastronomía, retail, servicios profesionales, e-commerce chico), que cobra
mayormente por Mercado Pago y transferencia, y no tiene un contador interno
full-time.

**Perfil técnico: bajo.** Usa Excel a nivel básico. No va a configurar
integraciones complejas ni leer documentación. Este perfil impone una
restricción dura de producto: **la carga de datos tiene que resolverse en menos
de cinco minutos por mes.** Es la principal fuente de abandono y condiciona el
diseño de la ingesta.

**Usuario secundario (post-MVP)** — el contador externo, como consumidor de
reportes de solo lectura.

---

## 5. Stack tentativo

Elegido bajo el *Marco de Libertad Tecnológica* del TPI. La justificación
completa de cada componente está en los [ADR](../entregas-cloud/checkpoint-1/adr/) y en
[01-arquitectura.md](../entregas-cloud/checkpoint-1/01-arquitectura.md).

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | Next.js + TypeScript en **Vercel** | Dashboard, chat, formularios de carga |
| Backend / API | **Cloudflare Workers** + Hono | API REST serverless en el edge |
| Persistencia | **PostgreSQL en Neon** (driver serverless) | Datos relacionales multi-tenant |
| ORM | **Drizzle ORM** | Acceso tipado y migraciones versionadas |
| Storage | **Cloudflare R2** | Extractos y comprobantes originales |
| Procesamiento asíncrono | **Cloudflare Queues** | Parseo de extractos fuera del request |
| Autenticación | **Better Auth** | Sesiones y organizaciones |
| IA | **Anthropic Claude** (`claude-opus-5`) | Chat con *function calling* |
| CI/CD | **GitHub Actions** | Lint, typecheck, tests y despliegue |

**Por qué serverless y no un servidor tradicional:** una PyME entra al dashboard
unas pocas veces por semana. La carga es irregular y baja en volumen pero con
picos al cierre de mes. Pagar cómputo encendido 24/7 para ese patrón es tirar
plata; el escalado a cero de Workers y Neon hace que el costo siga a la demanda.

---

## 6. Alcance del MVP

**Dentro:** registro y autenticación · conexión OAuth con Mercado Pago · carga de
extractos CSV/XLSX con previsualización · carga manual de gastos · motor de
categorización por reglas · cuentas por cobrar y pagar · dashboard financiero ·
proyección de caja · alertas por reglas · asesor conversacional · simulador de
escenarios.

**Fuera (v1), con justificación explícita:** agregación bancaria automática
(no existe *open banking* estandarizado en Argentina; la alternativa es scraping
con credenciales del usuario) · integración con AFIP (requiere certificado
digital y homologación) · cálculo contable formal (es contabilidad, no BI) ·
modelo predictivo entrenado (*cold start*: sin historial no supera a un promedio
móvil) · app móvil nativa · multi-moneda.

El detalle completo, con la tabla de funcionalidades F1–F11, está en
[01-arquitectura.md](../entregas-cloud/checkpoint-1/01-arquitectura.md).
