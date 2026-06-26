import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { authors } from "./data";
import { dateKey, TIER_META } from "./game/logic";
import { MAX_GUESSES, useGame } from "./game/useGame";
import { useStats } from "./game/useStats";
import { GuessInput } from "./components/GuessInput";
import { GuessList } from "./components/GuessList";
import { TreeView } from "./components/TreeView";
import { NetworkGraph } from "./components/NetworkGraph";
import { Clues } from "./components/Clues";
import { ResultShare } from "./components/ResultShare";
import { StatsBar } from "./components/StatsBar";
import { About } from "./components/About";

type Tab = "map" | "guesses" | "clues" | "area";

function connectionLabel(distance: number | null): string {
  if (distance === null) return "no coauthor link";
  if (distance === 0) return "";
  if (distance === 1) return "direct coauthor (1\u00B0)";
  return `${distance}\u00B0 of separation`;
}

function App() {
  const game = useGame();
  const { stats, record } = useStats();
  const gameOver = game.status !== "playing";
  const [tab, setTab] = useState<Tab>("map");

  useEffect(() => {
    if (game.mode === "daily" && gameOver) {
      record(dateKey(), game.status === "won", game.guesses.length);
    }
  }, [game.mode, gameOver, game.status, game.guesses.length, record]);

  const guessedIds = useMemo(
    () => new Set(game.guesses.map((g) => g.author.id)),
    [game.guesses],
  );

  if (authors.length === 0) {
    return (
      <div className="app">
        <p className="empty-data">
          No author data found. Run <code>python3 data/build_dataset.py</code> to
          generate the dataset.
        </p>
      </div>
    );
  }

  const latest = game.guesses[game.guesses.length - 1];

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1>Scholardle</h1>
          <p className="tagline">Guess the hidden behavioral scientist</p>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={game.mode === "daily" ? "mode active" : "mode"}
            onClick={() => game.setMode("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={game.mode === "practice" ? "mode active" : "mode"}
            onClick={game.newPractice}
          >
            Practice
          </button>
        </div>
      </header>

      <StatsBar stats={stats} />
      <About />

      <main className="board">
        <div className="status-line">
          <span>
            {gameOver
              ? game.status === "won"
                ? "Solved!"
                : "Out of guesses"
              : `Guess ${game.guesses.length + 1} of ${MAX_GUESSES}`}
          </span>
          {!gameOver && <span className="remaining">{game.remaining} left</span>}
        </div>

        <GuessInput onGuess={game.guess} guessedIds={guessedIds} disabled={gameOver} />

        {latest && !gameOver && (
          <div className={`latest-guess tier-${latest.tier}`}>
            <span className="latest-emoji" aria-hidden>
              {TIER_META[latest.tier].emoji}
            </span>
            <span className="latest-text">
              <strong>{latest.author.name}</strong> &mdash;{" "}
              {latest.sharedLabel
                ? `${TIER_META[latest.tier].label}: ${latest.sharedLabel}`
                : TIER_META[latest.tier].label}
              {connectionLabel(latest.coauthorDistance)
                ? ` \u00B7 ${connectionLabel(latest.coauthorDistance)}`
                : ""}
            </span>
          </div>
        )}

        {gameOver && (
          <ResultShare
            target={game.target}
            guesses={game.guesses}
            won={game.status === "won"}
            isDaily={game.mode === "daily"}
            dateLabel={dateKey()}
            onPractice={game.newPractice}
          />
        )}

        <nav className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "map"}
            className={tab === "map" ? "tab active" : "tab"}
            onClick={() => setTab("map")}
          >
            Map
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "guesses"}
            className={tab === "guesses" ? "tab active" : "tab"}
            onClick={() => setTab("guesses")}
          >
            Guesses ({game.guesses.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "clues"}
            className={tab === "clues" ? "tab active" : "tab"}
            onClick={() => setTab("clues")}
          >
            Clues
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "area"}
            className={tab === "area" ? "tab active" : "tab"}
            onClick={() => setTab("area")}
          >
            Area
          </button>
        </nav>

        <div className="tab-panel">
          {tab === "map" && (
            <NetworkGraph
              target={game.target}
              guesses={game.guesses}
              gameOver={gameOver}
            />
          )}
          {tab === "guesses" && <GuessList guesses={game.guesses} />}
          {tab === "clues" && (
            <Clues
              target={game.target}
              guessCount={game.guesses.length}
              gameOver={gameOver}
            />
          )}
          {tab === "area" && (
            <TreeView
              target={game.target}
              guesses={game.guesses}
              revealAll={gameOver}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Data from <a href="https://www.semanticscholar.org">Semantic Scholar</a>,{" "}
          <a href="https://openalex.org">OpenAlex</a>, and{" "}
          <a href="https://wikipedia.org">Wikipedia</a>. Warmth reflects shared
          fields of study; links mark coauthorship (degrees of separation, after
          Milgram).
        </p>
      </footer>
    </div>
  );
}

export default App;
