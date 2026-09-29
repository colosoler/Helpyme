/**
 * Contratos de las herramientas que el asesor conversacional puede invocar.
 *
 * El formato es el de `FunctionDeclaration` de la API de Gemini (ADR-0010):
 * `parametersJsonSchema` en lugar de `parameters`, porque el campo legado solo
 * admite un subconjunto de OpenAPI y rechaza `additionalProperties`.
 *
 * Invariantes (ver ADR-0010 y docs de seguridad):
 * - El modelo NUNCA calcula: solo elige una de estas funciones y redacta sobre
 *   el resultado que devuelve la capa de cálculo.
 * - `empresa_id` no es parámetro de ninguna herramienta. Se inyecta desde la
 *   sesión del servidor al ejecutarla, así el modelo no tiene forma de
 *   expresar una consulta a otra empresa. Lo verifica test/advisor-tools.test.ts.
 * - Todo esquema lleva `additionalProperties: false` y se invoca en modo
 *   `VALIDATED`, que valida cada llamada con decodificación restringida.
 *
 * Las fechas viajan como string `YYYY-MM-DD` y se validan del lado del
 * servidor antes de ejecutar la función.
 */

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: false;
}

export type JsonSchemaProperty =
  | { type: "string"; description: string; enum?: readonly string[] }
  | { type: "integer" | "number"; description: string };

export interface AdvisorToolDefinition {
  name: AdvisorToolName;
  description: string;
  parametersJsonSchema: JsonSchemaObject;
}

/**
 * `toolConfig` de cada request al modelo. `VALIDATED` deja que el modelo
 * elija entre llamar una función o responder en texto, pero toda llamada que
 * emita cumple el esquema declarado.
 */
export const ADVISOR_TOOL_CONFIG = {
  functionCallingConfig: { mode: "VALIDATED" },
} as const;

export type AdvisorToolName =
  | "getResumenFinanciero"
  | "getGastosPorCategoria"
  | "getGastosPorProveedor"
  | "getCuentasPorCobrar"
  | "getCuentasPorPagar"
  | "getProyeccionCaja"
  | "simularEscenario";

export const TIPOS_ESCENARIO = [
  "gasto_fijo_nuevo",
  "variacion_ventas",
  "variacion_costo",
] as const;

export type TipoEscenario = (typeof TIPOS_ESCENARIO)[number];

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export interface AdvisorToolInputs {
  getResumenFinanciero: RangoFechas;
  getGastosPorCategoria: RangoFechas;
  getGastosPorProveedor: RangoFechas;
  getCuentasPorCobrar: Record<string, never>;
  getCuentasPorPagar: Record<string, never>;
  getProyeccionCaja: { dias: number };
  simularEscenario: {
    tipo: TipoEscenario;
    /** Monto en pesos para `gasto_fijo_nuevo`; porcentaje para las variaciones. */
    valor: number;
    meses: number;
  };
}

const rangoFechas: JsonSchemaObject = {
  type: "object",
  properties: {
    desde: { type: "string", description: "Fecha inicial inclusive, formato YYYY-MM-DD." },
    hasta: { type: "string", description: "Fecha final inclusive, formato YYYY-MM-DD." },
  },
  required: ["desde", "hasta"],
  additionalProperties: false,
};

const sinParametros: JsonSchemaObject = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

export const ADVISOR_TOOLS: readonly AdvisorToolDefinition[] = [
  {
    name: "getResumenFinanciero",
    description:
      "Ingresos, egresos, resultado de caja y saldo consolidado de la empresa en un período.",
    parametersJsonSchema: rangoFechas,
  },
  {
    name: "getGastosPorCategoria",
    description: "Ranking de egresos agrupados por categoría en un período.",
    parametersJsonSchema: rangoFechas,
  },
  {
    name: "getGastosPorProveedor",
    description: "Ranking de egresos agrupados por proveedor en un período.",
    parametersJsonSchema: rangoFechas,
  },
  {
    name: "getCuentasPorCobrar",
    description: "Deudores pendientes con monto, fecha de vencimiento y antigüedad.",
    parametersJsonSchema: sinParametros,
  },
  {
    name: "getCuentasPorPagar",
    description: "Pagos comprometidos pendientes con monto y fecha de vencimiento.",
    parametersJsonSchema: sinParametros,
  },
  {
    name: "getProyeccionCaja",
    description:
      "Saldo proyectado día a día: saldo actual más cobros esperados menos pagos comprometidos.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Horizonte de la proyección, entre 1 y 90 días." },
      },
      required: ["dias"],
      additionalProperties: false,
    },
  },
  {
    name: "simularEscenario",
    description:
      "Simula el impacto en el resultado y la caja de una decisión hipotética. Devuelve también los supuestos usados.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        tipo: {
          type: "string",
          description: "Tipo de escenario a simular.",
          enum: TIPOS_ESCENARIO,
        },
        valor: {
          type: "number",
          description:
            "Monto mensual en pesos para gasto_fijo_nuevo; porcentaje (ej. -10) para las variaciones.",
        },
        meses: { type: "integer", description: "Meses a simular, entre 1 y 12." },
      },
      required: ["tipo", "valor", "meses"],
      additionalProperties: false,
    },
  },
];
