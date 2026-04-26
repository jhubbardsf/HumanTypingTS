const COMMON_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
]);

const COMMON_BIGRAMS = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es",
  "or", "te", "of", "ed", "is", "it", "al", "ar", "st", "to", "nt", "ng",
  "se", "ha", "as", "ou", "io", "le", "ve", "co", "me", "de", "hi", "ri",
  "ro", "ic", "ne", "ea", "ra", "ce",
]);

const PUNCTUATION_CHARS = ".,!?;:'\"-()[]{}/";

export type WordDifficulty = "common" | "complex" | "normal";

export function getWordDifficulty(word: string): WordDifficulty {
  const wordLower = stripChars(word.toLowerCase(), PUNCTUATION_CHARS);

  if (COMMON_WORDS.has(wordLower)) {
    return "common";
  }

  const isLong = wordLower.length > 8;
  const hasComplexChars = [...wordLower].some((char) => "zxqj".includes(char));

  if (isLong || hasComplexChars) {
    return "complex";
  }

  return "normal";
}

export function isCommonBigram(char1: string, char2: string): boolean {
  return COMMON_BIGRAMS.has((char1 + char2).toLowerCase());
}

function stripChars(value: string, chars: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && chars.includes(value[start] as string)) {
    start += 1;
  }

  while (end > start && chars.includes(value[end - 1] as string)) {
    end -= 1;
  }

  return value.slice(start, end);
}
