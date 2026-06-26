#!/usr/bin/env python3
"""Enrich each author with (a) their top-cited papers and (b) a Semantic Scholar
"fields of study" profile, written to a sidecar the web app/build can merge in.

Why: OpenAlex's auto topic->subfield->field labels are noisy for our roster
(behavioral economists filed under "Safety Research", etc.). S2's fields of study
are a small, flat, accurate vocabulary (Economics, Psychology, Sociology,
Political Science, Mathematics, Law, ...). Aggregating them across an author's
papers gives a clean research profile we can use for category/warmth, and the
top-cited papers give us "key work" to show on the reveal card.

Output: web/src/data/authorExtras.json  (and data/out/ mirror)
  { "<authorId>": {
        "fields": [{"name": "Economics", "count": 41}, ...],   # ranked
        "keyPapers": [{"title": ..., "year": ..., "citationCount": ..., "url": ...}, ...]
   }, ... }

Reuses the cache + backoff helpers from enrich_coauthors_s2.py.
"""

import json
import os
import urllib.parse

from enrich_coauthors_s2 import (
    WEB_DATA_DIR,
    OUT_DIR,
    S2,
    get_json,
    resolve_s2_id,
)

PAPERS_PER_AUTHOR = 200
TOP_PAPERS = 3
PAPER_FIELDS = "title,year,citationCount,externalIds,fieldsOfStudy,s2FieldsOfStudy,url"


def fetch_papers(author_id: str):
    papers = []
    offset = 0
    while len(papers) < PAPERS_PER_AUTHOR:
        q = urllib.parse.urlencode({"fields": PAPER_FIELDS, "limit": 100, "offset": offset})
        data = get_json(f"{S2}/author/{author_id}/papers?{q}")
        if not data or not data.get("data"):
            break
        papers.extend(data["data"])
        nxt = data.get("next")
        if nxt is None:
            break
        offset = nxt
    return papers


def paper_fields(paper):
    names = set()
    for f in paper.get("fieldsOfStudy") or []:
        if f:
            names.add(f)
    for f in paper.get("s2FieldsOfStudy") or []:
        cat = (f or {}).get("category")
        if cat:
            names.add(cat)
    return names


def best_url(paper):
    if paper.get("url"):
        return paper["url"]
    doi = (paper.get("externalIds") or {}).get("DOI")
    if doi:
        return f"https://doi.org/{doi}"
    pid = paper.get("paperId")
    return f"https://www.semanticscholar.org/paper/{pid}" if pid else None


def main():
    authors = json.load(open(os.path.join(WEB_DATA_DIR, "authors.json"), encoding="utf-8"))
    extras = {}

    print(f"Profiling {len(authors)} authors from Semantic Scholar...")
    for i, a in enumerate(authors, 1):
        sid = resolve_s2_id(a["name"])
        if not sid:
            print(f"  [{i}/{len(authors)}] {a['name']}: no S2 id")
            extras[a["id"]] = {"fields": [], "keyPapers": []}
            continue

        papers = fetch_papers(sid)

        field_counts = {}
        for p in papers:
            for name in paper_fields(p):
                field_counts[name] = field_counts.get(name, 0) + 1
        fields = [
            {"name": n, "count": c}
            for n, c in sorted(field_counts.items(), key=lambda kv: kv[1], reverse=True)
        ]

        ranked = sorted(papers, key=lambda p: p.get("citationCount") or 0, reverse=True)
        key_papers = []
        for p in ranked[:TOP_PAPERS]:
            if not p.get("title"):
                continue
            key_papers.append({
                "title": p["title"],
                "year": p.get("year"),
                "citationCount": p.get("citationCount") or 0,
                "url": best_url(p),
            })

        extras[a["id"]] = {"fields": fields, "keyPapers": key_papers}
        top = ", ".join(f"{f['name']}({f['count']})" for f in fields[:3]) or "-"
        print(f"  [{i}/{len(authors)}] {a['name']}: {len(papers)} papers | fields: {top}")

    os.makedirs(OUT_DIR, exist_ok=True)
    for d in (OUT_DIR, WEB_DATA_DIR):
        with open(os.path.join(d, "authorExtras.json"), "w", encoding="utf-8") as fh:
            json.dump(extras, fh, ensure_ascii=False, separators=(",", ":"))

    covered = sum(1 for v in extras.values() if v["fields"])
    print(f"\nDone. {covered}/{len(authors)} authors have a field profile.")


if __name__ == "__main__":
    main()
