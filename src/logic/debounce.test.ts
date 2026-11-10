import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.js";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call fn before the delay has passed", () => {
    const fn = vi.fn();
    debounce(fn, 300)();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls fn once after the delay", () => {
    const fn = vi.fn();
    debounce(fn, 300)();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer when called again within the delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls fn only once for a burst of calls, with the last arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced("s");
    debounced("sp");
    debounced("spa");
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("spa");
  });

  it("fires again for a call made after the previous one has fired", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced("a");
    vi.advanceTimersByTime(300);
    debounced("b");
    vi.advanceTimersByTime(300);
    expect(fn.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("keeps separate timers for separate debounced functions", () => {
    const first = vi.fn();
    const second = vi.fn();
    debounce(first, 100)();
    debounce(second, 500)();
    vi.advanceTimersByTime(100);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("cancel drops the pending call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });
});
