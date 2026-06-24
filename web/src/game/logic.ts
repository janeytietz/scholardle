import type {
  Author,
  AuthorTopic,
  CoauthorGraph,
  GuessResult,
  WarmthTier,
} from "./types";

/** Hierarchy path of ids for a topic, shallow to deep. */
function topicIdPath(t: AuthorTopic): string[] {
  return [t.domain.id, t.field.id, t.subfield.id, t.id];
}

/** Hierarchy path of names for a topic, shallow to deep. */
function topicNamePath(t: AuthorTopic): string[] {
  return [t.domain.name, t.field.name, t.subfield.name, t.name];
}

const TIER_BY_DEPTH: WarmthTier[] = ["none", "domain", "field", "subfield", "topic"];

/**
 * Deepest shared level across every topic pair between two authors.
 * Returns matched depth (0 none .. 4 topic) plus the shared node id/label.
 */
export function bestTopicMatch(a: Author, b: Author): {
  depth: number;
  tier: WarmthTier;
  sharedNodeId: string | null;
  sharedLabel: string;
} {
  let bestDepth = 0;
  let bestNodeId: string | null = null;
  let bestLabel = "";

  for (const ta of a.topics) {
    const aIds = topicIdPath(ta);
    const aNames = topicNamePath(ta);
    for (const tb of b.topics) {
      const bIds = topicIdPath(tb);
      let depth = 0;
      while (depth < 4 && aIds[depth] && aIds[depth] === bIds[depth]) {
        depth += 1;
      }
      if (depth > bestDepth) {
        bestDepth = depth;
        bestNodeId = aIds[depth - 1] ?? null;
        bestLabel = aNames[depth - 1] ?? "";
      }
    }
  }

  return {
    depth: bestDepth,
    tier: TIER_BY_DEPTH[bestDepth],
    sharedNodeId: bestNodeId,
    sharedLabel: bestLabel,
  };
}

/** Shortest path length between two authors in the coauthor graph (BFS). */
export function coauthorDistance(
  graph: CoauthorGraph,
  from: string,
  to: string,
  maxDepth = 6,
): number | null {
  if (from === to) return 0;
  const visited = new Set<string>([from]);
  let frontier = [from];
  let distance = 0;
  while (frontier.length && distance < maxDepth) {
    distance += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const neighbor of graph[node] ?? []) {
        if (neighbor === to) return distance;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return null;
}

export function evaluateGuess(
  guess: Author,
  target: Author,
  graph: CoauthorGraph,
): GuessResult {
  if (guess.id === target.id) {
    return {
      author: guess,
      tier: "correct",
      sharedLabel: guess.name,
      sharedNodeId: guess.primaryTopicId,
      coauthorDistance: 0,
    };
  }
  const match = bestTopicMatch(guess, target);
  return {
    author: guess,
    tier: match.tier,
    sharedLabel: match.sharedLabel,
    sharedNodeId: match.sharedNodeId,
    coauthorDistance: coauthorDistance(graph, guess.id, target.id),
  };
}

/** YYYY-MM-DD in local time. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days since a fixed epoch, using the calendar date (timezone-stable). */
const EPOCH_UTC = Date.UTC(2024, 0, 1);
function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH_UTC) / 86_400_000);
}

/** Small deterministic PRNG. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed, deterministic permutation of [0, count) so days don't repeat. */
function shuffledIndices(count: number, seed = 0x9e3779b9): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Author index for a given day. Walks a fixed permutation by day number, so
 * every author is used exactly once before any repeats (a full cycle).
 */
export function dailyIndex(count: number, key: string = dateKey()): number {
  if (count <= 0) return 0;
  const perm = shuffledIndices(count);
  const n = dayNumber(key);
  return perm[((n % count) + count) % count];
}

export function pickDailyAuthor(authors: Author[], key: string = dateKey()): Author {
  return authors[dailyIndex(authors.length, key)];
}

export function pickRandomAuthor(authors: Author[]): Author {
  return authors[Math.floor(Math.random() * authors.length)];
}

const TIER_RANK: Record<WarmthTier, number> = {
  none: 0,
  domain: 1,
  field: 2,
  subfield: 3,
  topic: 4,
  correct: 5,
};

export function tierRank(t: WarmthTier): number {
  return TIER_RANK[t];
}

export const TIER_META: Record<
  WarmthTier,
  { label: string; emoji: string; blurb: string }
> = {
  correct: { label: "Correct!", emoji: "\u{1F7E9}", blurb: "You found the author" },
  topic: { label: "Same topic", emoji: "\u{1F525}", blurb: "Studies the same research topic" },
  subfield: { label: "Same subfield", emoji: "\u{1F7E7}", blurb: "Shares a subfield" },
  field: { label: "Same field", emoji: "\u{1F7E8}", blurb: "Shares a broad field" },
  domain: { label: "Same domain", emoji: "\u{1F7E6}", blurb: "Both in the social sciences" },
  none: { label: "Far away", emoji: "\u{2B1B}", blurb: "No shared research area" },
};
