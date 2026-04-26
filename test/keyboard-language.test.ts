import { describe, expect, test } from "bun:test";
import { KeyboardLayout, getWordDifficulty, isCommonBigram } from "../src/index.js";

describe("KeyboardLayout", () => {
  test("models qwerty neighbors and key distance", () => {
    const keyboard = new KeyboardLayout("qwerty");

    expect(keyboard.hasKey("a")).toBe(true);
    expect(keyboard.getNeighborKeys("s")).toContain("a");
    expect(keyboard.getDistance("a", "s")).toBe(1);
  });

  test("normalizes composed accents on qwerty", () => {
    const keyboard = new KeyboardLayout("qwerty");

    expect(keyboard.hasKey("é")).toBe(true);
    expect(keyboard.isComposedAccent("é")).toBe(true);
    expect(keyboard.isDirectAccent("é")).toBe(false);
  });

  test("maps azerty direct accents and shifted digits", () => {
    const keyboard = new KeyboardLayout("azerty");

    expect(keyboard.hasKey("é")).toBe(true);
    expect(keyboard.hasKey("2")).toBe(true);
    expect(keyboard.isDirectAccent("é")).toBe(true);
  });

  test("rejects unsupported layouts", () => {
    expect(() => new KeyboardLayout("dvorak" as "qwerty")).toThrow("Unsupported layout");
  });
});

describe("language helpers", () => {
  test("classifies common, normal, and complex words", () => {
    expect(getWordDifficulty("the")).toBe("common");
    expect(getWordDifficulty("typing")).toBe("normal");
    expect(getWordDifficulty("extraordinary")).toBe("complex");
    expect(getWordDifficulty("jazz")).toBe("complex");
  });

  test("detects common bigrams", () => {
    expect(isCommonBigram("t", "h")).toBe(true);
    expect(isCommonBigram("q", "p")).toBe(false);
  });
});
