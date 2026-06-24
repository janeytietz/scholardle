import type { Stats } from "../game/useStats";

function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

export function StatsBar({ stats }: { stats: Stats }) {
  const cells = [
    { label: "Played", value: stats.played },
    { label: "Win %", value: winRate(stats) },
    { label: "Streak", value: stats.currentStreak },
    { label: "Max streak", value: stats.maxStreak },
  ];
  return (
    <div className="stats-bar">
      {cells.map((c) => (
        <div key={c.label} className="stat-cell">
          <span className="stat-value">{c.value}</span>
          <span className="stat-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
