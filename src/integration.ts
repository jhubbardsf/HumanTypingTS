import { DEFAULT_WPM } from "./config.js";
import { MarkovTyper } from "./typer.js";
import type {
  HumanTyperOptions,
  KeyboardLayoutName,
  PlaywrightTypingTarget,
  PressableTarget,
  RandomSource,
  SleepFunction,
} from "./types.js";

export class HumanTyper {
  readonly wpm: number;
  readonly layout: KeyboardLayoutName;

  private readonly rng: RandomSource | undefined;
  private readonly sleep: SleepFunction;

  constructor(options: HumanTyperOptions = {}) {
    const wpm = options.wpm ?? DEFAULT_WPM;

    if (!Number.isFinite(wpm) || wpm <= 0) {
      throw new Error("wpm must be a positive number");
    }

    this.wpm = wpm;
    this.layout = options.layout ?? "qwerty";
    this.rng = options.rng;
    this.sleep = options.sleep ?? sleepSeconds;
  }

  async type(target: PlaywrightTypingTarget, text: string): Promise<void> {
    if (typeof text !== "string" || text.length === 0) {
      throw new Error("text must be a non-empty string");
    }

    const typer = new MarkovTyper(text, {
      targetWpm: this.wpm,
      layout: this.layout,
      rng: this.rng,
    });
    const { history } = typer.run();
    let lastTime = 0;

    for (const event of history) {
      const delay = event.time - lastTime;
      if (delay > 0) {
        await this.sleep(delay);
      }
      lastTime = event.time;

      if (event.action.includes("BACKSPACE")) {
        await pressBackspace(target);
      } else if (event.action.includes("TYPED_SWAP")) {
        for (const char of extractTypedChars(event.action)) {
          await typeText(target, char);
        }
      } else if (event.action.includes("TYPED_ERROR")) {
        await typeText(target, extractTypedChars(event.action));
      } else if (event.action.includes("TYPED")) {
        await typeText(target, extractTypedChars(event.action));
      }
    }
  }
}

export function extractTypedChars(action: string): string {
  const firstQuote = action.indexOf("'");
  const lastQuote = action.lastIndexOf("'");

  if (firstQuote === -1 || lastQuote <= firstQuote) {
    return "";
  }

  return action.slice(firstQuote + 1, lastQuote);
}

async function pressBackspace(target: PlaywrightTypingTarget): Promise<void> {
  if (isKeyboardTarget(target)) {
    await target.keyboard.press("Backspace");
    return;
  }

  await target.press("Backspace");
}

async function typeText(target: PlaywrightTypingTarget, text: string): Promise<void> {
  if (text.length === 0) {
    return;
  }

  if (isKeyboardTarget(target)) {
    await target.keyboard.type(text, { delay: 0 });
    return;
  }

  if (typeof target.pressSequentially === "function") {
    await target.pressSequentially(text, { delay: 0 });
    return;
  }

  if (typeof target.type === "function") {
    await target.type(text, { delay: 0 });
    return;
  }

  await pressEachCharacter(target, text);
}

async function pressEachCharacter(target: PressableTarget, text: string): Promise<void> {
  for (const char of text) {
    await target.press(char);
  }
}

function isKeyboardTarget(target: PlaywrightTypingTarget): target is Extract<PlaywrightTypingTarget, { keyboard: unknown }> {
  return "keyboard" in target && typeof target.keyboard === "object" && target.keyboard !== null;
}

function sleepSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
