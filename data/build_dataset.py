#!/usr/bin/env python3
"""Build the static dataset for the Social Science Author Guessing Game.

Reads data/seed_authors.json, resolves each author against the OpenAlex API,
collects topic-hierarchy metadata, derives a coauthorship graph among the
resolved set, builds a union topic tree, and emits compact JSON consumed by the
web app.

Outputs (written to data/out and copied into web/src/data):
  - authors.json    list of authors with topics, hints, and primary topic
  - topicTree.json  nested Domain -> Field -> Subfield -> Topic tree
  - coauthors.json  adjacency list of coauthor edges among resolved authors

Only the Python standard library is used so no pip install is required.
"""

import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# OpenAlex asks API users to identify themselves for the faster "polite pool".
MAILTO = os.environ.get("OPENALEX_MAILTO", "social-science-game@example.com")
API = "https://api.openalex.org"

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "out")
WEB_DATA_DIR = os.path.join(HERE, "..", "web", "src", "data")
CACHE_DIR = os.path.join(HERE, ".cache")

# How many of an author's most-cited works to scan for coauthors / metadata.
WORKS_PER_AUTHOR = 100
REQUEST_PAUSE_S = 0.25  # base spacing between live requests

# Topics-only mode: skip the per-author works call to stay within OpenAlex's
# free daily budget. Topics + institution still come from the author lookup;
# the coauthor graph is then filled in separately by enrich_coauthors_s2.py.
SKIP_WORKS = os.environ.get("SKIP_WORKS", "").lower() not in ("", "0", "false", "no")


def short_id(openalex_url: str) -> str:
    """Turn 'https://openalex.org/A5111995000' into 'A5111995000'."""
    if not openalex_url:
        return ""
    return openalex_url.rstrip("/").split("/")[-1]


def _cache_path(url: str) -> str:
    return os.path.join(CACHE_DIR, hashlib.sha1(url.encode("utf-8")).hexdigest() + ".json")


