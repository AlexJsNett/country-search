import { describe, expect, it } from "vitest";
import { HttpError, classifyError } from "./errors.js";

describe("HttpError", () => {
  it("is an Error that stores the response status", () => {
    const error = new HttpError(503);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(503);
    expect(error.name).toBe("HttpError");
    expect(error.message).toContain("503");
  });
});

describe("classifyError", () => {
  it("treats AbortError as our own cancellation", () => {
    expect(classifyError(new DOMException("aborted", "AbortError"))).toEqual({
      kind: "cancelled",
    });
  });

  it("treats TimeoutError as a timeout, not a cancellation", () => {
    expect(classifyError(new DOMException("slow", "TimeoutError"))).toEqual({
      kind: "timeout",
    });
  });

  it("keeps the status of an HttpError", () => {
    expect(classifyError(new HttpError(500))).toEqual({
      kind: "http",
      status: 500,
    });
  });

  it("treats a failed fetch (TypeError) as a network error", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toEqual({
      kind: "network",
    });
  });

  it("treats unknown values as a network error", () => {
    expect(classifyError("boom")).toEqual({ kind: "network" });
    expect(classifyError(undefined)).toEqual({ kind: "network" });
  });

  it("does not confuse a regular Error named like an abort with other kinds", () => {
    expect(classifyError(new Error("plain"))).toEqual({ kind: "network" });
  });

  it("distinguishes abort and timeout from each other", () => {
    const abort = classifyError(new DOMException("x", "AbortError"));
    const timeout = classifyError(new DOMException("x", "TimeoutError"));
    expect(abort).not.toEqual(timeout);
  });
});
