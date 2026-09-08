import { describe, expect, it } from "vitest";
import { isValidVin, parseChargingParams } from "../src/lib/validate.js";

describe("isValidVin", () => {
  it("accepts a valid 17-char VIN", () => {
    expect(isValidVin("1HGCM82633A123456")).toEqual({ ok: true, vin: "1HGCM82633A123456" });
  });

  it("normalizes lowercase VINs", () => {
    expect(isValidVin("1hgcm82633a123456")).toEqual({ ok: true, vin: "1HGCM82633A123456" });
  });

  it("rejects short VINs with 400-class error", () => {
    const r = isValidVin("SHORT");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/17 characters/);
  });

  it("rejects VINs with I, O, Q", () => {
    for (const bad of ["1HGCM82633A123I56", "1HGCM82633A123O56", "1HGCM82633A123Q56"]) {
      expect(isValidVin(bad).ok).toBe(false);
    }
  });

  it("rejects non-strings", () => {
    expect(isValidVin(123).ok).toBe(false);
    expect(isValidVin(undefined).ok).toBe(false);
  });
});

describe("parseChargingParams", () => {
  const params = (q: string) => new URLSearchParams(q);

  it("parses valid lat/lng/radius", () => {
    expect(parseChargingParams(params("lat=-33.8688&lng=151.2093&radius_km=25"))).toEqual({
      ok: true,
      params: { latitude: -33.8688, longitude: 151.2093, distance: 25 },
    });
  });

  it("defaults radius to 10km", () => {
    const r = parseChargingParams(params("lat=-33.8&lng=151.2"));
    expect(r).toEqual({ ok: true, params: { latitude: -33.8, longitude: 151.2, distance: 10 } });
  });

  it("rejects missing lat/lng", () => {
    expect(parseChargingParams(params("lng=151.2")).ok).toBe(false);
    expect(parseChargingParams(params("lat=-33.8")).ok).toBe(false);
  });

  it("rejects out-of-range coords and radius", () => {
    expect(parseChargingParams(params("lat=999&lng=151.2")).ok).toBe(false);
    expect(parseChargingParams(params("lat=-33.8&lng=999")).ok).toBe(false);
    expect(parseChargingParams(params("lat=-33.8&lng=151.2&radius_km=0")).ok).toBe(false);
    expect(parseChargingParams(params("lat=-33.8&lng=151.2&radius_km=101")).ok).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(parseChargingParams(params("lat=abc&lng=151.2")).ok).toBe(false);
  });
});
