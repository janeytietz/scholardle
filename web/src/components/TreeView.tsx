import type { Author, GuessResult } from "../game/types";
import { significantFields } from "../game/logic";

const MAX_FIELDS = 4;
const RANK_LABELS = ["Primary field", "Also works in", "Also works in", "Also works in"];

interface Rung {
  label: string;
  name: string;
  revealed: boolean;
}

/**
 * Reveal the target's fields of study one at a time. A field unlocks once any
 * guess shares it, so what's shown is always something a guess has confirmed.
 */
export function TreeView({
  target,
  guesses,
  revealAll,
}: {
  target: Author;
  guesses: GuessResult[];
  revealAll?: boolean;
}) {
  const targetFields = significantFields(target).slice(0, MAX_FIELDS);

  const sharedSet = new Set<string>();
  for (const g of guesses) {
    const gf = new Set(significantFields(g.author));
    for (const f of targetFields) if (gf.has(f)) sharedSet.add(f);
  }

  const rungs: Rung[] = targetFields.map((name, i) => ({
    label: RANK_LABELS[i] ?? "Also works in",
    name,
    revealed: Boolean(revealAll) || sharedSet.has(name),
  }));

  return (
    <div className="tree-view" aria-label="Fields of study reveal">
      <ol className="tree-ladder">
        {rungs.map((rung, i) => (
          <li key={rung.name} className="rung-wrap">
            {i > 0 && <span className="rung-arrow" aria-hidden>&rarr;</span>}
            <span className={`rung${rung.revealed ? " revealed" : " locked"}`}>
              <span className="rung-level">{rung.label}</span>
              <span className="rung-name">{rung.revealed ? rung.name : "???"}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="tree-hint">
        Fields come from Semantic Scholar. Each unlocks when one of your guesses
        works in it.
      </p>
    </div>
  );
}
