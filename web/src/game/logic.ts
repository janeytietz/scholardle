import type { Author, CoauthorGraph, GuessResult, WarmthTier } from "./types";

// Closeness ("warmth") is computed from Semantic Scholar fields of study, a
// small, accurate, flat vocabulary (Economics, Psychology, Sociology, Political
// Science, Mathematics, Law, ...). For each author we take their "significant"
// fields (those that appear across enough of their papers); the first is their
// primary field. Two authors are warmer the more of these fields they share.

/** Stable id for a field, used to group guesses in the network map. */
export function fieldId(name: string): string {
  return `field:${name.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * An author's significant fields, most prominent first. Falls back to the
 * OpenAlex topic field names for any author missing a Semantic Scholar profile.
 */
export function significantFields(a: Author): string[] {
  const fs = a.fields ?? [];
  if (fs.length > 0) {
    const top = fs[0].count;
    const threshold = Math.max(3, top * 0.15);
    const sig = fs.filter((f) => f.count >= threshold).map((f) => f.name);
    return sig.length ? sig : [fs[0].name];
  }
  const names: string[] = [];
  for (const t of a.topics) {
    if (t.field?.name && !names.includes(t.field.name)) names.push(t.field.name);
  }
  return names;
}

/** The single field an author is most associated with. */
export function primaryField(a: Author): string {
  return significantFields(a)[0] ?? a.hints.discipline ?? "";
}

/**
 * Warmth between two authors based on shared fields of study.
 *  - topic    (hot)  : same primary field AND >= 2 shared fields, or >= 3 shared
 *  - subfield (warm) : same primary field, or >= 2 shared fields
 *  - field    (cool) : share at least one field
 *  - none            : no shared field
 */
export function fieldMatch(a: Author, b: Author): {
  tier: WarmthTier;
  sharedNodeId: string | null;
  sharedLabel: string;
} {
  const aFields = significantFields(a);
  const bFields = significantFields(b);
  const bSet = new Set(bFields);
  const shared = aFields.filter((f) => bSet.has(f));

  if (shared.length === 0) {
    return { tier: "none", sharedNodeId: null, sharedLabel: "" };
  }

  const samePrimary = aFields[0] === bFields[0];
  let tier: WarmthTier;
  if ((samePrimary && shared.length >= 2) || shared.length >= 3) tier = "topic";
  else if (samePrimary || shared.length >= 2) tier = "subfield";
  else tier = "field";

  const label = shared[0];
  return { tier, sharedNodeId: fieldId(label), sharedLabel: label };
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
  const match = fieldMatch(guess, target);
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
  topic: { label: "Very close", emoji: "\u{1F525}", blurb: "Same primary field and overlapping research" },
  subfield: { label: "Same primary field", emoji: "\u{1F7E7}", blurb: "Shares a primary field of study" },
  field: { label: "Shared field", emoji: "\u{1F7E8}", blurb: "Works in a field this author also works in" },
  none: { label: "No shared field", emoji: "\u{2B1B}", blurb: "No field of study in common" },
};
