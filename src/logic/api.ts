import { HttpError } from "./errors.js";
import type { RawCountry } from "./types.js";

export const API_URL = "https://countries.dev/name/";
export const REQUEST_TIMEOUT_MS = 8000;

const NOT_FOUND = 404;

export const searchCountries = async (
  query: string,
  signal: AbortSignal,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<readonly RawCountry[]> => {
  const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });
  if (response.status === NOT_FOUND) return [];
  if (!response.ok) throw new HttpError(response.status);
  return (await response.json()) as RawCountry[];
};
