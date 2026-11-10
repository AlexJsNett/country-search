import { describe, expect, it } from "vitest";
import antarctica from "./fixtures/antarctica.json";
import spain from "./fixtures/spain.json";
import { mapCountryResponse } from "./map.js";
import type { RawCountry } from "./types.js";

describe("mapCountryResponse", () => {
  it("maps the fields shown on a card", () => {
    const card = mapCountryResponse(spain as RawCountry);
    expect(card.name).toBe("Spain");
    expect(card.capital).toBe("Madrid");
    expect(card.region).toBe("Europe");
    expect(card.population).toBe(47351567);
    expect(card.flagUrl).toBe("https://flagcdn.com/es.svg");
    expect(card.flagEmoji).toBe("\u{1F1EA}\u{1F1F8}");
  });

  it("maps the fields shown in the detail view", () => {
    const card = mapCountryResponse(spain as RawCountry);
    expect(card.nativeName).toBe("España");
    expect(card.demonym).toBe("Spanish");
    expect(card.subregion).toBe("Southern Europe");
    expect(card.area).toBe(505992);
    expect(card.borders).toEqual(["AND", "FRA", "GIB", "PRT", "MAR"]);
  });

  it("turns language objects into names", () => {
    const card = mapCountryResponse(spain as RawCountry);
    expect(card.languages).toEqual(["Spanish"]);
    const polar = mapCountryResponse(antarctica as RawCountry);
    expect(polar.languages).toEqual(["English", "Russian"]);
  });

  it("formats currencies with their symbol", () => {
    const card = mapCountryResponse(spain as RawCountry);
    expect(card.currencies).toEqual(["Euro (€)"]);
  });

  it("uses safe defaults for missing optional fields", () => {
    const card = mapCountryResponse(antarctica as RawCountry);
    expect(card.capital).toBeNull();
    expect(card.borders).toEqual([]);
    expect(card.currencies).toEqual([]);
  });

  it("works with the minimum possible input", () => {
    expect(mapCountryResponse({ name: "Nowhere" })).toEqual({
      name: "Nowhere",
      nativeName: null,
      demonym: null,
      flagUrl: null,
      flagEmoji: "",
      capital: null,
      region: "",
      subregion: null,
      population: 0,
      area: null,
      borders: [],
      languages: [],
      currencies: [],
    });
  });

  it("falls back to the png flag when there is no svg", () => {
    const card = mapCountryResponse({
      name: "X",
      flags: { png: "https://example.test/x.png" },
    });
    expect(card.flagUrl).toBe("https://example.test/x.png");
  });

  it("does not mutate its input", () => {
    const raw = structuredClone(spain) as RawCountry;
    mapCountryResponse(raw);
    expect(raw).toEqual(spain);
  });

  it("is repeatable for the same input", () => {
    expect(mapCountryResponse(spain as RawCountry)).toEqual(
      mapCountryResponse(spain as RawCountry),
    );
  });
});
