import type { Author } from "../game/types";

interface HintDef {
  unlockAt: number;
  label: string;
  value: (a: Author) => string;
}

const HINTS: HintDef[] = [
  { unlockAt: 3, label: "Discipline", value: (a) => a.hints.discipline },
  { unlockAt: 5, label: "Active era", value: (a) => a.hints.era },
  { unlockAt: 7, label: "Institution", value: (a) => a.hints.institution },
  { unlockAt: 9, label: "Notable work", value: (a) => a.hints.notableWork },
];

export function Hints({
  target,
  guessCount,
  gameOver,
}: {
  target: Author;
  guessCount: number;
  gameOver: boolean;
}) {
  return (
    <div className="hints">
      <h3 className="hints-title">Hints</h3>
      <ul className="hint-list">
        {HINTS.map((h) => {
          const unlocked = gameOver || guessCount >= h.unlockAt;
          const value = h.value(target);
          return (
            <li key={h.label} className={`hint${unlocked ? " unlocked" : " locked"}`}>
              <span className="hint-label">{h.label}</span>
              {unlocked ? (
                <span className="hint-value">{value || "\u2014"}</span>
              ) : (
                <span className="hint-locked">unlocks at guess {h.unlockAt}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
