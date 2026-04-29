import { Crown, Flame, Medal, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "../types";
import { RankBadge } from "./RankBadge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-white/10 bg-white/[0.035] text-xs font-bold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Weekly</th>
              <th className="px-4 py-3">Workouts</th>
              <th className="px-4 py-3">Streak</th>
              <th className="px-4 py-3">Best PRs</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.user.id} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-lg font-black text-rival-amber">
                    {entry.place === 1 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
                    #{entry.place}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rival-cyan/15 font-black text-rival-cyan">
                      {entry.user.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-white">{entry.user.username}</div>
                      <div className="text-xs text-slate-500">{entry.user.weightGoal}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xl font-black text-white">{entry.stats.totalPoints}</td>
                <td className="px-4 py-4 font-bold text-rival-green">+{entry.stats.weeklyPoints}</td>
                <td className="px-4 py-4">{entry.stats.workoutsCompleted}</td>
                <td className="px-4 py-4">
                  <span className="chip">
                    <Flame className="mr-1.5 h-3.5 w-3.5 text-rival-rose" />
                    {entry.stats.currentStreak} days
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {entry.personalRecords.length > 0 ? (
                      entry.personalRecords.map((record) => (
                        <span key={record.id} className="chip">
                          <Trophy className="mr-1.5 h-3.5 w-3.5 text-rival-amber" />
                          {String(record.exerciseName)} {Number(record.weight)}kg x {Number(record.reps)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No PR yet</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-white/10 p-4">
        {entries.map((entry) => (
          <div key={entry.user.id} className="mb-3 last:mb-0">
            <RankBadge rank={entry.rank} />
          </div>
        ))}
      </div>
    </div>
  );
}
