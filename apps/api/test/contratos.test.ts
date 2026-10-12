import { estadoImport } from "@helpyme/db/schema";
import { ESTADOS_IMPORT } from "@helpyme/shared";
import { describe, expect, it } from "vitest";

describe("contratos compartidos", () => {
  // El estado viaja al frontend como tipo de `shared` y se guarda como enum de
  // la base: son dos listas y tienen que ser la misma.
  it("los estados de un import coinciden con el enum de la base", () => {
    expect(estadoImport.enumValues).toEqual([...ESTADOS_IMPORT]);
  });
});
