import type { ErrorKind } from "./errors.js";
import type { CountryCard, RawCountry } from "./types.js";

export const DEBOUNCE_MS = 300;

export type SearchState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly query: string }
  | {
      readonly status: "results";
      readonly query: string;
      readonly countries: readonly CountryCard[];
    }
  | { readonly status: "empty"; readonly query: string }
  | {
      readonly status: "error";
      readonly query: string;
      readonly error: ErrorKind;
    };

export type SearchFn = (
  query: string,
  signal: AbortSignal,
) => Promise<readonly RawCountry[]>;

export type SearchController = {
  readonly input: (text: string) => void;
  readonly retry: () => void;
  readonly dispose: () => void;
};

export type SearchControllerOptions = {
  readonly onState: (state: SearchState) => void;
  readonly search?: SearchFn;
  readonly debounceMs?: number;
};

export const createSearchController = (
  _options: SearchControllerOptions,
): SearchController => {
  throw new Error("not implemented");
};
