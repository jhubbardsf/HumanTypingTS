export type KeyboardLayoutName = "qwerty" | "azerty";
export type RandomSource = () => number;

export interface TypingEvent {
  time: number;
  action: string;
  text: string;
}

export interface TypingState {
  currentText: string;
  targetText: string;
  totalTime: number;
  history: TypingEvent[];
  lastCharTyped: string | null;
  fatigueMultiplier: number;
  mentalCursorPos: number;
}

export interface MarkovTyperOptions {
  targetWpm?: number;
  layout?: KeyboardLayoutName;
  rng?: RandomSource;
}

export interface HumanTyperOptions {
  wpm?: number;
  layout?: KeyboardLayoutName;
  rng?: RandomSource;
  sleep?: SleepFunction;
}

export type SleepFunction = (seconds: number) => Promise<void>;

export interface PressableTarget {
  press(key: string, options?: Record<string, unknown>): Promise<void>;
  pressSequentially?(text: string, options?: Record<string, unknown>): Promise<void>;
  type?(text: string, options?: Record<string, unknown>): Promise<void>;
}

export interface KeyboardTarget {
  keyboard: {
    press(key: string, options?: Record<string, unknown>): Promise<void>;
    type(text: string, options?: Record<string, unknown>): Promise<void>;
  };
}

export type PlaywrightTypingTarget = PressableTarget | KeyboardTarget;
