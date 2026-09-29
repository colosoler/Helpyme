import { describe, expect, it } from "vitest";
import { ADVISOR_TOOL_CONFIG, ADVISOR_TOOLS } from "../src/advisor-tools";

describe("ADVISOR_TOOLS", () => {
  it("expone las siete herramientas del MVP", () => {
    expect(ADVISOR_TOOLS.map((t) => t.name)).toEqual([
      "getResumenFinanciero",
      "getGastosPorCategoria",
      "getGastosPorProveedor",
      "getCuentasPorCobrar",
      "getCuentasPorPagar",
      "getProyeccionCaja",
      "simularEscenario",
    ]);
  });

  it.each(ADVISOR_TOOLS)("$name no acepta la empresa como parámetro", (tool) => {
    const params = Object.keys(tool.parametersJsonSchema.properties).map((p) => p.toLowerCase());
    for (const p of params) {
      expect(p).not.toMatch(/empresa|tenant|organiz/);
    }
  });

  it.each(ADVISOR_TOOLS)("$name tiene esquema cerrado", (tool) => {
    expect(tool.parametersJsonSchema.additionalProperties).toBe(false);
    expect([...tool.parametersJsonSchema.required].sort()).toEqual(
      Object.keys(tool.parametersJsonSchema.properties).sort(),
    );
  });

  it("las llamadas a funciones se validan con decodificación restringida", () => {
    expect(ADVISOR_TOOL_CONFIG.functionCallingConfig.mode).toBe("VALIDATED");
  });
});
