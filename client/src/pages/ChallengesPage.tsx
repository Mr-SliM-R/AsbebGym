import { Crown, Flame, Medal, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ErrorState, LoadingState } from "../components/PageState";
import { ProgressBar } from "../components/ProgressBar";
import { UserAvatar } from "../components/UserAvatar";
import { useI18n } from "../i18n";
import type { WeeklyChallengeSummary } from "../types";
import { formatShortDate } from "../utils";

export function ChallengesPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<WeeklyChallengeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .weeklyChallenges()
      .then(setSummary)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={t(error)} />;
  if (!summary) return <LoadingState label={t("Loading challenges")} />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">{t("Weekly Challenges")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("Current weekly leaderboard")}</p>
          </div>
          <span className="chip">
            <Flame className="mr-1.5 h-3.5 w-3.5 text-rival-rose" />
            {t("Week of")} {formatShortDate(summary.weekStart)}
          </span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {summary.challenges.map((challenge) => {
          const maxValue = Math.max(...challenge.leaderboard.map((entry) => entry.value), challenge.target, 1);

          return (
            <article key={challenge.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rival-amber/15 text-rival-amber">
                    <Target className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-black text-white">{t(challenge.title)}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{t(challenge.description)}</p>
                </div>
                <span className="chip shrink-0">+{challenge.points}</span>
              </div>

              <div className="mt-5 space-y-4">
                {challenge.leaderboard.map((entry) => (
                  <div key={entry.user.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatar={entry.user.avatar} name={entry.user.username} size="sm" />
                        <div>
                          <div className="flex items-center gap-2 font-bold text-white">
                            {entry.place === 1 ? <Crown className="h-4 w-4 text-rival-amber" /> : <Medal className="h-4 w-4 text-slate-500" />}
                            #{entry.place} {entry.user.username}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{entry.completed ? t("Completed") : t("In progress")}</div>
                        </div>
                      </div>
                      <span className="font-black text-rival-green">{entry.label}</span>
                    </div>
                    <ProgressBar value={entry.value} max={maxValue} color={entry.place === 1 ? "green" : "cyan"} />
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
