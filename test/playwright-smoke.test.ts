import { expect, test } from "bun:test";
import { HumanTyper } from "../src/index.js";
import { noDelay, sequenceRng } from "./helpers.js";

const smokeTest = process.env.PLAYWRIGHT_SMOKE === "1" ? test : test.skip;

smokeTest("types into a real Playwright input", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.setContent("<input id=\"target\" />");
    const input = page.locator("#target");
    await input.click();

    const typer = new HumanTyper({
      wpm: 60,
      rng: sequenceRng([], 0.5),
      sleep: noDelay,
    });

    await typer.type(input, "hello playwright");

    await expect(input.inputValue()).resolves.toBe("hello playwright");
  } finally {
    await browser.close();
  }
});
