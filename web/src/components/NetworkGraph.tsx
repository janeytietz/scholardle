import { useMemo } from "react";
import { coauthorGraph } from "../data";
import type { Author, GuessResult, WarmthTier } from "../game/types";

const W = 640;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const MAX_R = 190;
const GOLDEN = 2.399963229728653;

const RING_BY_TIER: Record<WarmthTier, number> = {
  correct: 0.18,
  topic: 0.32,
  subfield: 0.5,
  field: 0.68,
  domain: 0.84,
  none: 1,
};

const COLOR_BY_TIER: Record<WarmthTier, string> = {
  correct: "#188038",
  topic: "#d93025",
  subfield: "#e8710a",
  field: "#f9ab00",
  domain: "#1a73e8",
  none: "#80868b",
};

interface Placed {
  id: string;
  name: string;
  x: number;
  y: number;
  tier: WarmthTier;
  wikiUrl?: string;
  coauthorOfTarget: boolean;
}

function NodeLabel({ p }: { p: Placed }) {
  const label = (
    <text className="net-label" x={p.x} y={p.y + 20} textAnchor="middle">
      {p.name}
    </text>
  );
  return p.wikiUrl ? (
    <a href={p.wikiUrl} target="_blank" rel="noreferrer">
      {label}
    </a>
  ) : (
    label
  );
}

export function NetworkGraph({
  target,
  guesses,
  gameOver,
}: {
  target: Author;
  guesses: GuessResult[];
  gameOver: boolean;
}) {
  const placed = useMemo<Placed[]>(() => {
    return guesses.map((g, i) => {
      const ring = RING_BY_TIER[g.tier] * MAX_R;
      const angle = i * GOLDEN;
      return {
        id: g.author.id,
        name: g.author.name,
        x: CX + ring * Math.cos(angle),
        y: CY + ring * Math.sin(angle),
        tier: g.tier,
        wikiUrl: g.author.wikiUrl,
        coauthorOfTarget: g.coauthorDistance === 1,
      };
    });
  }, [guesses]);

  // Coauthor edges among guessed authors.
  const edges = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < placed.length; i += 1) {
      const neighbors = coauthorGraph[placed[i].id] ?? [];
      for (let j = i + 1; j < placed.length; j += 1) {
        if (neighbors.includes(placed[j].id)) {
          out.push({ x1: placed[i].x, y1: placed[i].y, x2: placed[j].x, y2: placed[j].y });
        }
      }
    }
    return out;
  }, [placed]);

  return (
    <div className="network">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Connection network">
        {/* faint rings to read warmth distance */}
        {[0.84, 0.68, 0.5, 0.32].map((r) => (
          <circle key={r} className="net-ring" cx={CX} cy={CY} r={r * MAX_R} />
        ))}

        {/* coauthor edges between guesses */}
        {edges.map((e, i) => (
          <line key={`e${i}`} className="net-edge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
        ))}

        {/* direct coauthor links to the hidden target */}
        {placed
          .filter((p) => p.coauthorOfTarget)
          .map((p) => (
            <line
              key={`t${p.id}`}
              className="net-edge-target"
              x1={p.x}
              y1={p.y}
              x2={CX}
              y2={CY}
            />
          ))}

        {/* target node */}
        <g>
          <circle className="net-target" cx={CX} cy={CY} r={16} />
          {gameOver ? (
            target.wikiUrl ? (
              <a href={target.wikiUrl} target="_blank" rel="noreferrer">
                <text className="net-label net-target-label" x={CX} y={CY - 24} textAnchor="middle">
                  {target.name}
                </text>
              </a>
            ) : (
              <text className="net-label net-target-label" x={CX} y={CY - 24} textAnchor="middle">
                {target.name}
              </text>
            )
          ) : (
            <text className="net-qmark" x={CX} y={CY + 5} textAnchor="middle">
              ?
            </text>
          )}
        </g>

        {/* guess nodes */}
        {placed.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={11}
              fill={COLOR_BY_TIER[p.tier]}
              stroke="#222"
              strokeWidth={1}
            />
            <NodeLabel p={p} />
          </g>
        ))}
      </svg>
      {guesses.length === 0 && (
        <p className="network-empty">
          The hidden author sits at the center. Each guess joins the map &mdash;
          closer to the center means a warmer (more specific) research match, and
          lines mark coauthorship connections.
        </p>
      )}
    </div>
  );
}
