import { describe, expect, test } from "bun:test";
import { MarkovTyper } from "../src/index.js";
import { sequenceRng } from "./helpers.js";

describe("MarkovTyper", () => {
  test("validates constructor input", () => {
    expect(() => new MarkovTyper("")).toThrow("targetText must be a non-empty string");
    expect(() => new MarkovTyper("hello", 0)).toThrow("targetWpm must be a positive number");
  });

  test("runs to the target text without forced errors", () => {
    const typer = new MarkovTyper("hello world", {
      targetWpm: 60,
      rng: sequenceRng([], 0.5),
    });

    const result = typer.run();

    expect(result.history.at(0)?.action).toStartWith("INIT");
    expect(result.history.at(-1)?.text).toBe("hello world");
    expect(result.totalTime).toBeGreaterThan(0);
  });

  test("can produce a neighbor-key error and then backspace it", () => {
    const typer = new MarkovTyper("ab", {
      targetWpm: 60,
      rng: sequenceRng([
        0.5, 0.5,
        0.99,
        0.0,
        0.0,
        0.0,
        0.5, 0.5,
        0.5, 0.5,
      ], 0.5),
    });

    const errorEvent = typer.step();
    const backspaceEvent = typer.step();

    expect(errorEvent?.action).toStartWith("TYPED_ERROR");
    expect(errorEvent?.text).not.toBe("a");
    expect(backspaceEvent?.action).toBe("BACKSPACE");
    expect(backspaceEvent?.text).toBe("");
  });

  test("can produce a swap event", () => {
    const typer = new MarkovTyper("ab", {
      targetWpm: 60,
      rng: sequenceRng([
        0.5, 0.5,
        0.0,
        0.5, 0.5,
        0.5, 0.5,
      ], 0.5),
    });

    const event = typer.step();

    expect(event?.action).toBe("TYPED_SWAP 'ba'");
    expect(event?.text).toBe("ba");
  });
});
