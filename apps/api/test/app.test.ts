import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { Bindings } from "../src/env";
import { isOriginAllowed } from "../src/middleware/cors";

const env = {
  ENVIRONMENT: "development",
  CORS_ALLOWED_ORIGINS: "http://localhost:3000,https://helpyme-git-*.vercel.app",
  DATABASE_URL: "postgresql://test",
} as Bindings;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("health checks", () => {
  it("/health responde sin tocar la base", async () => {
    const pingDatabase = vi.fn();
    const res = await createApp({ pingDatabase }).request("/health", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", environment: "development" });
    expect(pingDatabase).not.toHaveBeenCalled();
  });

  it("/ready responde 200 cuando la base contesta", async () => {
    const res = await createApp({ pingDatabase: async () => {} }).request("/ready", {}, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ready", checks: { database: { status: "ok" } } });
  });

  it("/ready responde 503 cuando la base no contesta", async () => {
    const pingDatabase = async () => {
      throw new Error("connection refused");
    };
    const res = await createApp({ pingDatabase }).request("/ready", {}, env);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ status: "not_ready", checks: { database: { status: "error" } } });
    expect(JSON.stringify(body)).not.toContain("connection refused");
  });
});

describe("middleware", () => {
  it("devuelve X-Request-Id en cada respuesta", async () => {
    const res = await createApp({ pingDatabase: async () => {} }).request("/health", {}, env);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("un error no controlado no filtra el mensaje ni el stack al cliente", async () => {
    const app = createApp({ pingDatabase: async () => {} });
    app.get("/boom", () => {
      throw new Error("detalle interno sensible");
    });

    const res = await app.request("/boom", {}, env);
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toMatchObject({ error: "internal_error" });
    expect(text).not.toContain("detalle interno sensible");
  });

  it("ruta inexistente responde 404 en JSON", async () => {
    const res = await createApp({ pingDatabase: async () => {} }).request("/nada", {}, env);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "not_found" });
  });

  it("CORS refleja solo orígenes de la lista blanca", async () => {
    const app = createApp({ pingDatabase: async () => {} });

    const permitido = await app.request("/health", { headers: { Origin: "http://localhost:3000" } }, env);
    expect(permitido.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");

    const ajeno = await app.request("/health", { headers: { Origin: "https://evil.example" } }, env);
    expect(ajeno.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("isOriginAllowed", () => {
  const lista = "http://localhost:3000,https://helpyme-git-*.vercel.app";

  it.each([
    ["http://localhost:3000", true],
    ["https://helpyme-git-feat-login-equipo.vercel.app", true],
    ["http://localhost:3001", false],
    ["https://helpyme-git-x.evil.com/.vercel.app", false],
    ["https://helpyme-git-a.b.vercel.app", false],
    ["https://evil.com?helpyme-git-x.vercel.app", false],
  ])("%s → %s", (origin, esperado) => {
    expect(isOriginAllowed(origin, lista)).toBe(esperado);
  });
});
