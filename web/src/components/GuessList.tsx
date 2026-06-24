import { TIER_META } from "../game/logic";
import type { GuessResult } from "../game/types";

function coauthorLabel(distance: number | null): string | null {
  if (distance === null) return null;
  if (distance === 1) return "1\u00B0 \u00B7 coauthor";
  if (distance >= 2) return `${distance}\u00B0 of separation`;
  return null;
}

function GuessRow({ result }: { result: GuessResult }) {
  const meta = TIER_META[result.tier];
  const collab = coauthorLabel(result.coauthorDistance);
  return (
    <li className={`guess-row tier-${result.tier}`}>
      <span className="guess-emoji" aria-hidden>
        {meta.emoji}
      </span>
      <span className="guess-main">
        {result.author.wikiUrl ? (
          <a
            className="guess-name"
            href={result.author.wikiUrl}
            target="_blank"
            rel="noreferrer"
          >
            {result.author.name}
          </a>
        ) : (
          <span className="guess-name">{result.author.name}</span>
        )}
        <span className="guess-detail">
          {result.tier === "correct"
            ? meta.blurb
            : result.sharedLabel
              ? `${meta.label}: ${result.sharedLabel}`
              : meta.label}
        </span>
      </span>
      {collab && <span className="collab-badge">{collab}</span>}
    </li>
  );
}

export function GuessList({ guesses }: { guesses: GuessResult[] }) {
  if (guesses.length === 0) {
    return (
      <p className="empty-guesses">
        Make a guess to see how close you are. Warmth comes from shared research
        topics; the badge shows coauthorship links.
      </p>
    );
  }
  return (
    <ul className="guess-list">
      {[...guesses].reverse().map((g) => (
        <GuessRow key={g.author.id} result={g} />
      ))}
    </ul>
  );
}
