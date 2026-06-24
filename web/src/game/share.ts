import { TIER_META } from "./logic";
import { MAX_GUESSES } from "./useGame";
import type { GuessResult } from "./types";

export function buildShareText(
  guesses: GuessResult[],
  won: boolean,
  isDaily: boolean,
  dateLabel: string,
): string {
  const header = isDaily ? `Scholardle ${dateLabel}` : "Scholardle (practice)";
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = guesses.map((g) => TIER_META[g.tier].emoji).join("");
  const collab = guesses.some((g) => g.coauthorDistance === 1)
    ? "\n\u{1F517} found a collaborator"
    : "";
  return `${header} ${score}\n${grid}${collab}`;
}
