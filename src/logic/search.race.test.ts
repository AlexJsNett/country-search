import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "./api.js";
import { createSearchController, type SearchState } from "./search.js";

const DELAY = 300;

type Reply = { readonly delayMs: number; readonly names: readonly string[] };

/**
 * A fetch mock that resolves after a per-query delay and, like the real
 * fetch, rejects with `signal.reason` as soon as the signal is aborted.
 */
const stubSlowFetch = (replies: Record<string, Reply>) => {
  const mock = vi.fn((url: string, init: RequestInit) => {
    const query = decodeURIComponent(url.slice(API_URL.length));
    const reply = replies[query] as Reply;
    const signal = init.signal as AbortSignal;
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        const body = reply.names.map((name) => ({ name }));
        resolve(new Response(JSON.stringify(body), { status: 200 }));
      }, reply.delayMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};

const setup = () => {
  const states: SearchState[] = [];
  const controller = createSearchController({
    onState: (state) => states.push(state),
    debounceMs: DELAY,
  });
  return { states, controller };
};

const shownNames = (states: SearchState[]) =>
  states.flatMap((s) =>
    s.status === "results" ? s.countries.map((c) => c.name) : [],
  );

describe("request race", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not let a slow response for an old query overwrite the new one", async () => {
    const fetchMock = stubSlowFetch({
      sp: { delayMs: 500, names: ["Stale SP result"] },
      spain: { delayMs: 100, names: ["Spain"] },
    });
    const { states, controller } = setup();

    controller.input("sp");
    await vi.advanceTimersByTimeAsync(DELAY); // "sp" is in flight, resolves later
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY); // "spain" is in flight, resolves first
    await vi.advanceTimersByTimeAsync(1000); // the "sp" response would arrive now

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shownNames(states)).toEqual(["Spain"]);
    expect(states[states.length - 1]).toMatchObject({
      status: "results",
      query: "spain",
    });
  });

  it("really aborts the old request instead of ignoring its response", async () => {
    const fetchMock = stubSlowFetch({
      sp: { delayMs: 500, names: ["Stale SP result"] },
      spain: { delayMs: 100, names: ["Spain"] },
    });
    const { controller } = setup();

    controller.input("sp");
    await vi.advanceTimersByTimeAsync(DELAY);
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY + 1000);

    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(firstSignal.reason.name).toBe("AbortError");
  });

  it("aborts on every keystroke, not only when the debounce fires", async () => {
    const fetchMock = stubSlowFetch({
      sp: { delayMs: 5000, names: ["Stale SP result"] },
    });
    const { controller } = setup();

    controller.input("sp");
    await vi.advanceTimersByTimeAsync(DELAY); // request for "sp" is in flight
    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    controller.input("spa"); // debounce for "spa" has not fired yet
    expect(signal.aborted).toBe(true);
  });

  it("aborts the in-flight request when the input is cleared", async () => {
    const fetchMock = stubSlowFetch({
      sp: { delayMs: 500, names: ["Stale SP result"] },
    });
    const { states, controller } = setup();

    controller.input("sp");
    await vi.advanceTimersByTimeAsync(DELAY);
    controller.input("");
    await vi.advanceTimersByTimeAsync(2000);

    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(true);
    expect(shownNames(states)).toEqual([]);
    expect(states[states.length - 1]).toEqual({ status: "idle" });
  });

  it("does not report the aborted request as an error", async () => {
    stubSlowFetch({
      sp: { delayMs: 500, names: ["Stale SP result"] },
      spain: { delayMs: 100, names: ["Spain"] },
    });
    const { states, controller } = setup();

    controller.input("sp");
    await vi.advanceTimersByTimeAsync(DELAY);
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY + 1000);

    expect(states.some((s) => s.status === "error")).toBe(false);
  });
});
