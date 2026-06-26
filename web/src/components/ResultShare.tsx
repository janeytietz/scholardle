import { useState } from "react";
import { buildShareText } from "../game/share";
import { primaryField } from "../game/logic";
import type { Author, GuessResult } from "../game/types";
import { WikiCard, hasWikiCard } from "./WikiCard";

export function ResultShare({
  target,
  guesses,
  won,
  isDaily,
  dateLabel,
  onPractice,
}: {
  target: Author;
  guesses: GuessResult[];
  won: boolean;
  isDaily: boolean;
  dateLabel: string;
  onPractice: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = buildShareText(guesses, won, isDaily, dateLabel);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your result", text);
    }
  }

  return (
    <div className="result-card">
      <h2 className={won ? "result-title won" : "result-title lost"}>
        {won ? "Solved!" : "Out of guesses"}
      </h2>
      <p className="result-answer">
        The author was{" "}
        {target.wikiUrl ? (
          <a href={target.wikiUrl} target="_blank" rel="noreferrer">
            <strong>{target.name}</strong>
          </a>
        ) : (
          <strong>{target.name}</strong>
        )}
        {primaryField(target) ? ` (${primaryField(target)})` : ""}.
      </p>
      {hasWikiCard(target) ? (
        <WikiCard author={target} />
      ) : (
        target.blurb && <p className="result-blurb">{target.blurb}</p>
      )}
      <div className="result-actions">
        <button type="button" className="btn primary" onClick={share}>
          {copied ? "Copied!" : "Share result"}
        </button>
        <button type="button" className="btn" onClick={onPractice}>
          Practice round
        </button>
      </div>
    </div>
  );
}
