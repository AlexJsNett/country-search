import { describe, expect, it, vi } from "vitest";
import { createCachedSearch } from "./cache.js";
import { HttpError } from "./errors.js";
import type { RawCountry } from "./types.js";

type Pending = {
  query: string;
  signal: AbortSignal;
  resolve: (value: RawCountry[]) => void;
  reject: (reason: unknown) => void;
};

const setup = () => {
  const pending: Pending[] = [];
  const search = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<RawCountry[]>((resolve, reject) => {
        pending.push({ query, signal, resolve, reject });
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
  );
  const cached = createCachedSearch(search);
  return { search, cached, pending };
};

const SPAIN: RawCountry[] = [{ name: "Spain" }];
const signal = () => new AbortController();

describe("createCachedSearch", () => {
  it("serves a repeated query from the cache without a second request", async () => {
    const { search, cached, pending } = setup();
    const first = cached("spain", signal().signal);
    pending[0]?.resolve(SPAIN);
    await expect(first).resolves.toEqual(SPAIN);

    await expect(cached("spain", signal().signal)).resolves.toEqual(SPAIN);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("treats queries that differ only by case as the same", async () => {
    const { search, cached, pending } = setup();
    const first = cached("Spain", signal().signal);
    pending[0]?.resolve(SPAIN);
    await first;
    await cached("spain", signal().signal);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("sends separate requests for different queries", async () => {
    const { search, cached } = setup();
    void cached("spain", signal().signal);
    void cached("france", signal().signal);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request between identical concurrent queries", async () => {
    const { search, cached, pending } = setup();
    const a = cached("spain", signal().signal);
    const b = cached("spain", signal().signal);
    expect(search).toHaveBeenCalledTimes(1);
    pending[0]?.resolve(SPAIN);
    await expect(Promise.all([a, b])).resolves.toEqual([SPAIN, SPAIN]);
  });

  it("caches an empty result (no matches) too", async () => {
    const { search, cached, pending } = setup();
    const first = cached("zzzz", signal().signal);
    pending[0]?.resolve([]);
    await first;
    await expect(cached("zzzz", signal().signal)).resolves.toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures, so a retry hits the network again", async () => {
    const { search, cached, pending } = setup();
    const failed = cached("spain", signal().signal);
    pending[0]?.reject(new HttpError(500));
    await expect(failed).rejects.toBeInstanceOf(HttpError);

    const retry = cached("spain", signal().signal);
    expect(search).toHaveBeenCalledTimes(2);
    pending[1]?.resolve(SPAIN);
    await expect(retry).resolves.toEqual(SPAIN);
  });

  it("gives each caller its own cancellation: one abort does not break the other", async () => {
    const { search, cached, pending } = setup();
    const first = new AbortController();
    const a = cached("spain", first.signal);
    const b = cached("spain", signal().signal);

    first.abort();
    await expect(a).rejects.toMatchObject({ name: "AbortError" });

    expect(pending[0]?.signal.aborted).toBe(false);
    pending[0]?.resolve(SPAIN);
    await expect(b).resolves.toEqual(SPAIN);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("aborts the shared request when every caller has cancelled", async () => {
    const { cached, pending } = setup();
    const first = new AbortController();
    const second = new AbortController();
    const a = cached("spain", first.signal);
    const b = cached("spain", second.signal);
    const settled = Promise.allSettled([a, b]);

    first.abort();
    expect(pending[0]?.signal.aborted).toBe(false);
    second.abort();
    expect(pending[0]?.signal.aborted).toBe(true);
    await settled;
  });

  it("starts a fresh request after the previous one was cancelled by everyone", async () => {
    const { search, cached, pending } = setup();
    const first = new AbortController();
    const a = cached("spain", first.signal);
    first.abort();
    await expect(a).rejects.toMatchObject({ name: "AbortError" });

    const again = cached("spain", signal().signal);
    expect(search).toHaveBeenCalledTimes(2);
    pending[1]?.resolve(SPAIN);
    await expect(again).resolves.toEqual(SPAIN);
  });

  it("rejects with AbortError for an already aborted signal without searching", async () => {
    const { search, cached } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(cached("spain", controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(search).not.toHaveBeenCalled();
  });

  it("rejects an aborted caller even when the result is cached", async () => {
    const { cached, pending } = setup();
    const first = cached("spain", signal().signal);
    pending[0]?.resolve(SPAIN);
    await first;

    const controller = new AbortController();
    controller.abort();
    await expect(cached("spain", controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
