import type { Author, GuessResult } from "../game/types";

const LEVEL_LABELS = ["Domain", "Field", "Subfield", "Topic"];

interface Rung {
  label: string;
  name: string | null;
}

/**
 * Reveal the target's research location one rung at a time. Because matched
 * ancestors are by definition shared with the target, showing them is accurate
 * and never reveals the author directly.
 */
function revealedRungs(target: Author, guesses: GuessResult[]): Rung[] {
  let bestDepth = 0;
  let bestNames: string[] = [];

  for (const g of guesses) {
    for (const tg of g.author.topics) {
      const gIds = [tg.domain.id, tg.field.id, tg.subfield.id, tg.id];
      for (const tt of target.topics) {
        const tIds = [tt.domain.id, tt.field.id, tt.subfield.id, tt.id];
        let depth = 0;
        while (depth < 4 && gIds[depth] && gIds[depth] === tIds[depth]) depth += 1;
        if (depth > bestDepth) {
          bestDepth = depth;
          bestNames = [tt.domain.name, tt.field.name, tt.subfield.name, tt.name];
        }
      }
    }
  }

  return LEVEL_LABELS.map((label, i) => ({
    label,
    name: i < bestDepth ? bestNames[i] : null,
  }));
}

export function TreeView({
  target,
  guesses,
  revealAll,
}: {
  target: Author;
  guesses: GuessResult[];
  revealAll?: boolean;
}) {
  const fullPath = (() => {
    const primary =
      target.topics.find((t) => t.id === target.primaryTopicId) ?? target.topics[0];
    return [primary.domain.name, primary.field.name, primary.subfield.name, primary.name];
  })();

  const rungs = revealAll
    ? LEVEL_LABELS.map((label, i) => ({ label, name: fullPath[i] }))
    : revealedRungs(target, guesses);

  return (
    <div className="tree-view" aria-label="Research area reveal">
      <ol className="tree-ladder">
        {rungs.map((rung, i) => {
          const revealed = rung.name !== null;
          return (
            <li key={rung.label} className="rung-wrap">
              {i > 0 && <span className="rung-arrow" aria-hidden>&rarr;</span>}
              <span className={`rung${revealed ? " revealed" : " locked"}`}>
                <span className="rung-level">{rung.label}</span>
                <span className="rung-name">{revealed ? rung.name : "???"}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
