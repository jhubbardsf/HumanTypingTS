import { describe, expect, test } from "bun:test";
import { runMonteCarlo, summarizeTimes } from "../src/index.js";
import { sequenceRng } from "./helpers.js";

describe("simulation helpers", () => {
  test("summarizes time samples", () => {
    const result = summarizeTimes([1, 2, 3]);

    expect(result.meanTime).toBe(2);
    expect(result.minTime).toBe(1);
    expect(result.maxTime).toBe(3);
    expect(result.standardDeviation).toBeGreaterThan(0);
  });

  test("runs monte carlo simulations", () => {
    const result = runMonteCarlo("hello", 60, 3, {
      rng: sequenceRng([], 0.5),
    });

    expect(result.times).toHaveLength(3);
    expect(result.meanTime).toBeGreaterThan(0);
  });

  test("validates simulation counts", () => {
    expect(() => runMonteCarlo("hello", 60, 0)).toThrow("nSimulations must be a positive integer");
    expect(() => summarizeTimes([])).toThrow("times must contain at least one value");
  });
});
