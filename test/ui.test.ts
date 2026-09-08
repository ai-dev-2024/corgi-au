import { describe, expect, it, vi } from "vitest";
import { app } from "../src/index.js";
import type { Env } from "../src/types.js";

describe("static UI", () => {
  it("GET /ui returns the UI as HTML with both views", async () => {
    const res = await app.request("/ui");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toContain('id="vin-form"');
    expect(html).toContain('id="charging-form"');
    // Forms call the existing JSON endpoints.
    expect(html).toContain("/decode/");
    expect(html).toContain("/charging?");
  });

  it("GET / still returns the JSON index and lists /ui", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { endpoints: string[] };
    expect(body.endpoints).toContain("/ui");
    expect(body.endpoints).toContain("/decode/:vin");
  });

  it("GET /stats returns live counts", async () => {
    const first = vi.fn(async () => ({ stations: 25, last_refresh: 123 }));
    const env = { DB: { prepare: () => ({ first }) } } as unknown as Env;
    const res = await app.request("/stats", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stations: 25, last_refresh: 123, capitals: 8 });
  });

  it("GET /stats falls back to zeros when D1 fails", async () => {
    const first = vi.fn(async () => {
      throw new Error("db down");
    });
    const env = { DB: { prepare: () => ({ first }) } } as unknown as Env;
    const res = await app.request("/stats", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stations: 0, last_refresh: null });
  });

  it("responses carry security headers", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});
