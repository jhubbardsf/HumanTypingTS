import {
  AVG_WORD_LENGTH,
  CLOSE_KEY_THRESHOLD,
  COMMON_WORD_ERROR_MULT,
  COMPLEX_WORD_ERROR_MULT,
  COMPOSED_ACCENT_ERROR_MULT,
  DEFAULT_WPM,
  DRIFT_CORRECTION_PROB,
  FAR_KEY_PENALTY,
  FAR_KEY_THRESHOLD,
  FATIGUE_CAP,
  FATIGUE_FACTOR,
  MIN_BACKSPACE_TIME,
  MIN_KEYSTROKE_TIME,
  MIN_REACTION_TIME,
  MIN_SPEED_MULTIPLIER,
  PROB_ERROR,
  PROB_NOTICE_ERROR,
  PROB_SWAP_ERROR,
  SPEED_BOOST_BIGRAM,
  SPEED_BOOST_CLOSE_KEYS,
  SPEED_BOOST_COMMON_WORD,
  SPEED_PENALTY_COMPLEX_WORD,
  TIME_BACKSPACE_MEAN,
  TIME_BACKSPACE_STD,
  TIME_COMPOSED_ACCENT_PENALTY,
  TIME_DIRECT_ACCENT_PENALTY,
  TIME_KEYSTROKE_STD,
  TIME_REACTION_MEAN,
  TIME_REACTION_STD,
  TIME_SPACE_PAUSE_MEAN,
  TIME_SPACE_PAUSE_STD,
  TIME_UPPERCASE_PENALTY,
  WPM_STD,
} from "./config.js";
import { KeyboardLayout } from "./keyboard.js";
import { getWordDifficulty, isCommonBigram } from "./language.js";
import { randomNormal } from "./random.js";
import type {
  KeyboardLayoutName,
  MarkovTyperOptions,
  RandomSource,
  TypingEvent,
  TypingState,
} from "./types.js";

const WORD_BOUNDARY_CHARS = " \n\t.,;!?:()[]{}<>\"'";

export class MarkovTyper {
  readonly targetText: string;
  readonly keyboard: KeyboardLayout;
  readonly state: TypingState;
  readonly sessionWpm: number;
  readonly baseKeystrokeTime: number;

  private readonly rng: RandomSource;

  constructor(
    targetText: string,
    targetWpmOrOptions: number | MarkovTyperOptions = DEFAULT_WPM,
    layout: KeyboardLayoutName = "qwerty",
  ) {
    if (typeof targetText !== "string" || targetText.length === 0) {
      throw new Error("targetText must be a non-empty string");
    }

    const options = typeof targetWpmOrOptions === "number"
      ? { targetWpm: targetWpmOrOptions, layout }
      : targetWpmOrOptions;
    const targetWpm = options.targetWpm ?? DEFAULT_WPM;

    if (!Number.isFinite(targetWpm) || targetWpm <= 0) {
      throw new Error("targetWpm must be a positive number");
    }

    this.rng = options.rng ?? Math.random;
    this.targetText = targetText;
    this.keyboard = new KeyboardLayout(options.layout ?? "qwerty", this.rng);
    this.state = {
      currentText: "",
      targetText,
      totalTime: 0,
      history: [],
      lastCharTyped: null,
      fatigueMultiplier: 1,
      mentalCursorPos: 0,
    };

    this.sessionWpm = Math.max(10, randomNormal(targetWpm, WPM_STD, this.rng));
    this.baseKeystrokeTime = 60 / (this.sessionWpm * AVG_WORD_LENGTH);
    this.state.history.push({
      time: 0,
      action: `INIT (WPM: ${this.sessionWpm.toFixed(1)})`,
      text: "",
    });
  }

  step(): TypingEvent | null {
    if (this.state.currentText === this.targetText) {
      return null;
    }

    const firstErrorPos = this.getFirstErrorPos();

    if (firstErrorPos < this.state.currentText.length && this.shouldCorrect(firstErrorPos)) {
      const event = this.performBackspace();
      this.state.mentalCursorPos = this.state.currentText.length;
      return event;
    }

    if (this.state.mentalCursorPos > this.state.currentText.length) {
      this.state.mentalCursorPos = this.state.currentText.length;
    }

    if (this.state.mentalCursorPos >= this.targetText.length) {
      return null;
    }

    const charIntended = this.targetText[this.state.mentalCursorPos] as string;

    if (!this.keyboard.hasKey(charIntended) && charIntended !== " ") {
      return this.typeLiteralUnsupportedChar(charIntended);
    }

    this.state.fatigueMultiplier = Math.min(
      FATIGUE_CAP,
      this.state.fatigueMultiplier * FATIGUE_FACTOR,
    );

    const swapEvent = this.maybeTypeSwap(charIntended);
    if (swapEvent) {
      return swapEvent;
    }

    return this.typeNormalOrError(charIntended);
  }

