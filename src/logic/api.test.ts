import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, searchCountries } from "./api.js";
import { HttpError } from "./errors.js";
import spain from "./fixtures/spain.json";

type FetchMock = ReturnType<typeof vi.fn>;

const jsonResponse = (status: number, body: unknown = []) =>
  new Response(JSON.stringify(body), { status });

const stubFetch = (
  impl: (url: string, init: RequestInit) => Promise<Response>,
) => {
  const mock: FetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
};

const hangUntilAborted = (_url: string, init: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init.signal as AbortSignal;
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason));
  });

const neverAborted = () => new AbortController().signal;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchCountries", () => {
  it("requests the name endpoint and returns the parsed array", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, [spain]));
    const result = await searchCountries("spain", neverAborted());
    expect(result).toEqual([spain]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}spain`);
  });

  it("encodes special characters in the query", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, []));
    await searchCountries("new york/a?b", neverAborted());
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}new%20york%2Fa%3Fb`);
  });

  it("treats 404 as an empty result, not as an error", async () => {
    stubFetch(async () => jsonResponse(404, { message: "Not Found" }));
    await expect(searchCountries("zzzz", neverAborted())).resolves.toEqual([]);
  });

  it.each([400, 429, 500, 503])(
    "throws HttpError for status %i",
    async (status) => {
      stubFetch(async () => jsonResponse(status));
      const error = await searchCountries("x", neverAborted()).catch((e) => e);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(status);
    },
  );

  it("does not swallow network failures", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(searchCountries("x", neverAborted())).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  it("passes an AbortSignal to fetch", async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, []));
    await searchCountries("x", neverAborted());
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts the request when the caller's signal is aborted", async () => {
    const fetchMock = stubFetch(hangUntilAborted);
    const controller = new AbortController();
    const pending = searchCountries("x", controller.signal);
    controller.abort();
    const error = await pending.catch((e) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(
      true,
    );
  });

  it("rejects with AbortError when the signal is already aborted", async () => {
    stubFetch(hangUntilAborted);
    const controller = new AbortController();
    controller.abort();
    const error = await searchCountries("x", controller.signal).catch((e) => e);
    expect(error.name).toBe("AbortError");
  });

  it("rejects with TimeoutError when the server is too slow", async () => {
    stubFetch(hangUntilAborted);
    const error = await searchCountries("x", neverAborted(), 20).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("TimeoutError");
  });

  it("reports our own abort as AbortError even when a timeout is set", async () => {
    stubFetch(hangUntilAborted);
    const controller = new AbortController();
    const pending = searchCountries("x", controller.signal, 5000);
    controller.abort();
    const error = await pending.catch((e) => e);
    expect(error.name).toBe("AbortError");
  });
});
