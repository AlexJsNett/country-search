import { describe, expect, it } from "vitest";
import type { SearchState } from "./search.js";
import type { CountryCard } from "./types.js";
import {
  HISTORY_KEY,
  addToHistory,
  exactMatchName,
  loadHistory,
  saveHistory,
  type KeyValueStorage,
} from "./history.js";

const memoryStorage = (initial?: string): KeyValueStorage => {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(HISTORY_KEY, initial);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

describe("addToHistory", () => {
  it("puts the newest query first without mutating the input", () => {
    const history = ["france"];
    expect(addToHistory(history, "spain")).toEqual(["spain", "france"]);
    expect(history).toEqual(["france"]);
  });

  it("moves a repeated query to the front instead of duplicating it", () => {
    expect(addToHistory(["spain", "france", "italy"], "italy")).toEqual([
      "italy",
      "spain",
      "france",
    ]);
  });

  it("treats queries that differ only by case as the same", () => {
    expect(addToHistory(["spain", "france"], "SPAIN")).toEqual([
      "SPAIN",
      "france",
    ]);
  });

  it("keeps only the newest entries up to the limit", () => {
    expect(addToHistory(["c", "b", "a"], "d", 3)).toEqual(["d", "c", "b"]);
  });

  it("ignores empty queries", () => {
    expect(addToHistory(["spain"], "   ")).toEqual(["spain"]);
  });

  it("trims the stored query", () => {
    expect(addToHistory([], "  spain ")).toEqual(["spain"]);
  });
});

describe("history storage", () => {
  it("round-trips the history", () => {
    const storage = memoryStorage();
    saveHistory(storage, ["spain", "france"]);
    expect(loadHistory(storage)).toEqual(["spain", "france"]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(loadHistory(memoryStorage())).toEqual([]);
  });

  it("returns an empty list for corrupted data", () => {
    expect(loadHistory(memoryStorage("{oops"))).toEqual([]);
    expect(loadHistory(memoryStorage('{"a":1}'))).toEqual([]);
  });

  it("drops entries that are not non-empty strings", () => {
    const stored = JSON.stringify(["spain", 5, "", null, "france"]);
    expect(loadHistory(memoryStorage(stored))).toEqual(["spain", "france"]);
  });
});

const card = (name: string): CountryCard => ({
  name,
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

describe("exactMatchName", () => {
  it("returns the country name when exactly one country was found", () => {
    const state: SearchState = {
      status: "results",
      query: "spai",
      countries: [card("Spain")],
    };
    expect(exactMatchName(state)).toBe("Spain");
  });

  it("returns null when several countries match", () => {
    const state: SearchState = {
      status: "results",
      query: "unit",
      countries: [card("United Kingdom"), card("United States")],
    };
    expect(exactMatchName(state)).toBeNull();
  });

  it.each<SearchState>([
    { status: "idle" },
    { status: "loading", query: "spain" },
    { status: "empty", query: "zzzz" },
    { status: "error", query: "spain", error: { kind: "network" } },
  ])("returns null for the $status state", (state) => {
    expect(exactMatchName(state)).toBeNull();
  });
});
