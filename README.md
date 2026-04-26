# HumanTypingTS

[![npm version](https://img.shields.io/npm/v/humantyping-ts.svg?color=f97316)](https://www.npmjs.com/package/humantyping-ts)
[![npm downloads](https://img.shields.io/npm/dm/humantyping-ts.svg?color=f97316)](https://www.npmjs.com/package/humantyping-ts)
[![license](https://img.shields.io/npm/l/humantyping-ts.svg)](./LICENSE)

TypeScript port of the Python HumanTyping library. It simulates human-like typing with variable timing, keyboard-neighbor errors, swap errors, delayed correction, backspacing, word difficulty, bigram speedups, accents, and fatigue.

The package is published as [`humantyping-ts`](https://www.npmjs.com/package/humantyping-ts) and is Playwright-first, while the core `MarkovTyper` can be used without Playwright.

## See It In Action

![HumanTypingTS typing demo](https://raw.githubusercontent.com/jhubbardsf/HumanTypingTS/master/assets/humantypingts-demo.gif)

## Install

```bash
# Bun
bun add humantyping-ts

# npm
npm install humantyping-ts

# pnpm
pnpm add humantyping-ts

# yarn
yarn add humantyping-ts
```

If you want browser automation, also install Playwright (it's an optional peer dependency):

```bash
bun add -d playwright
```

## Playwright Usage

```ts
import { chromium } from "playwright";
import { HumanTyper } from "humantyping-ts";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto("https://example.com");

const input = page.locator("input[name='search']");
await input.click();

const typer = new HumanTyper({ wpm: 70, layout: "qwerty" });
await typer.type(input, "realistic typing!");

await browser.close();
```

## Pure Simulation

```ts
import { MarkovTyper, runMonteCarlo } from "humantyping-ts";

const typer = new MarkovTyper("Hello world", { targetWpm: 60 });
const { totalTime, history } = typer.run();

console.log(totalTime);
console.log(history);

const stats = runMonteCarlo("Hello world", 60, 100);
console.log(stats.meanTime, stats.standardDeviation);
```

## Notes

- `HumanTyper.type(target, text)` accepts Playwright-like locators, element handles, or pages with a `keyboard`.
- Playwright is a peer dependency so downstream projects can control the Playwright version.
- The port aims for behavioral parity with the Python model, not exact random-seed equivalence.

## Local Development

Clone the repo and install dev dependencies with Bun:

```bash
bun install
```

Run the unit tests and build the `dist/` output:

```bash
bun test
bun run build
```

Run the real browser smoke test when Playwright browsers are installed:

```bash
bun run test:smoke
```

## Links

- npm: https://www.npmjs.com/package/humantyping-ts
- GitHub: https://github.com/jhubbardsf/HumanTypingTS
- Demo page: https://jhubbardsf.github.io/HumanTypingTS/