def get_json(url: str, retries: int = 6):
    """Fetch JSON with an on-disk cache and 429-aware exponential backoff.

    Successful responses are cached so re-runs only fill gaps instead of
    re-hitting (and re-triggering rate limits on) the API.
    """
    cache_file = _cache_path(url)
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:  # noqa: BLE001 - ignore a corrupt cache entry
            pass

    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": f"ss-author-game ({MAILTO})"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            os.makedirs(CACHE_DIR, exist_ok=True)
            with open(cache_file, "w", encoding="utf-8") as fh:
                json.dump(data, fh)
            time.sleep(REQUEST_PAUSE_S)
            return data
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429:
                retry_after = e.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else 2.0 * (2 ** attempt)
                wait = min(wait, 60.0)
                print(f"    429 rate limited, backing off {wait:.0f}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait)
            elif 400 <= e.code < 500:
                # Genuine client error (e.g. 404 missing page) - do not retry.
                return None
            else:
                time.sleep(1.0 * (attempt + 1))
        except Exception as e:  # noqa: BLE001 - transient network errors, retry
            last_err = e
            time.sleep(1.0 * (attempt + 1))
    print(f"  ! request failed: {url}\n    {last_err}")
    return None


def resolve_author(seed: dict):
    """Resolve a seed entry to a single OpenAlex author record."""
    name = seed["name"]
    pinned = seed.get("openalex_id")
    if pinned:
        data = get_json(f"{API}/authors/{pinned}?mailto={urllib.parse.quote(MAILTO)}")
        return data

    q = urllib.parse.urlencode({"search": name, "per_page": 5, "mailto": MAILTO})
    data = get_json(f"{API}/authors?{q}")
    if not data or not data.get("results"):
        return None
    candidates = data["results"]

    def is_social(a):
        return any(
            (t.get("domain") or {}).get("display_name") == "Social Sciences"
            for t in a.get("topics", [])
        )

    social = [a for a in candidates if is_social(a)]
    pool = social or candidates
    # Prefer the most-cited plausible match.
    pool.sort(key=lambda a: a.get("cited_by_count", 0), reverse=True)
    return pool[0]


SOCIAL_DOMAIN = "Social Sciences"


def topic_paths(author_record: dict):
    """Return up to 5 topics with full hierarchy, social-science topics first.

    Reordering ensures an author's primary topic (and derived discipline) reflects
    their social-science work even when OpenAlex ranks an adjacent-field topic
    highest.
    """
    out = []
    for t in author_record.get("topics", [])[:8]:
        domain = t.get("domain") or {}
        field = t.get("field") or {}
        subfield = t.get("subfield") or {}
        if not (domain and field and subfield and t.get("id")):
            continue
        out.append(
            {
                "id": short_id(t["id"]),
                "name": t.get("display_name", ""),
                "subfield": {"id": short_id(subfield.get("id", "")), "name": subfield.get("display_name", "")},
                "field": {"id": short_id(field.get("id", "")), "name": field.get("display_name", "")},
                "domain": {"id": short_id(domain.get("id", "")), "name": domain.get("display_name", "")},
                "count": t.get("count", 0),
            }
        )
    # Stable sort: social-science topics first, original order preserved within.
    out.sort(key=lambda t: 0 if t["domain"]["name"] == SOCIAL_DOMAIN else 1)
    return out[:5]


def has_social_topic(topics) -> bool:
    return any(t["domain"]["name"] == SOCIAL_DOMAIN for t in topics)


def fetch_wiki_info(title: str):
    """Return (extract, page_url, image_url) for a title, or ('','','') if missing."""
    if not title:
        return "", "", ""
    slug = urllib.parse.quote(title.replace(" ", "_"), safe="")
    data = get_json(f"https://en.wikipedia.org/api/rest_v1/page/summary/{slug}")
    if not data or data.get("type") == "disambiguation":
        return "", "", ""
    extract = data.get("extract", "") or ""
    url = (((data.get("content_urls") or {}).get("desktop") or {}).get("page")) or ""
    image = ((data.get("thumbnail") or {}).get("source")) or (
        (data.get("originalimage") or {}).get("source")
    ) or ""
    return extract, url, image


def fetch_wiki_summary(title: str) -> str:
    return fetch_wiki_info(title)[0]


def author_wiki(rec: dict):
    """Prefer the Wikipedia page OpenAlex links to, else search by name.

    Returns (blurb, wikiUrl, wikiImage).
    """
    wiki = (rec.get("ids") or {}).get("wikipedia")
    if wiki and "/wiki/" in wiki:
        title = urllib.parse.unquote(wiki.rstrip("/").split("/wiki/")[-1])
        blurb, url, image = fetch_wiki_info(title)
        if blurb:
            return blurb, (url or wiki), image
    return fetch_wiki_info(rec.get("display_name", ""))


def fetch_works(author_id: str):
    q = urllib.parse.urlencode(
        {
            "filter": f"author.id:{author_id}",
            "per_page": WORKS_PER_AUTHOR,
            "sort": "cited_by_count:desc",
            "select": "id,title,publication_year,cited_by_count,authorships",
            "mailto": MAILTO,
        }
    )
    data = get_json(f"{API}/works?{q}")
    return (data or {}).get("results", [])


def derive_hints(seed, author_record, works, primary_topic):
    years = [w["publication_year"] for w in works if w.get("publication_year")]
    era = ""
    if years:
        lo, hi = min(years), max(years)
        era = f"{(lo // 10) * 10}s\u2013{(hi // 10) * 10}s" if lo // 10 != hi // 10 else f"{(lo // 10) * 10}s"
    notable = ""
    for w in works:
        if w.get("title"):
            notable = w["title"]
            break
    insts = author_record.get("last_known_institutions") or []
    institution = insts[0]["display_name"] if insts else ""
    discipline = primary_topic["field"]["name"] if primary_topic else seed.get("discipline", "")
    return {
        "era": era,
        "notableWork": notable,
        "institution": institution,
        "discipline": discipline,
    }


def insert_into_tree(root, topic):
    """Insert a topic's full path into the nested tree, returning the leaf node."""
    levels = [
        ("domain", topic["domain"], 1),
        ("field", topic["field"], 2),
        ("subfield", topic["subfield"], 3),
        ("topic", {"id": topic["id"], "name": topic["name"]}, 4),
    ]
    node = root
    for _, info, level in levels:
        children = node.setdefault("children", [])
        match = next((c for c in children if c["id"] == info["id"]), None)
        if match is None:
            match = {"id": info["id"], "name": info["name"], "level": level, "children": []}
            children.append(match)
        node = match
    return node


def main():
    seed_path = os.path.join(HERE, "seed_authors.json")
    with open(seed_path, "r", encoding="utf-8") as f:
        seed_doc = json.load(f)
    seeds = seed_doc["authors"]

    # Deduplicate seed entries by name.
    seen_names = set()
    unique_seeds = []
    for s in seeds:
        key = s["name"].strip().lower()
        if key in seen_names:
            continue
        seen_names.add(key)
        unique_seeds.append(s)

    print(f"Resolving {len(unique_seeds)} authors against OpenAlex...")

    resolved = {}  # short_id -> intermediate dict
    records = {}  # short_id -> raw openalex record
    for i, seed in enumerate(unique_seeds, 1):
        rec = resolve_author(seed)
        if not rec:
            print(f"  [{i}/{len(unique_seeds)}] UNRESOLVED: {seed['name']}")
            continue
        aid = short_id(rec["id"])
        if aid in resolved:
            print(f"  [{i}/{len(unique_seeds)}] duplicate match for {seed['name']} -> {aid}, skipping")
            continue
        topics = topic_paths(rec)
        if not topics:
            print(f"  [{i}/{len(unique_seeds)}] no topics for {seed['name']}, skipping")
            continue
        if not has_social_topic(topics):
            print(f"  [{i}/{len(unique_seeds)}] non-social match for {seed['name']} (likely wrong person), skipping")
            continue
        records[aid] = rec
        resolved[aid] = {
            "id": aid,
            "name": rec.get("display_name", seed["name"]),
            "seedName": seed["name"],
            "worksCount": rec.get("works_count", 0),
            "citedByCount": rec.get("cited_by_count", 0),
            "topics": topics,
            "primaryTopicId": topics[0]["id"],
            "seedDiscipline": seed.get("discipline", ""),
        }
        blurb, wiki_url, wiki_image = author_wiki(rec)
        resolved[aid]["blurb"] = blurb
        resolved[aid]["wikiUrl"] = wiki_url
        resolved[aid]["wikiImage"] = wiki_image
        print(f"  [{i}/{len(unique_seeds)}] {seed['name']} -> {rec.get('display_name')} ({aid})")

    resolved_ids = set(resolved.keys())
    print(f"\nResolved {len(resolved_ids)} unique authors. Fetching works + coauthors...")

    # Fetch works, derive coauthor edges and hints.
    edges = {aid: set() for aid in resolved_ids}
    for i, aid in enumerate(list(resolved_ids), 1):
        works = [] if SKIP_WORKS else fetch_works(aid)
        for w in works:
            for au in w.get("authorships", []):
                other = short_id((au.get("author") or {}).get("id", ""))
                if other and other != aid and other in resolved_ids:
                    edges[aid].add(other)
                    edges[other].add(aid)
        primary = resolved[aid]["topics"][0]
        resolved[aid]["hints"] = derive_hints(
            {"discipline": resolved[aid]["seedDiscipline"]}, records[aid], works, primary
        )
        suffix = " (topics-only)" if SKIP_WORKS else ""
        print(f"  [{i}/{len(resolved_ids)}] {resolved[aid]['name']}: {len(edges[aid])} coauthor link(s){suffix}")

    # Build the union topic tree and tag topic leaves with their primary authors.
    tree = {"id": "root", "name": "All Social Science", "level": 0, "children": []}
    leaf_by_topic = {}
    for aid, a in resolved.items():
        for t in a["topics"]:
            leaf = insert_into_tree(tree, t)
            leaf_by_topic.setdefault(t["id"], leaf)
        primary_leaf = leaf_by_topic.get(a["primaryTopicId"])
        if primary_leaf is not None:
            primary_leaf.setdefault("authorIds", []).append(aid)

    # Assemble final author records (drop intermediate fields).
    authors_out = []
    for aid, a in resolved.items():
        authors_out.append(
            {
                "id": aid,
                "name": a["name"],
                "worksCount": a["worksCount"],
                "citedByCount": a["citedByCount"],
                "primaryTopicId": a["primaryTopicId"],
                "topics": a["topics"],
                "blurb": a.get("blurb", ""),
                "wikiUrl": a.get("wikiUrl", ""),
                "wikiImage": a.get("wikiImage", ""),
                "hints": a.get("hints", {}),
            }
        )
    authors_out.sort(key=lambda x: x["citedByCount"], reverse=True)

    coauthors_out = {aid: sorted(list(ne2)) for aid, ne2 in edges.items()}

    # Safety: never overwrite a good dataset with a failed (rate-limited) run.
    MIN_AUTHORS = 20
    if len(authors_out) < MIN_AUTHORS:
        print(
            f"\nABORT: only {len(authors_out)} authors resolved (< {MIN_AUTHORS}); "
            "likely rate limited. Existing dataset left untouched."
        )
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    def dump(name, obj):
        for d in (OUT_DIR, WEB_DATA_DIR):
            with open(os.path.join(d, name), "w", encoding="utf-8") as fh:
                json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))

    dump("authors.json", authors_out)
    dump("topicTree.json", tree)
    dump("coauthors.json", coauthors_out)

    total_edges = sum(len(v) for v in coauthors_out.values()) // 2
    print("\nDone.")
    print(f"  authors:    {len(authors_out)}")
    print(f"  coauthor edges: {total_edges}")
    print(f"  written to {OUT_DIR} and {os.path.normpath(WEB_DATA_DIR)}")


if __name__ == "__main__":
    sys.exit(main())
