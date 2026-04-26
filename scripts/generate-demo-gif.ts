import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { chromium } from "playwright";
import { HumanTyper, MarkovTyper } from "../src/index.js";
import type { RandomSource } from "../src/index.js";

const outputPath = new URL("../assets/humantypingts-demo.gif", import.meta.url).pathname;
const text = "HumanTypingTS makes Playwright type like a person.";
const demoWpm = 140;
const demoSeed = findSeedWithVisibleCorrection(text, demoWpm);
const rng = seededRng(demoSeed);

const tempDir = await mkdtemp(join(tmpdir(), "humantypingts-demo-"));

try {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 960, height: 540 },
    recordVideo: {
      dir: tempDir,
      size: { width: 960, height: 540 },
    },
  });

  await page.setContent(buildDemoHtml());
  await page.locator("#target").click();
  await page.waitForTimeout(700);

  const typer = new HumanTyper({ wpm: demoWpm, rng });
  await typer.type(page.locator("#target"), text);
  await page.waitForTimeout(1300);

  const video = page.video();
  await page.close();
  await browser.close();

  const videoPath = await video?.path();
  if (!videoPath) {
    throw new Error("Playwright did not produce a video file");
  }

  const palettePath = join(tempDir, "palette.png");
  await $`ffmpeg -y -i ${videoPath} -vf "fps=12,scale=720:-1:flags=lanczos,palettegen" ${palettePath}`.quiet();
  await $`ffmpeg -y -i ${videoPath} -i ${palettePath} -lavfi "fps=12,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" ${outputPath}`.quiet();

  console.log(`Generated ${outputPath} with demo seed ${demoSeed}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function findSeedWithVisibleCorrection(targetText: string, targetWpm: number): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    const typer = new MarkovTyper(targetText, {
      targetWpm,
      rng: seededRng(seed),
    });
    const { history } = typer.run();
    const errorIndex = history.findIndex((event) => {
      return event.action.startsWith("TYPED_ERROR")
        && event.text.length >= 8
        && event.text.length <= 35;
    });

    if (errorIndex === -1) {
      continue;
    }

    const correctedSoon = history
      .slice(errorIndex + 1, errorIndex + 5)
      .some((event) => event.action === "BACKSPACE");

    if (correctedSoon) {
      return seed;
    }
  }

  throw new Error("Could not find a demo seed with a visible typo correction");
}

function seededRng(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDemoHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f4f7fb;
        color: #13202e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.12), transparent 28%),
          linear-gradient(135deg, #f9fbff 0%, #eef4f8 42%, #f6f0e8 100%);
      }

      main {
        width: min(820px, calc(100vw - 64px));
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #52606d;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 0 24px;
        font-size: 48px;
        line-height: 1.04;
        letter-spacing: 0;
      }

      label {
        display: block;
        margin: 0 0 10px;
        color: #3e4c59;
        font-size: 16px;
        font-weight: 700;
      }

      input {
        width: 100%;
        min-height: 74px;
        border: 2px solid #1f5eff;
        border-radius: 8px;
        padding: 0 24px;
        background: #ffffff;
        color: #0b1220;
        box-shadow: 0 18px 48px rgba(16, 24, 40, 0.14);
        font-size: 30px;
        font-weight: 600;
        outline: none;
      }

      .status {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 18px;
        color: #52606d;
        font-size: 16px;
        font-weight: 600;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #10b981;
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.14);
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Playwright demo</p>
      <h1>Human-like typing from TypeScript</h1>
      <label for="target">Search input</label>
      <input id="target" autocomplete="off" spellcheck="false" />
      <div class="status"><span class="dot"></span>Generated by HumanTypingTS</div>
    </main>
  </body>
</html>`;
}