  run(): { totalTime: number; history: TypingEvent[] } {
    let steps = 0;
    const maxSteps = this.targetText.length * 10;

    while (this.step() !== null) {
      steps += 1;
      if (steps > maxSteps) {
        break;
      }
    }

    return {
      totalTime: this.state.totalTime,
      history: this.state.history,
    };
  }

  private getCurrentWordContext(): string | null {
    const index = this.state.mentalCursorPos;

    if (index >= this.targetText.length) {
      return null;
    }

    let start = index;
    while (start > 0 && this.targetText[start - 1] !== " ") {
      start -= 1;
    }

    let end = index;
    while (end < this.targetText.length && this.targetText[end] !== " ") {
      end += 1;
    }

    return this.targetText.slice(start, end);
  }

  private calculateKeystrokeTime(charToType: string): number {
    let keystrokeTime = this.baseKeystrokeTime * this.state.fatigueMultiplier;
    const currentWord = this.getCurrentWordContext();

    if (currentWord) {
      const difficulty = getWordDifficulty(currentWord);
      if (difficulty === "common") {
        keystrokeTime *= SPEED_BOOST_COMMON_WORD;
      } else if (difficulty === "complex") {
        keystrokeTime *= SPEED_PENALTY_COMPLEX_WORD;
      }
    }

    if (this.state.lastCharTyped) {
      if (isCommonBigram(this.state.lastCharTyped, charToType)) {
        keystrokeTime *= SPEED_BOOST_BIGRAM;
      } else {
        const distance = this.keyboard.getDistance(this.state.lastCharTyped, charToType);
        if (distance > 0 && distance < CLOSE_KEY_THRESHOLD) {
          keystrokeTime *= SPEED_BOOST_CLOSE_KEYS;
        } else if (distance > FAR_KEY_THRESHOLD) {
          keystrokeTime *= FAR_KEY_PENALTY;
        }
      }
    }

    if (charToType === " ") {
      keystrokeTime += randomNormal(TIME_SPACE_PAUSE_MEAN, TIME_SPACE_PAUSE_STD, this.rng);
    } else if (this.keyboard.isComposedAccent(charToType)) {
      keystrokeTime += TIME_COMPOSED_ACCENT_PENALTY;
    } else if (this.keyboard.isDirectAccent(charToType)) {
      keystrokeTime += TIME_DIRECT_ACCENT_PENALTY;
    } else if (isUppercase(charToType)) {
      keystrokeTime += TIME_UPPERCASE_PENALTY;
    }

    keystrokeTime = Math.max(MIN_SPEED_MULTIPLIER * this.baseKeystrokeTime, keystrokeTime);
    return Math.max(MIN_KEYSTROKE_TIME, randomNormal(keystrokeTime, TIME_KEYSTROKE_STD, this.rng));
  }

  private getFirstErrorPos(): number {
    let firstErrorPos = this.targetText.length;
    const minLength = Math.min(this.state.currentText.length, this.targetText.length);

    for (let index = 0; index < minLength; index += 1) {
      if (this.state.currentText[index] !== this.targetText[index]) {
        firstErrorPos = index;
        break;
      }
    }

    if (this.state.currentText.length > this.targetText.length && firstErrorPos === this.targetText.length) {
      firstErrorPos = this.targetText.length;
    }

    return firstErrorPos;
  }

  private shouldCorrect(firstErrorPos: number): boolean {
    const lastAction = this.state.history.at(-1)?.action ?? "";

    if (lastAction.includes("BACKSPACE")) {
      return true;
    }

    if (this.state.mentalCursorPos >= this.targetText.length) {
      return true;
    }

    if (this.state.currentText.length === 0) {
      return false;
    }

    const lastChar = this.state.currentText.at(-1) as string;
    const distance = this.state.currentText.length - firstErrorPos;

    if (WORD_BOUNDARY_CHARS.includes(lastChar)) {
      return true;
    }

    if (distance >= 2) {
      return this.rng() < DRIFT_CORRECTION_PROB;
    }

    if (distance === 1) {
      return this.rng() < PROB_NOTICE_ERROR;
    }

    return false;
  }

