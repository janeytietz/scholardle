#!/usr/bin/env python3
"""Add Wikipedia blurbs to an existing authors.json without touching OpenAlex.

Looks up each author by display name on the Wikipedia REST summary endpoint and
stores a short 'blurb'. Safe to re-run; existing blurbs are kept unless empty.
"""

import json
import os

from build_dataset import WEB_DATA_DIR, OUT_DIR, fetch_wiki_info

SRC = WEB_DATA_DIR


def main():
    path = os.path.join(SRC, "authors.json")
    authors = json.load(open(path, encoding="utf-8"))
    added = 0
    for i, a in enumerate(authors, 1):
        if a.get("blurb") and a.get("wikiUrl"):
            continue
        blurb, url = fetch_wiki_info(a["name"])
        a["blurb"] = blurb or a.get("blurb", "")
        a["wikiUrl"] = url or a.get("wikiUrl", "")
        if blurb:
            added += 1
        status = "ok" if blurb else "no page"
        print(f"  [{i}/{len(authors)}] {a['name']}: {status}")

    for d in (OUT_DIR, SRC):
        with open(os.path.join(d, "authors.json"), "w", encoding="utf-8") as fh:
            json.dump(authors, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"\nAdded {added} blurbs to {len(authors)} authors.")


if __name__ == "__main__":
    main()
