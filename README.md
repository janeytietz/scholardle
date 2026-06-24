# Scholardle - Social Science Author Guessing Game

A browser game in the spirit of Metazooa: guess the hidden social-science author.
After each guess you get a "warmth" signal based on how closely your guess's
research overlaps the target in a topic hierarchy (Domain -> Field -> Subfield ->
Topic), plus a coauthorship "collaboration distance" badge.

## How closeness works

- Topic warmth: every author is tagged (via OpenAlex) with research topics, each
  carrying a full hierarchy. A guess is scored by the deepest shared ancestor
  across all topic pairs with the target: same Topic (hottest) > Subfield > Field
  > Domain > nothing.
- Coauthor link: a coauthorship graph (derived from shared works) yields a
  degrees-of-separation badge (direct collaborator, shares a coauthor, etc.).
- The reveal ladder uncovers the target's research location one rung at a time as
  guesses get warmer, never revealing the author directly.

## Project layout

- `data/` - offline pipeline
  - `seed_authors.json` - curated guessable author list
  - `build_dataset.py` - resolves authors via OpenAlex, builds topics, coauthor
    graph, and the topic tree; writes JSON into `data/out/` and `web/src/data/`
- `web/` - Vite + React + TypeScript app
  - `src/game/` - game logic (warmth LCA, coauthor BFS, daily selection) + tests
  - `src/components/` - UI components
  - `src/data/` - generated dataset (committed build output)

## Rebuild the dataset

```bash
cd data
OPENALEX_MAILTO="you@example.com" python3 build_dataset.py
```

This calls the public OpenAlex API (no key needed) and regenerates
`authors.json`, `topicTree.json`, and `coauthors.json`. To add or remove
guessable authors, edit `seed_authors.json` and rerun. You can pin a specific
match by adding `"openalex_id": "A123..."` to a seed entry.

## Run the app

```bash
cd web
npm install
npm run dev      # local dev server
npm test         # run game-logic unit tests
npm run build    # production build into web/dist
```

## Deploy

`web/dist` is a fully static bundle (data is baked in, no backend). Deploy it to
Netlify, Vercel, GitHub Pages, or any static host. The Vite `base` is relative,
so it works from a subpath too.
