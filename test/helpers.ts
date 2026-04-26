import type { RandomSource } from "../src/index.js";

export function sequenceRng(values: number[], fallback = 0.5): RandomSource {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? fallback;
  };
}

export const noDelay = async (): Promise<void> => {};
