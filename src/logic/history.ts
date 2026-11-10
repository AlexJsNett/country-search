import type { SearchState } from "./search.js";

export const HISTORY_KEY = "country-search:history";
export const HISTORY_LIMIT = 8;

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const addToHistory = (
  history: readonly string[],
  query: string,
  limit: number = HISTORY_LIMIT,
): readonly string[] => {
  const trimmed = query.trim();
  if (trimmed === "") return history;
  const others = history.filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
  );
  return [trimmed, ...others].slice(0, limit);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

export const loadHistory = (storage: KeyValueStorage): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isNonEmptyString) : [];
  } catch {
    return [];
  }
};

export const saveHistory = (
  storage: KeyValueStorage,
  history: readonly string[],
): void => {
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const exactMatchName = (state: SearchState): string | null =>
  state.status === "results" && state.countries.length === 1
    ? (state.countries[0]?.name ?? null)
    : null;
