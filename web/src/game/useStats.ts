import { useCallback, useState } from "react";
import { MAX_GUESSES } from "./useGame";

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Index 0..MAX_GUESSES-1 counts wins by guess number; last bucket is losses. */
  distribution: number[];
  lastRecordedDate: string | null;
}

const STATS_KEY = "ssg:stats";

function emptyStats(): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: Array(MAX_GUESSES).fill(0),
    lastRecordedDate: null,
  };
}

function load(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stats;
      if (Array.isArray(parsed.distribution)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return emptyStats();
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(load);

  const record = useCallback(
    (date: string, won: boolean, guessCount: number) => {
      setStats((prev) => {
        if (prev.lastRecordedDate === date) return prev;
        const next: Stats = {
          ...prev,
          distribution: [...prev.distribution],
        };
        next.played += 1;
        if (won) {
          next.wins += 1;
          next.currentStreak += 1;
          next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
          const bucket = Math.min(guessCount - 1, MAX_GUESSES - 1);
          next.distribution[bucket] += 1;
        } else {
          next.currentStreak = 0;
        }
        next.lastRecordedDate = date;
        try {
          localStorage.setItem(STATS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  return { stats, record };
}
