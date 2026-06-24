import { useCallback, useEffect, useMemo, useState } from "react";
import { authors, authorsById, coauthorGraph } from "../data";
import { dateKey, evaluateGuess, pickDailyAuthor, pickRandomAuthor } from "./logic";
import type { Author, GuessResult } from "./types";

export const MAX_GUESSES = 12;
export type Mode = "daily" | "practice";
export type Status = "playing" | "won" | "lost";

interface SavedDaily {
  date: string;
  targetId: string;
  guessedIds: string[];
}

const DAILY_KEY = "ssg:daily";

function loadDaily(target: Author): string[] {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as SavedDaily;
    if (saved.date === dateKey() && saved.targetId === target.id) {
      return saved.guessedIds.filter((id) => authorsById[id]);
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [];
}

export interface Game {
  mode: Mode;
  target: Author;
  guesses: GuessResult[];
  status: Status;
  remaining: number;
  guess: (author: Author) => void;
  setMode: (mode: Mode) => void;
  newPractice: () => void;
}

export function useGame(): Game {
  const [mode, setModeState] = useState<Mode>("daily");
  const [practiceSeed, setPracticeSeed] = useState(0);

  const dailyTarget = useMemo(() => pickDailyAuthor(authors), []);
  const practiceTarget = useMemo(
    () => pickRandomAuthor(authors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [practiceSeed],
  );
  const target = mode === "daily" ? dailyTarget : practiceTarget;

  const [dailyGuessedIds, setDailyGuessedIds] = useState<string[]>(() =>
    loadDaily(dailyTarget),
  );
  const [practiceGuessedIds, setPracticeGuessedIds] = useState<string[]>([]);
  const guessedIds = mode === "daily" ? dailyGuessedIds : practiceGuessedIds;

  useEffect(() => {
    if (mode !== "daily") return;
    const saved: SavedDaily = {
      date: dateKey(),
      targetId: dailyTarget.id,
      guessedIds: dailyGuessedIds,
    };
    try {
      localStorage.setItem(DAILY_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [mode, dailyGuessedIds, dailyTarget]);

  const guesses = useMemo(
    () =>
      guessedIds.map((id) => evaluateGuess(authorsById[id], target, coauthorGraph)),
    [guessedIds, target],
  );

  const status: Status = useMemo(() => {
    if (guesses.some((g) => g.tier === "correct")) return "won";
    if (guesses.length >= MAX_GUESSES) return "lost";
    return "playing";
  }, [guesses]);

  const guess = useCallback(
    (author: Author) => {
      if (status !== "playing") return;
      const setter = mode === "daily" ? setDailyGuessedIds : setPracticeGuessedIds;
      setter((prev) => (prev.includes(author.id) ? prev : [...prev, author.id]));
    },
    [mode, status],
  );

  const setMode = useCallback((next: Mode) => setModeState(next), []);

  const newPractice = useCallback(() => {
    setModeState("practice");
    setPracticeGuessedIds([]);
    setPracticeSeed((s) => s + 1);
  }, []);

  return {
    mode,
    target,
    guesses,
    status,
    remaining: MAX_GUESSES - guesses.length,
    guess,
    setMode,
    newPractice,
  };
}
