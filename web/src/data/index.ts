import type { Author, CoauthorGraph, TreeNode } from "../game/types";
import authorsJson from "./authors.json";
import treeJson from "./topicTree.json";
import coauthorsJson from "./coauthors.json";

export const authors = authorsJson as unknown as Author[];
export const topicTree = treeJson as unknown as TreeNode;
export const coauthorGraph = coauthorsJson as unknown as CoauthorGraph;

export const authorsById: Record<string, Author> = Object.fromEntries(
  authors.map((a) => [a.id, a]),
);

/** Authors sorted alphabetically for the picker. */
export const authorsByName = [...authors].sort((a, b) =>
  a.name.localeCompare(b.name),
);
