# Design

All request logic lives in `src/logic` and does not touch the DOM. It is tested without a browser and
without a real network (`fetch` is stubbed, time is controlled with fake timers). `src/ui` and
`src/main.ts` only render states and forward user events.

```
input ──► createSearchController ──► createCachedSearch ──► searchCountries ──► fetch
 (UI)      debounce, abort, states      dedup, cache           HttpError / 404 /
   ▲                │                                           timeout signal
   └── SearchState ─┘
```

## 1. Cancelling stale requests

### The problem

The user types `sp`, then `spain`. If the response for `sp` is slower than the response for `spain`, it
arrives later and overwrites the correct result on screen.

### What the code does

`createSearchController` (`src/logic/search.ts`) owns one `AbortController` for the request in flight.

1. **On every input event** (the very first line of `start`) the current controller is aborted and
   dropped. This happens on every keystroke, _not only_ when the debounce timer fires. Without this, a
   response for `sp` could still arrive during the 500 ms debounce wait and be rendered under the new
   text `spa`.
2. When the debounce fires, a new `AbortController` is created and its `signal` is passed to
   `searchCountries`.
3. `searchCountries` (`src/logic/api.ts`) merges the caller's signal with a timeout:
   `AbortSignal.any([signal, AbortSignal.timeout(ms)])`. `fetch` rejects with `signal.reason`.
4. In `catch`, `classifyError` (`src/logic/errors.ts`) separates the cases:

| What happened                       | Error                                    | Shown to the user           |
| ----------------------------------- | ---------------------------------------- | --------------------------- |
| our own abort (new input / cleared) | `DOMException` `AbortError`              | nothing                     |
| the server did not answer in time   | `DOMException` `TimeoutError`            | error and "Повторить"       |
| HTTP 5xx, 4xx other than 404        | `HttpError` (stores `status`)            | error and "Повторить"       |
| no connection                       | `TypeError` from `fetch`                 | error and "Повторить"       |
| HTTP 404 (no matches)               | not thrown, `searchCountries` gives `[]` | "Ничего не найдено" (empty) |

`fetch` does not throw on HTTP errors, so `searchCountries` checks `response.ok` by hand.

### Why not a "is this the latest response" flag?

A flag (or a timestamp comparison) only hides the symptom:

- the stale request still runs, uses bandwidth and server time, and keeps a connection open;
- every code path that writes state has to remember to check the flag, and one forgotten check
  brings the race back;
- it does not help with timeouts: a request that was replaced cannot be told apart from one that hung.

`abort()` stops the real work, makes the old promise reject immediately, and the old request shows as
`canceled` in the Network tab. A small check `if (request.signal.aborted) return` after the `await`
remains as a safety net for the gap between "response received" and "continuation runs"; it is not the
mechanism that fixes the race.

The race is covered by `src/logic/search.race.test.ts`: the `fetch` mock resolves `sp` _after_ `spain`
and rejects with `signal.reason` when its signal is aborted, so the test fails if the app only
ignores the late response.

## 2. Debounce delay: 500 ms

`debounce(fn, delay)` (`src/logic/debounce.ts`) keeps a single timer and resets it on every call.

- **No debounce (0 ms):** one request per keystroke (`s`, `sp`, `spa`, ...). Most of them are thrown
  away at once, the API gets many pointless requests, and the UI flickers between loading states.
- **Very long (1000 ms and more):** the app feels broken, the user thinks nothing is happening.
- **500 ms** is longer than the gap between keystrokes of a normal typist (about 100-200 ms) and than
  the short pauses people make in the middle of a word (up to about 400 ms), so a word typed in one go
  results in one request, and the results do not jump while the user is still typing. It is still
  short enough not to feel slow after the user stops. It started as 300 ms, but pauses in the middle
  of a word still triggered extra requests, so it was raised. The value is a named constant
  `DEBOUNCE_MS`.

The debounce delays only the _network call_. The loading state is shown immediately, and the previous
request is cancelled immediately (see above), so the delay never shows stale data.

## 3. Complexity

- **`mapCountryResponse`** is O(l + c) for one country, where `l` is the number of languages and `c`
  is the number of currencies (one `map` over each, everything else is constant-time field access).
  Both are small, so it is effectively O(1) per country. For a response with `n` countries the
  controller does O(n * (l + c)).
- **Cache and deduplication (`src/logic/cache.ts`)** use two `Map`s keyed by the normalized query:
  `results` and `inFlight`. Lookup, insert and delete are O(1) on average, the key is built in
  O(k) for a query of length `k`. Memory is O(q) for `q` distinct queries (each stores its result list).
  Each caller subscribes to the shared promise in O(1); aborting a caller is O(1).
- **History (`src/logic/history.ts`)**: a country is saved by its official name only when the search
  found exactly one country (`exactMatchName`) or the user opened a card out of several. Half-typed
  text, queries without matches and long result lists are not saved. `addToHistory` is O(h)
  for a list of at most `h = 8` entries (one `filter`, one `slice`).

### Cache and deduplication rules

- A finished successful result (including the empty "no matches" result) is cached per
  lower-case query. Failures are never cached, so "Повторить" really goes to the network.
- A second identical request while the first is in flight reuses the same promise.
- Each caller keeps its own `AbortSignal`. When a caller aborts, only its own promise rejects. The
  shared request is aborted only when the _last_ subscriber is gone, so one user cancelling cannot
  break the others, and cancelled work is not left running.

## 4. Clean code principles

- **Pure logic separated from the UI.** `mapCountryResponse` (`map.ts`) is a pure function;
  `classifyError` (`errors.ts`), `addToHistory` (`history.ts`) are pure too. DOM code lives only in
  `src/ui`.
- **Dependency injection for impurity.** `createSearchController({ search, debounceMs })` takes the
  search function and the delay; `loadHistory(storage)` takes the storage; `searchCountries` takes
  the `AbortSignal` and the timeout. This is what makes the race test possible.
- **Single responsibility.** One file per concern: `debounce.ts`, `errors.ts`, `api.ts`, `map.ts`,
  `search.ts`, `cache.ts`, `history.ts`. UI files render one thing each (`card.ts`, `details.ts`,
  `results.ts`, `history.ts`, `flag.ts`).
- **Error handling by type, not by message.** `HttpError` carries `status`; `classifyError` returns a
  discriminated union `ErrorKind`, and `describeError` (`ui/format.ts`) maps it with an exhaustive
  `switch`.
- **No magic numbers.** `DEBOUNCE_MS`, `REQUEST_TIMEOUT_MS`, `API_URL`, `HISTORY_LIMIT`,
  `NOT_FOUND`.
- **Immutability.** All data types use `readonly`; `addToHistory` returns a new array.
- **Safe DOM.** One `el()` helper (`ui/dom.ts`) builds elements with `textContent`; there is no
  `innerHTML` anywhere.
- **Tests first.** For each function the failing-test commit is before the implementation commit
  (see `git log`).
