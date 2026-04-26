import { describe, expect, test } from "bun:test";
import { HumanTyper, extractTypedChars } from "../src/index.js";
import { noDelay, sequenceRng } from "./helpers.js";

class FakeLocator {
  value = "";

  async press(key: string): Promise<void> {
    if (key === "Backspace") {
      this.value = this.value.slice(0, -1);
      return;
    }

    this.value += key;
  }

  async pressSequentially(text: string): Promise<void> {
    this.value += text;
  }
}

describe("HumanTyper", () => {
  test("replays generated events into a Playwright-like locator", async () => {
    const locator = new FakeLocator();
    const typer = new HumanTyper({
      wpm: 60,
      rng: sequenceRng([], 0.5),
      sleep: noDelay,
    });

    await typer.type(locator, "hello world");

    expect(locator.value).toBe("hello world");
  });

  test("validates input", async () => {
    const typer = new HumanTyper({ sleep: noDelay });

    expect(() => new HumanTyper({ wpm: 0 })).toThrow("wpm must be a positive number");
    await expect(typer.type(new FakeLocator(), "")).rejects.toThrow("text must be a non-empty string");
  });

  test("extracts typed characters from action strings", () => {
    expect(extractTypedChars("TYPED 'x'")).toBe("x");
    expect(extractTypedChars("TYPED_SWAP 'ht'")).toBe("ht");
    expect(extractTypedChars("BACKSPACE")).toBe("");
  });
});
