import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "./errors.js";
import spain from "./fixtures/spain.json";
import { createSearchController, type SearchState } from "./search.js";
import type { RawCountry } from "./types.js";

const DELAY = 300;

const setup = (
  search: (q: string, s: AbortSignal) => Promise<RawCountry[]>,
) => {
  const states: SearchState[] = [];
  const searchMock = vi.fn(search);
  const controller = createSearchController({
    onState: (state) => states.push(state),
    search: searchMock,
    debounceMs: DELAY,
  });
  return { states, searchMock, controller };
};

const last = (states: SearchState[]) => states[states.length - 1];

describe("createSearchController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits nothing before the first input", () => {
    const { states } = setup(async () => []);
    expect(states).toEqual([]);
  });

  it("goes idle and sends no request for an empty input", async () => {
    const { states, searchMock, controller } = setup(async () => []);
    controller.input("");
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(last(states)).toEqual({ status: "idle" });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only input as empty", async () => {
    const { states, searchMock, controller } = setup(async () => []);
    controller.input("   ");
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(last(states)).toEqual({ status: "idle" });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("shows loading immediately and waits for the debounce before fetching", async () => {
    const { states, searchMock, controller } = setup(async () => []);
    controller.input("spain");
    expect(last(states)).toEqual({ status: "loading", query: "spain" });
    await vi.advanceTimersByTimeAsync(DELAY - 1);
    expect(searchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toBe("spain");
    expect(searchMock.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it("trims the query before searching", async () => {
    const { searchMock, controller } = setup(async () => []);
    controller.input("  spain  ");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(searchMock.mock.calls[0]?.[0]).toBe("spain");
  });

  it("sends one request for a burst of typing, with the final text", async () => {
    const { searchMock, controller } = setup(async () => []);
    controller.input("s");
    controller.input("sp");
    controller.input("spa");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toBe("spa");
  });

  it("emits mapped country cards on success", async () => {
    const { states, controller } = setup(async () => [spain as RawCountry]);
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    const state = last(states);
    expect(state?.status).toBe("results");
    if (state?.status === "results") {
      expect(state.query).toBe("spain");
      expect(state.countries.map((c) => c.name)).toEqual(["Spain"]);
      expect(state.countries[0]?.capital).toBe("Madrid");
    }
  });

  it("emits empty (not error) when nothing matches", async () => {
    const { states, controller } = setup(async () => []);
    controller.input("zzzz");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)).toEqual({ status: "empty", query: "zzzz" });
  });

  it("emits an http error with the status", async () => {
    const { states, controller } = setup(async () => {
      throw new HttpError(500);
    });
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)).toEqual({
      status: "error",
      query: "spain",
      error: { kind: "http", status: 500 },
    });
  });

  it("emits a timeout error", async () => {
    const { states, controller } = setup(async () => {
      throw new DOMException("slow", "TimeoutError");
    });
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)).toMatchObject({
      status: "error",
      error: { kind: "timeout" },
    });
  });

  it("emits a network error", async () => {
    const { states, controller } = setup(async () => {
      throw new TypeError("Failed to fetch");
    });
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)).toMatchObject({
      status: "error",
      error: { kind: "network" },
    });
  });

  it("never shows our own cancellation as an error", async () => {
    const { states, controller } = setup(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(states.some((s) => s.status === "error")).toBe(false);
  });

  it("goes back to idle when the input is cleared after results", async () => {
    const { states, searchMock, controller } = setup(async () => [
      spain as RawCountry,
    ]);
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    controller.input("");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)).toEqual({ status: "idle" });
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("retry repeats the last query immediately", async () => {
    let fail = true;
    const { states, searchMock, controller } = setup(async () => {
      if (fail) throw new HttpError(503);
      return [spain as RawCountry];
    });
    controller.input("spain");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(last(states)?.status).toBe("error");

    fail = false;
    controller.retry();
    expect(last(states)).toEqual({ status: "loading", query: "spain" });
    await vi.advanceTimersByTimeAsync(0);
    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(searchMock.mock.calls[1]?.[0]).toBe("spain");
    expect(last(states)?.status).toBe("results");
  });

  it("retry does nothing when there was no query", async () => {
    const { states, searchMock, controller } = setup(async () => []);
    controller.retry();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(states).toEqual([]);
    expect(searchMock).not.toHaveBeenCalled();
  });
});
