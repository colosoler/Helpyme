import { describe, expect, it } from "vitest";
import { ADVISOR_TOOLS } from "../src/advisor-tools";

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
    const params = Object.keys(tool.input_schema.properties).map((p) => p.toLowerCase());
    for (const p of params) {
      expect(p).not.toMatch(/empresa|tenant|organiz/);
    }
  });

  it.each(ADVISOR_TOOLS)("$name tiene esquema estricto", (tool) => {
    expect(tool.strict).toBe(true);
    expect(tool.input_schema.additionalProperties).toBe(false);
    expect([...tool.input_schema.required].sort()).toEqual(
      Object.keys(tool.input_schema.properties).sort(),
    );
  });
});
