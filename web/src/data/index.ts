import type {
  Author,
  CoauthorGraph,
  FieldRef,
  KeyPaper,
  TreeNode,
} from "../game/types";
import authorsJson from "./authors.json";
import treeJson from "./topicTree.json";
import coauthorsJson from "./coauthors.json";
import extrasJson from "./authorExtras.json";

type Extras = Record<string, { fields?: FieldRef[]; keyPapers?: KeyPaper[] }>;
const extras = extrasJson as unknown as Extras;

export const authors: Author[] = (authorsJson as unknown as Author[]).map((a) => {
  const extra = extras[a.id];
  return extra ? { ...a, fields: extra.fields, keyPapers: extra.keyPapers } : a;
});
export const topicTree = treeJson as unknown as TreeNode;
export const coauthorGraph = coauthorsJson as unknown as CoauthorGraph;

export const authorsById: Record<string, Author> = Object.fromEntries(
  authors.map((a) => [a.id, a]),
);

/** Authors sorted alphabetically for the picker. */
export const authorsByName = [...authors].sort((a, b) =>
  a.name.localeCompare(b.name),
);
