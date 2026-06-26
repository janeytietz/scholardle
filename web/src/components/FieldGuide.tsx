import { useMemo, useState } from "react";
import { authorsByName } from "../data";
import { primaryField, significantFields } from "../game/logic";
import type { Author } from "../game/types";

function shortBlurb(text: string | undefined, max = 160): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "\u2026";
}

function ScholarCard({
  author,
  guessed,
  disabled,
  onGuess,
}: {
  author: Author;
  guessed: boolean;
  disabled: boolean;
  onGuess: (a: Author) => void;
}) {
  const fields = significantFields(author).slice(0, 3);
  const paper = author.keyPapers?.[0];
  return (
    <li className="scholar-card">
      <div className="scholar-card-top">
        {author.wikiImage ? (
          <img
            className="scholar-thumb"
            src={author.wikiImage}
            alt={author.name}
            loading="lazy"
          />
        ) : (
          <div className="scholar-thumb scholar-thumb-empty" aria-hidden>
            {author.name[0]}
          </div>
        )}
        <div className="scholar-id">
          <div className="scholar-name">{author.name}</div>
          <div className="scholar-fields">
            {fields.map((f) => (
              <span key={f} className="scholar-field-chip">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
      {author.blurb && <p className="scholar-blurb">{shortBlurb(author.blurb)}</p>}
      {paper && (
        <p className="scholar-paper">
          <span className="scholar-paper-label">Key paper:</span>{" "}
          {paper.url ? (
            <a href={paper.url} target="_blank" rel="noreferrer">
              {paper.title}
            </a>
          ) : (
            paper.title
          )}
          {paper.year ? ` (${paper.year})` : ""}
        </p>
      )}
      <div className="scholar-actions">
        {author.wikiUrl && (
          <a
            className="scholar-wiki"
            href={author.wikiUrl}
            target="_blank"
            rel="noreferrer"
          >
            Wikipedia &rarr;
          </a>
        )}
        <button
          type="button"
          className="btn scholar-guess"
          disabled={disabled || guessed}
          onClick={() => onGuess(author)}
        >
          {guessed ? "Guessed" : "Guess this"}
        </button>
      </div>
    </li>
  );
}

export function FieldGuide({
  guessedIds,
  disabled,
  onGuess,
}: {
  guessedIds: Set<string>;
  disabled: boolean;
  onGuess: (a: Author) => void;
}) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string>("All");

  const fieldOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of authorsByName) {
      const p = primaryField(a);
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return ["All", ...[...counts.keys()].sort((a, b) => a.localeCompare(b))];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return authorsByName.filter((a) => {
      if (field !== "All" && primaryField(a) !== field) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        significantFields(a).some((f) => f.toLowerCase().includes(q)) ||
        (a.blurb ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, field]);

  return (
    <div className="field-guide">
      <p className="guide-intro">
        Every scholar who can appear in the puzzle. Browse to learn the field,
        then guess straight from here.
      </p>
      <div className="guide-controls">
        <input
          type="search"
          className="guide-search"
          placeholder="Search names, fields, keywords…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="guide-filter"
          value={field}
          onChange={(e) => setField(e.target.value)}
          aria-label="Filter by field"
        >
          {fieldOptions.map((f) => (
            <option key={f} value={f}>
              {f === "All" ? "All fields" : f}
            </option>
          ))}
        </select>
      </div>
      <p className="guide-count">{filtered.length} scholars</p>
      <ul className="scholar-grid">
        {filtered.map((a) => (
          <ScholarCard
            key={a.id}
            author={a}
            guessed={guessedIds.has(a.id)}
            disabled={disabled}
            onGuess={onGuess}
          />
        ))}
      </ul>
    </div>
  );
}
