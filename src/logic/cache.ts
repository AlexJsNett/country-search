import type { SearchFn } from "./search.js";
import type { RawCountry } from "./types.js";

type SharedRequest = {
  readonly key: string;
  readonly controller: AbortController;
  readonly promise: Promise<readonly RawCountry[]>;
  subscribers: number;
};

const toKey = (query: string): string => query.trim().toLowerCase();

export const createCachedSearch = (search: SearchFn): SearchFn => {
  const results = new Map<string, readonly RawCountry[]>();
  const inFlight = new Map<string, SharedRequest>();

  const start = (key: string, query: string): SharedRequest => {
    const controller = new AbortController();
    const promise = search(query, controller.signal).then((found) => {
      results.set(key, found);
      return found;
    });
    const shared: SharedRequest = { key, controller, promise, subscribers: 0 };
    const forget = () => {
      if (inFlight.get(key) === shared) inFlight.delete(key);
    };
    promise.then(forget, forget);
    inFlight.set(key, shared);
    return shared;
  };

  const subscribe = (
    shared: SharedRequest,
    signal: AbortSignal,
  ): Promise<readonly RawCountry[]> =>
    new Promise((resolve, reject) => {
      shared.subscribers += 1;

      const onAbort = () => {
        shared.subscribers -= 1;
        if (shared.subscribers === 0) {
          if (inFlight.get(shared.key) === shared) inFlight.delete(shared.key);
          shared.controller.abort();
        }
        reject(signal.reason);
      };
      signal.addEventListener("abort", onAbort, { once: true });

      const settle = (finish: () => void) => {
        if (signal.aborted) return;
        signal.removeEventListener("abort", onAbort);
        finish();
      };
      shared.promise.then(
        (found) => settle(() => resolve(found)),
        (error) => settle(() => reject(error)),
      );
    });

  return (query, signal) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    const key = toKey(query);
    const hit = results.get(key);
    if (hit) return Promise.resolve(hit);
    return subscribe(inFlight.get(key) ?? start(key, query), signal);
  };
};
