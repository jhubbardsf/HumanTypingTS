import { FAR_KEY_THRESHOLD } from "./config.js";
import { randomChoice } from "./random.js";
import type { KeyboardLayoutName, RandomSource } from "./types.js";

export class KeyboardLayout {
  readonly layoutName: KeyboardLayoutName;
  readonly grid: string[][];
  readonly directAccents: Set<string>;
  readonly composedAccents: Set<string>;

  private readonly posMap: Map<string, [number, number]>;
  private readonly rng: RandomSource;

  constructor(layoutName: KeyboardLayoutName = "qwerty", rng: RandomSource = Math.random) {
    this.layoutName = layoutName;
    this.grid = this.loadLayout(layoutName);
    this.posMap = this.buildPosMap();
    this.rng = rng;

    if (layoutName === "azerty") {
      this.directAccents = new Set([...("éèàùç")]);
      this.composedAccents = new Set([...("âêîôûäëïöü")]);
    } else {
      this.directAccents = new Set();
      this.composedAccents = new Set([...("âêîôûäëïöüéèàùç")]);
    }
  }

  hasKey(char: string): boolean {
    return this.posMap.has(this.normalizeChar(char));
  }

  getNeighborKeys(char: string): string[] {
    const normalized = this.normalizeChar(char);
    const position = this.posMap.get(normalized);

    if (!position) {
      return [];
    }

    const [row, col] = position;
    const neighbors: string[] = [];
    const deltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];

    for (const [dr, dc] of deltas) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      const gridRow = this.grid[nextRow];

      if (gridRow && nextCol >= 0 && nextCol < gridRow.length) {
        neighbors.push(gridRow[nextCol] as string);
      }
    }

    return neighbors;
  }

  getDistance(char1: string, char2: string): number {
    const position1 = this.posMap.get(this.normalizeChar(char1));
    const position2 = this.posMap.get(this.normalizeChar(char2));

    if (!position1 || !position2) {
      return FAR_KEY_THRESHOLD;
    }

    const [row1, col1] = position1;
    const [row2, col2] = position2;

    return Math.sqrt((row1 - row2) ** 2 + (col1 - col2) ** 2);
  }

  getRandomNeighbor(char: string): string {
    const wasUpper = isUppercase(char);
    const neighbors = this.getNeighborKeys(char);
    const result = neighbors.length > 0
      ? randomChoice(neighbors, this.rng)
      : randomChoice(this.grid.flat(), this.rng);

    return wasUpper ? result.toUpperCase() : result;
  }

  isDirectAccent(char: string): boolean {
    return this.directAccents.has(char.toLowerCase());
  }

  isComposedAccent(char: string): boolean {
    return this.composedAccents.has(char.toLowerCase());
  }

  private loadLayout(name: KeyboardLayoutName): string[][] {
    if (name === "qwerty") {
      return [
        [...("`1234567890-=")],
        [...("qwertyuiop[]\\")],
        [...("asdfghjkl;'")],
        [...("zxcvbnm,./")],
      ];
    }

    if (name === "azerty") {
      return [
        [...("&é\"'(-è_çà)=")],
        [...("azertyuiop^$")],
        [...("qsdfghjklmù*")],
        [...("wxcvbn,;:!")],
      ];
    }

    throw new Error(`Unsupported layout: ${JSON.stringify(name)}. Use 'qwerty' or 'azerty'.`);
  }

  private buildPosMap(): Map<string, [number, number]> {
    const mapping = new Map<string, [number, number]>();

    for (const [rowIndex, row] of this.grid.entries()) {
      for (const [colIndex, char] of row.entries()) {
        mapping.set(char, [rowIndex, colIndex]);
      }
    }

    if (this.layoutName === "azerty") {
      const azertyRow0 = "&é\"'(-è_çà)";
      const azertyDigits = "1234567890";

      for (let i = 0; i < azertyDigits.length; i += 1) {
        const digit = azertyDigits[i] as string;
        const baseChar = azertyRow0[i] as string;
        const position = mapping.get(baseChar);

        if (position && !mapping.has(digit)) {
          mapping.set(digit, position);
        }
      }
    }

    return mapping;
  }

  private normalizeChar(char: string): string {
    const lower = char.toLowerCase();

    if (this.composedAccents.has(lower)) {
      return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return lower;
  }
}

function isUppercase(char: string): boolean {
  return char.toUpperCase() === char && char.toLowerCase() !== char;
}
