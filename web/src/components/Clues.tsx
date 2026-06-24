import { useState } from "react";
import type { Author } from "../game/types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** First couple of sentences of the blurb, with the author's name blanked out. */
function redactedBio(author: Author): string {
  const text = author.blurb ?? "";
  if (!text) return "";
  const snippet = text.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
  let out = snippet;
  for (const tok of author.name.split(/\s+/)) {
    const t = tok.replace(/\./g, "");
    if (t.length >= 3) {
      out = out.replace(new RegExp(escapeRegExp(t), "gi"), "\u2588\u2588\u2588\u2588");
    }
  }
  return out;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");
}

interface Clue {
  label: string;
  value: string;
  wide?: boolean;
}

function buildClues(a: Author): Clue[] {
  const primary = a.topics[0];
  const clues: Clue[] = [
    { label: "Field", value: primary?.field?.name || a.hints.discipline || "" },
    { label: "Active era", value: a.hints.era },
    { label: "Initials", value: initials(a.name) },
    { label: "Institution", value: a.hints.institution },
    { label: "Subfield", value: primary?.subfield?.name || "" },
    { label: "Notable work", value: a.hints.notableWork, wide: true },
    { label: "Bio (name hidden)", value: redactedBio(a), wide: true },
  ];
  return clues.filter((c) => c.value);
}

export function Clues({
  target,
  guessCount,
  gameOver,
}: {
  target: Author;
  guessCount: number;
  gameOver: boolean;
}) {
  const [extra, setExtra] = useState(0);
  const clues = buildClues(target);

  // One clue is revealed per guess, plus any the player asked to reveal early.
  const revealed = gameOver ? clues.length : Math.min(clues.length, guessCount + extra);
  const canRevealMore = !gameOver && revealed < clues.length;

  // Portrait sharpens as guesses accrue; fully clear once the game ends
  // (roughly clear by the last couple of guesses).
  const blur = gameOver ? 0 : Math.max(0, 18 - guessCount * 1.8);
  const revealPortrait = gameOver || blur <= 0;

  return (
    <div className="clues">
      <div className="clues-portrait">
        {target.wikiImage ? (
          <img
            className="portrait-img"
            src={target.wikiImage}
            alt={revealPortrait ? target.name : "Mystery author portrait"}
            style={{ filter: blur ? `blur(${blur}px)` : "none" }}
          />
        ) : (
          <div className="portrait-empty" aria-hidden>
            ?
          </div>
        )}
        <span className="portrait-caption">
          {revealPortrait ? target.name : "Mystery scientist"}
        </span>
      </div>

      <div className="clues-body">
        <div className="clues-head">
          <h3 className="hints-title">Clues</h3>
          {canRevealMore ? (
            <button
              type="button"
              className="btn reveal-btn"
              onClick={() => setExtra((x) => x + 1)}
            >
              Reveal a clue
            </button>
          ) : (
            !gameOver && <span className="hint-locked">all clues revealed</span>
          )}
        </div>

        <ul className="hint-list">
          {clues.map((c, i) => {
            const unlocked = i < revealed;
            return (
              <li
                key={c.label}
                className={`hint${c.wide ? " hint-wide" : ""}${unlocked ? " unlocked" : " locked"}`}
              >
                <span className="hint-label">{c.label}</span>
                {unlocked ? (
                  <span className="hint-value">{c.value}</span>
                ) : (
                  <span className="hint-locked">hidden</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