  private performBackspace(): TypingEvent {
    const lastAction = this.state.history.at(-1)?.action ?? "";

    if (!lastAction.includes("BACKSPACE")) {
      const reactionTime = randomNormal(TIME_REACTION_MEAN, TIME_REACTION_STD, this.rng);
      this.state.totalTime += Math.max(MIN_REACTION_TIME, reactionTime);
    }

    const backspaceTime = randomNormal(TIME_BACKSPACE_MEAN, TIME_BACKSPACE_STD, this.rng);
    this.state.totalTime += Math.max(MIN_BACKSPACE_TIME, backspaceTime);
    this.state.currentText = this.state.currentText.slice(0, -1);

    return this.appendEvent("BACKSPACE");
  }

  private typeLiteralUnsupportedChar(charIntended: string): TypingEvent {
    this.state.fatigueMultiplier = Math.min(
      FATIGUE_CAP,
      this.state.fatigueMultiplier * FATIGUE_FACTOR,
    );

    let dt = this.baseKeystrokeTime * this.state.fatigueMultiplier;
    dt = Math.max(MIN_KEYSTROKE_TIME, randomNormal(dt, TIME_KEYSTROKE_STD, this.rng));
    this.state.totalTime += dt;
    this.state.currentText += charIntended;
    this.state.lastCharTyped = charIntended;
    this.state.mentalCursorPos += 1;

    return this.appendEvent(`TYPED '${charIntended}'`);
  }

  private maybeTypeSwap(charIntended: string): TypingEvent | null {
    if (this.targetText.length <= this.state.mentalCursorPos + 1) {
      return null;
    }

    const charAfter = this.targetText[this.state.mentalCursorPos + 1] as string;

    if (charAfter === " " || charAfter === charIntended || this.rng() >= PROB_SWAP_ERROR) {
      return null;
    }

    const dt1 = this.calculateKeystrokeTime(charAfter);
    this.state.totalTime += dt1;
    this.state.currentText += charAfter;

    const dt2 = this.calculateKeystrokeTime(charIntended);
    this.state.totalTime += dt2;
    this.state.currentText += charIntended;

    this.state.lastCharTyped = charIntended;
    this.state.mentalCursorPos += 2;

    return this.appendEvent(`TYPED_SWAP '${charAfter}${charIntended}'`);
  }

  private typeNormalOrError(charIntended: string): TypingEvent {
    let currentProbError = PROB_ERROR;
    const wordDifficulty = getWordDifficulty(this.getCurrentWordContext() ?? "");

    if (wordDifficulty === "complex") {
      currentProbError *= COMPLEX_WORD_ERROR_MULT;
    } else if (wordDifficulty === "common") {
      currentProbError *= COMMON_WORD_ERROR_MULT;
    }

    if (this.keyboard.isComposedAccent(charIntended)) {
      currentProbError *= COMPOSED_ACCENT_ERROR_MULT;
    }

    if (this.rng() < currentProbError) {
      const wrongChar = this.keyboard.getRandomNeighbor(charIntended);
      const dt = this.calculateKeystrokeTime(wrongChar);
      this.state.totalTime += dt;
      this.state.currentText += wrongChar;
      this.state.lastCharTyped = wrongChar;
      this.state.mentalCursorPos += 1;

      return this.appendEvent(`TYPED_ERROR '${wrongChar}'`);
    }

    const dt = this.calculateKeystrokeTime(charIntended);
    this.state.totalTime += dt;
    this.state.currentText += charIntended;
    this.state.lastCharTyped = charIntended;
    this.state.mentalCursorPos += 1;

    return this.appendEvent(`TYPED '${charIntended}'`);
  }

  private appendEvent(action: string): TypingEvent {
    const event = {
      time: this.state.totalTime,
      action,
      text: this.state.currentText,
    };
    this.state.history.push(event);
    return event;
  }
}

function isUppercase(char: string): boolean {
  return char.toUpperCase() === char && char.toLowerCase() !== char;
}
