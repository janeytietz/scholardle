#!/usr/bin/env python3
"""Poll OpenAlex until it stops rate limiting us, then run the full pipeline.

Safe to run unattended: build_dataset.py refuses to overwrite a good dataset if
too few authors resolve, so a still-blocked run cannot destroy existing data.
"""

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

PROBE = "https://api.openalex.org/authors?search=esther%20duflo&per_page=1&mailto=social-science-game@example.com"
MAX_ATTEMPTS = 144
INTERVAL_S = 300


def probe_ok() -> bool:
    try:
        req = urllib.request.Request(PROBE, headers={"User-Agent": "ss-author-game probe"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as e:
        print(f"  probe HTTP {e.code}")
        return False
    except Exception as e:  # noqa: BLE001
        print(f"  probe error: {e}")
        return False


def run_pipeline():
    """Topics-only OpenAlex build (fits the free daily budget) + S2 coauthors."""
    env = dict(os.environ, SKIP_WORKS="1")
    print("Running topics-only build (SKIP_WORKS=1)...")
    subprocess.run([sys.executable, "-u", "build_dataset.py"], check=False, env=env)
    print("Enriching coauthor graph from Semantic Scholar...")
    subprocess.run([sys.executable, "-u", "enrich_coauthors_s2.py"], check=False)


def main():
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if probe_ok():
            print(f"OpenAlex budget available on attempt {attempt}; building...")
            run_pipeline()
            return
        print(f"[{attempt}/{MAX_ATTEMPTS}] no budget yet; waiting {INTERVAL_S}s")
        time.sleep(INTERVAL_S)
    print("Gave up waiting for the OpenAlex budget to reset.")


if __name__ == "__main__":
    main()
