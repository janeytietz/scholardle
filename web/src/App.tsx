import { useEffect, useMemo } from "react";
import "./App.css";
import { authors } from "./data";
import { dateKey } from "./game/logic";
import { MAX_GUESSES, useGame } from "./game/useGame";
import { useStats } from "./game/useStats";
import { GuessInput } from "./components/GuessInput";
import { GuessList } from "./components/GuessList";
import { TreeView } from "./components/TreeView";
import { Hints } from "./components/Hints";
import { ResultShare } from "./components/ResultShare";
import { StatsBar } from "./components/StatsBar";
import { About } from "./components/About";

function App() {
  const game = useGame();
  const { stats, record } = useStats();
  const gameOver = game.status !== "playing";

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

  const closestCollab = game.guesses
    .map((g) => g.coauthorDistance)
    .filter((d): d is number => d !== null && d > 0)
    .sort((a, b) => a - b)[0];

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
        <section className="play-column">
          <div className="status-line">
            <span>
              {gameOver
                ? game.status === "won"
                  ? "Solved!"
                  : "Out of guesses"
                : `Guess ${game.guesses.length + 1} of ${MAX_GUESSES}`}
            </span>
            {!gameOver && (
              <span className="remaining">{game.remaining} left</span>
            )}
          </div>

          <GuessInput
            onGuess={game.guess}
            guessedIds={guessedIds}
            disabled={gameOver}
          />

          {closestCollab !== undefined && !gameOver && (
            <p className="collab-hint">
              Closest link so far:{" "}
              <strong>
                {closestCollab === 1
                  ? "a direct coauthor (1\u00B0)"
                  : `${closestCollab}\u00B0 of separation`}
              </strong>
            </p>
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

          <GuessList guesses={game.guesses} />
        </section>

        <aside className="info-column">
          <TreeView
            target={game.target}
            guesses={game.guesses}
            revealAll={gameOver}
          />
          <Hints
            target={game.target}
            guessCount={game.guesses.length}
            gameOver={gameOver}
          />
        </aside>
      </main>

      <footer className="app-footer">
        <p>
          Data from <a href="https://openalex.org">OpenAlex</a>. Warmth reflects
          shared research topics; badges reflect coauthorship.
        </p>
      </footer>
    </div>
  );
}

export default App;
