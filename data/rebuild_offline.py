#!/usr/bin/env python3
"""Reprocess an existing dataset offline (no API calls).

Applies the same social-science topic ordering and tree-building rules as the
main pipeline to a previously generated authors.json. Useful for improving data
quality without re-hitting the OpenAlex API (e.g. when rate limited).

  - reorders each author's topics so social-science topics come first
  - recomputes the primary topic and the 'discipline' hint
  - drops authors with no social-science topic (usually wrong-person matches)
  - rebuilds the topic tree and prunes the coauthor graph accordingly
"""

import json
import os

from build_dataset import SOCIAL_DOMAIN, OUT_DIR, WEB_DATA_DIR, has_social_topic, insert_into_tree

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = WEB_DATA_DIR


def reorder(topics):
    ordered = sorted(topics, key=lambda t: 0 if t["domain"]["name"] == SOCIAL_DOMAIN else 1)
    return ordered


def main():
    authors = json.load(open(os.path.join(SRC, "authors.json"), encoding="utf-8"))
    coauthors = json.load(open(os.path.join(SRC, "coauthors.json"), encoding="utf-8"))

    kept = []
    for a in authors:
        topics = reorder(a["topics"])
        if not has_social_topic(topics):
            print(f"  drop non-social match: {a['name']}")
            continue
        a["topics"] = topics
        a["primaryTopicId"] = topics[0]["id"]
        hints = a.get("hints", {})
        hints["discipline"] = topics[0]["field"]["name"]
        a["hints"] = hints
        kept.append(a)

    kept_ids = {a["id"] for a in kept}

    # Rebuild the topic tree.
    tree = {"id": "root", "name": "All Social Science", "level": 0, "children": []}
    leaf_by_topic = {}
    for a in kept:
        for t in a["topics"]:
            leaf = insert_into_tree(tree, t)
            leaf_by_topic.setdefault(t["id"], leaf)
        primary_leaf = leaf_by_topic.get(a["primaryTopicId"])
        if primary_leaf is not None:
            primary_leaf.setdefault("authorIds", []).append(a["id"])

    # Prune coauthor graph to kept authors.
    pruned = {}
    for aid in kept_ids:
        pruned[aid] = sorted([o for o in coauthors.get(aid, []) if o in kept_ids])

    kept.sort(key=lambda x: x.get("citedByCount", 0), reverse=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    def dump(name, obj):
        for d in (OUT_DIR, WEB_DATA_DIR):
            with open(os.path.join(d, name), "w", encoding="utf-8") as fh:
                json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))

    dump("authors.json", kept)
    dump("topicTree.json", tree)
    dump("coauthors.json", pruned)

    edges = sum(len(v) for v in pruned.values()) // 2
    print(f"\nRebuilt offline: {len(kept)} authors, {edges} coauthor edges.")


if __name__ == "__main__":
    main()
