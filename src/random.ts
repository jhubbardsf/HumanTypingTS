import type { RandomSource } from "./types.js";

export function randomNormal(mean: number, stdDev: number, rng: RandomSource = Math.random): number {
  const u1 = Math.max(Number.MIN_VALUE, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

export function randomChoice<T>(items: readonly T[], rng: RandomSource = Math.random): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty array");
  }

  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}
