export const HISTORY_KEY = "country-search:history";
export const HISTORY_LIMIT = 8;

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const addToHistory = (
  _history: readonly string[],
  _query: string,
  _limit: number = HISTORY_LIMIT,
): readonly string[] => {
  throw new Error("not implemented");
};

export const loadHistory = (_storage: KeyValueStorage): readonly string[] => {
  throw new Error("not implemented");
};

export const saveHistory = (
  _storage: KeyValueStorage,
  _history: readonly string[],
): void => {
  throw new Error("not implemented");
};
