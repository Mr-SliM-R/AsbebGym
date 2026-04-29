import { Crown, Flame, Medal, Trophy } from "lucide-react";
import { useI18n } from "../i18n";
import type { LeaderboardEntry } from "../types";
import { RankBadge } from "./RankBadge";
import { UserAvatar } from "./UserAvatar";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const { t } = useI18n();

  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-white/10 bg-white/[0.035] text-xs font-bold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("Rank")}</th>
              <th className="px-4 py-3">{t("User")}</th>
              <th className="px-4 py-3">{t("Points")}</th>
              <th className="px-4 py-3">{t("Weekly")}</th>
              <th className="px-4 py-3">{t("Workouts")}</th>
              <th className="px-4 py-3">{t("Streak")}</th>
              <th className="px-4 py-3">{t("Best PRs")}</th>
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
                    <UserAvatar avatar={entry.user.avatar} name={entry.user.username} size="md" />
                    <div>
                      <div className="font-bold text-white">{entry.user.username}</div>
                      <div className="text-xs text-slate-500">{t(entry.user.weightGoal)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xl font-black text-white">{entry.stats.totalPoints}</td>
                <td className="px-4 py-4 font-bold text-rival-green">+{entry.stats.weeklyPoints}</td>
                <td className="px-4 py-4">{entry.stats.workoutsCompleted}</td>
                <td className="px-4 py-4">
                  <span className="chip">
                    <Flame className="mr-1.5 h-3.5 w-3.5 text-rival-rose" />
                    {entry.stats.currentStreak} {t("days")}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {entry.personalRecords.length > 0 ? (
                      entry.personalRecords.map((record) => (
                        <span key={record.id} className="chip">
                          <Trophy className="mr-1.5 h-3.5 w-3.5 text-rival-amber" />
                          {String(record.exerciseName)} {Number(record.weight)}{t("kg")} x {Number(record.reps)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">{t("No PR yet")}</span>
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
