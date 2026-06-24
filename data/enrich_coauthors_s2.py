#!/usr/bin/env python3
"""Densify the coauthor graph using the Semantic Scholar (S2) Graph API.

OpenAlex gives us the topic hierarchy that powers "warmth"; S2 is a second,
independent source of coauthorship that we use to add edges OpenAlex missed.

How it works:
  1. Load the existing authors.json (each has an OpenAlex id + display name).
  2. Resolve each author to a Semantic Scholar authorId via name search.
  3. Pull that author's papers and read every paper's author list.
  4. Whenever a coauthor's S2 id maps back to another author in our set, add an
     edge. Matching on S2 ids (not names) keeps edges exact.
  5. Merge the new edges into the existing coauthors.json (union, never lossy).

Optional: set S2_API_KEY for higher rate limits (a free key is issued instantly
at https://www.semanticscholar.org/product/api ). Without a key the public pool
is heavily throttled, so the script backs off and caches every response.
"""

import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB_DATA_DIR = os.path.join(HERE, "..", "web", "src", "data")
OUT_DIR = os.path.join(HERE, "out")
CACHE_DIR = os.path.join(HERE, ".cache", "s2")

S2 = "https://api.semanticscholar.org/graph/v1"
S2_API_KEY = os.environ.get("S2_API_KEY", "")
PAUSE_S = 0.2 if S2_API_KEY else 1.2  # public pool is ~1 req/sec
PAPERS_PER_AUTHOR = 200


def _cache_path(url: str) -> str:
    return os.path.join(CACHE_DIR, hashlib.sha1(url.encode("utf-8")).hexdigest() + ".json")


def get_json(url: str, retries: int = 6):
    cache_file = _cache_path(url)
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:  # noqa: BLE001
            pass

    headers = {"User-Agent": "ss-author-game"}
    if S2_API_KEY:
        headers["x-api-key"] = S2_API_KEY

    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            os.makedirs(CACHE_DIR, exist_ok=True)
            with open(cache_file, "w", encoding="utf-8") as fh:
                json.dump(data, fh)
            time.sleep(PAUSE_S)
            return data
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429:
                wait = min(2.0 * (2 ** attempt), 60.0)
                print(f"    429 rate limited, backing off {wait:.0f}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait)
            elif 400 <= e.code < 500:
                return None
            else:
                time.sleep(1.0 * (attempt + 1))
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.0 * (attempt + 1))
    print(f"  ! request failed: {url}\n    {last_err}")
    return None


def name_key(name: str) -> str:
    """last name + first initial, lowercased, for loose name comparison."""
    parts = [p for p in name.replace(".", " ").split() if p]
    if not parts:
        return ""
    last = parts[-1].lower()
    first_initial = parts[0][0].lower() if parts[0] else ""
    return f"{last}|{first_initial}"


def resolve_s2_id(name: str):
    q = urllib.parse.urlencode({"query": name, "fields": "name,citationCount,paperCount", "limit": 10})
    data = get_json(f"{S2}/author/search?{q}")
    if not data or not data.get("data"):
        return None
    want = name_key(name)
    matches = [c for c in data["data"] if name_key(c.get("name", "")) == want]
    pool = matches or data["data"]
    pool.sort(key=lambda c: c.get("citationCount") or 0, reverse=True)
    return pool[0].get("authorId")


def s2_coauthor_ids(author_id: str):
    """Return the set of S2 authorIds this author has shared a paper with."""
    ids = set()
    offset = 0
    fetched = 0
    while fetched < PAPERS_PER_AUTHOR:
        q = urllib.parse.urlencode({"fields": "authors", "limit": 100, "offset": offset})
        data = get_json(f"{S2}/author/{author_id}/papers?{q}")
        if not data or not data.get("data"):
            break
        for paper in data["data"]:
            for au in paper.get("authors", []):
                aid = au.get("authorId")
                if aid and aid != author_id:
                    ids.add(aid)
        fetched += len(data["data"])
        nxt = data.get("next")
        if nxt is None:
            break
        offset = nxt
    return ids


def main():
    authors_path = os.path.join(WEB_DATA_DIR, "authors.json")
    coauthors_path = os.path.join(WEB_DATA_DIR, "coauthors.json")
    authors = json.load(open(authors_path, encoding="utf-8"))
    edges = {a["id"]: set() for a in authors}
    existing = json.load(open(coauthors_path, encoding="utf-8"))
    for k, vs in existing.items():
        edges.setdefault(k, set()).update(vs)

    # Step 1+2: resolve each of our authors to an S2 id.
    print(f"Resolving {len(authors)} authors on Semantic Scholar...")
    s2_to_ours = {}
    ours_to_s2 = {}
    for i, a in enumerate(authors, 1):
        sid = resolve_s2_id(a["name"])
        if sid:
            s2_to_ours[sid] = a["id"]
            ours_to_s2[a["id"]] = sid
        print(f"  [{i}/{len(authors)}] {a['name']}: {'s2=' + sid if sid else 'not found'}")

    # Step 3+4: pull coauthors and add edges within our set.
    print("\nFetching coauthors and adding edges...")
    before = sum(len(v) for v in edges.values()) // 2
    for i, a in enumerate(authors, 1):
        sid = ours_to_s2.get(a["id"])
        if not sid:
            continue
        added = 0
        for co_sid in s2_coauthor_ids(sid):
            other = s2_to_ours.get(co_sid)
            if other and other != a["id"]:
                if other not in edges[a["id"]]:
                    added += 1
                edges[a["id"]].add(other)
                edges[other].add(a["id"])
        print(f"  [{i}/{len(authors)}] {a['name']}: +{added} new link(s)")

    out = {aid: sorted(list(v)) for aid, v in edges.items()}
    after = sum(len(v) for v in out.values()) // 2

    os.makedirs(OUT_DIR, exist_ok=True)
    for d in (OUT_DIR, WEB_DATA_DIR):
        with open(os.path.join(d, "coauthors.json"), "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"\nDone. Coauthor edges: {before} -> {after} (+{after - before}).")


if __name__ == "__main__":
    main()
