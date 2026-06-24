import { useEffect, useMemo, useRef, useState } from "react";
import { authorsByName } from "../data";
import type { Author } from "../game/types";

interface Props {
  onGuess: (author: Author) => void;
  guessedIds: Set<string>;
  disabled?: boolean;
}

const MAX_SUGGESTIONS = 8;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function GuessInput({ onGuess, guessedIds, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return authorsByName
      .filter((a) => normalize(a.name).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(author: Author) {
    if (guessedIds.has(author.id)) return;
    onGuess(author);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = matches[active];
      if (choice) submit(choice);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="guess-input" ref={rootRef}>
      <input
        type="text"
        value={query}
        placeholder={disabled ? "Game over" : "Guess a social scientist..."}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        aria-label="Guess a social scientist"
      />
      {open && matches.length > 0 && (
        <ul className="suggestions" role="listbox">
          {matches.map((a, i) => {
            const already = guessedIds.has(a.id);
            return (
              <li
                key={a.id}
                role="option"
                aria-selected={i === active}
                className={`suggestion${i === active ? " active" : ""}${already ? " used" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(a);
                }}
              >
                <span className="suggestion-name">{a.name}</span>
                <span className="suggestion-meta">{a.hints.discipline}</span>
                {already && <span className="suggestion-used">guessed</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
