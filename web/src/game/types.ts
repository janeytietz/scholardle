export interface TopicRef {
  id: string;
  name: string;
}

export interface AuthorTopic {
  id: string;
  name: string;
  subfield: TopicRef;
  field: TopicRef;
  domain: TopicRef;
  count: number;
}

export interface AuthorHints {
  era: string;
  notableWork: string;
  institution: string;
  discipline: string;
}

export interface Author {
  id: string;
  name: string;
  worksCount: number;
  citedByCount: number;
  primaryTopicId: string;
  topics: AuthorTopic[];
  blurb?: string;
  wikiUrl?: string;
  wikiImage?: string;
  hints: AuthorHints;
}

export interface TreeNode {
  id: string;
  name: string;
  /** 0 root, 1 domain, 2 field, 3 subfield, 4 topic */
  level: number;
  children: TreeNode[];
  authorIds?: string[];
}

export type CoauthorGraph = Record<string, string[]>;

/** Warmth tiers, from coldest to hottest. `correct` is the win state. */
export type WarmthTier =
  | "none"
  | "domain"
  | "field"
  | "subfield"
  | "topic"
  | "correct";

export interface GuessResult {
  author: Author;
  tier: WarmthTier;
  /** Names describing the deepest shared level, e.g. the shared field name. */
  sharedLabel: string;
  sharedNodeId: string | null;
  /** Coauthor graph distance to the target (1 = direct), or null if disconnected. */
  coauthorDistance: number | null;
}
