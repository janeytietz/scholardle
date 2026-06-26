import type {
  Author,
  AuthorTopic,
  CoauthorGraph,
  GuessResult,
  WarmthTier,
} from "./types";

// The "domain" level is intentionally excluded: every author in this pool is
// in the social sciences, so a shared domain is trivially true and uninformative.
// The broadest meaningful match is the field.

/** Hierarchy path of ids for a topic, shallow to deep (field -> topic). */
function topicIdPath(t: AuthorTopic): string[] {
  return [t.field.id, t.subfield.id, t.id];
}

/** Hierarchy path of names for a topic, shallow to deep (field -> topic). */
function topicNamePath(t: AuthorTopic): string[] {
  return [t.field.name, t.subfield.name, t.name];
}

const TIER_BY_DEPTH: WarmthTier[] = ["none", "field", "subfield", "topic"];

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
      while (depth < 3 && aIds[depth] && aIds[depth] === bIds[depth]) {
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

/** Diacritic-insensitive "lastname|firstInitial" key for loose name matching. */
function nameKey(name: string): string {
  const norm = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, " ");
  const parts = norm.split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return `${parts[parts.length - 1]}|${parts[0][0] ?? ""}`;
}

/** The day the rotation starts counting from. */
const ANCHOR_KEY = "2026-06-26";

/**
 * The behavioral-science / nudge realm. These authors lead the rotation
 * (in a shuffled order) before the puzzle branches out to the wider field.
 */
const REALM_NAMES = [
  "Stanley Milgram", "Daniel Kahneman", "Amos Tversky", "Richard Thaler",
  "Cass Sunstein", "George Loewenstein", "Colin Camerer", "Dan Ariely",
  "Robert Cialdini", "Walter Mischel", "Angela Duckworth", "Carol Dweck",
  "Jonathan Haidt", "Daniel Gilbert", "Elizabeth Loftus", "Leon Festinger",
  "Philip Zimbardo", "Solomon Asch", "Albert Bandura", "Roy Baumeister",
  "Paul Ekman", "Martin Seligman", "Mihaly Csikszentmihalyi", "Gerd Gigerenzer",
  "Paul Slovic", "Gordon Pennycook", "David Rand", "Sendhil Mullainathan",
  "Eldar Shafir", "Matthew Rabin", "David Laibson", "Robert Shiller",
  "Katherine Milkman", "Uri Gneezy", "John List", "Ernst Fehr",
  "Esther Duflo", "Abhijit Banerjee", "Daniel Goleman", "Howard Gardner",
  "Steven Pinker", "Daniel Goldstein", "Eric Johnson", "Elke Weber",
  "George Akerlof", "Herbert Simon", "Gary Becker",
];

/** In-place deterministic Fisher-Yates shuffle. */
function deterministicShuffle<T>(arr: T[], seed: number): void {
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Full rotation order: the behavioral-science realm (shuffled) leads, then
 * everyone else (shuffled). Fully deterministic; no author is pinned.
 */
export function dailyAuthorOrder(authors: Author[]): Author[] {
  const byKey = new Map<string, Author>();
  for (const a of authors) {
    const k = nameKey(a.name);
    if (!byKey.has(k)) byKey.set(k, a);
  }

  const realmKeys = new Set<string>();
  const realm: Author[] = [];
  for (const nm of REALM_NAMES) {
    const k = nameKey(nm);
    const a = byKey.get(k);
    if (a && !realmKeys.has(k)) {
      realmKeys.add(k);
      realm.push(a);
    }
  }

  const rest = authors.filter((a) => !realmKeys.has(nameKey(a.name)));

  deterministicShuffle(realm, 0x51ed2701);
  deterministicShuffle(rest, 0x1b873593);

  return [...realm, ...rest];
}

export function pickDailyAuthor(authors: Author[], key: string = dateKey()): Author {
  if (authors.length === 0) return authors[0];
  const order = dailyAuthorOrder(authors);
  const pos = dayNumber(key) - dayNumber(ANCHOR_KEY);
  const n = order.length;
  return order[((pos % n) + n) % n];
}

export function pickRandomAuthor(authors: Author[]): Author {
  return authors[Math.floor(Math.random() * authors.length)];
}

const TIER_RANK: Record<WarmthTier, number> = {
  none: 0,
  field: 1,
  subfield: 2,
  topic: 3,
  correct: 4,
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
  none: { label: "Different field", emoji: "\u{2B1B}", blurb: "No shared field" },
};
