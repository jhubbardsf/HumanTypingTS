import { MarkovTyper } from "./typer.js";
import type { KeyboardLayoutName, RandomSource } from "./types.js";

export interface MonteCarloResult {
  times: number[];
  meanTime: number;
  standardDeviation: number;
  minTime: number;
  maxTime: number;
}

export interface MonteCarloOptions {
  layout?: KeyboardLayoutName;
  rng?: RandomSource;
}

export function runMonteCarlo(
  targetText: string,
  wpm: number,
  nSimulations = 100,
  options: MonteCarloOptions = {},
): MonteCarloResult {
  if (!Number.isInteger(nSimulations) || nSimulations <= 0) {
    throw new Error("nSimulations must be a positive integer");
  }

  const times: number[] = [];

  for (let index = 0; index < nSimulations; index += 1) {
    const typer = new MarkovTyper(targetText, {
      targetWpm: wpm,
      layout: options.layout,
      rng: options.rng,
    });
    const { totalTime } = typer.run();
    times.push(totalTime);
  }

  return summarizeTimes(times);
}

export function summarizeTimes(times: number[]): MonteCarloResult {
  if (times.length === 0) {
    throw new Error("times must contain at least one value");
  }

  const meanTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const variance = times.reduce((sum, time) => sum + (time - meanTime) ** 2, 0) / times.length;

  return {
    times,
    meanTime,
    standardDeviation: Math.sqrt(variance),
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}
