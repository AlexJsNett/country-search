import { searchCountries } from "./api.js";
import { debounce } from "./debounce.js";
import { classifyError, type ErrorKind } from "./errors.js";
import { mapCountryResponse } from "./map.js";
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
  readonly searchNow: (text: string) => void;
  readonly retry: () => void;
  readonly dispose: () => void;
};

export type SearchControllerOptions = {
  readonly onState: (state: SearchState) => void;
  readonly search?: SearchFn;
  readonly debounceMs?: number;
};

export const createSearchController = ({
  onState,
  search = searchCountries,
  debounceMs = DEBOUNCE_MS,
}: SearchControllerOptions): SearchController => {
  let lastQuery = "";
  let current: AbortController | undefined;

  const cancelCurrent = () => {
    current?.abort();
    current = undefined;
  };

  const run = async (query: string): Promise<void> => {
    const request = new AbortController();
    current = request;
    try {
      const raw = await search(query, request.signal);
      if (request.signal.aborted) return;
      const countries = raw.map((country) => mapCountryResponse(country));
      onState(
        countries.length === 0
          ? { status: "empty", query }
          : { status: "results", query, countries },
      );
    } catch (error) {
      const kind = classifyError(error);
      if (kind.kind === "cancelled") return;
      onState({ status: "error", query, error: kind });
    }
  };

  const debouncedRun = debounce(run, debounceMs);

  return {
    input: (text) => {
      cancelCurrent();
      const query = text.trim();
      if (query === "") {
        debouncedRun.cancel();
        lastQuery = "";
        onState({ status: "idle" });
        return;
      }
      lastQuery = query;
      onState({ status: "loading", query });
      debouncedRun(query);
    },
    searchNow: (_text) => {
      throw new Error("not implemented");
    },
    retry: () => {
      if (lastQuery === "") return;
      cancelCurrent();
      onState({ status: "loading", query: lastQuery });
      void run(lastQuery);
    },
    dispose: () => {
      debouncedRun.cancel();
      cancelCurrent();
    },
  };
};
