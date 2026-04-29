import { Activity, CalendarDays, Flame, MessageSquareText, Swords, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { ExerciseCard } from "../components/ExerciseCard";
import { ErrorState, LoadingState } from "../components/PageState";
import { ProgressBar } from "../components/ProgressBar";
import { RankBadge } from "../components/RankBadge";
import { useI18n } from "../i18n";
import type { DashboardData } from "../types";
import { formatShortDate } from "../utils";

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Activity; label: string; value: string | number; accent: string }) {
  return (
    <div className="surface-panel p-4">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{label}</div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .dashboard(user.id)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [user]);

  const maxWeeklyPoints = useMemo(() => {
    if (!data) return 100;
    return Math.max(...data.weeklyProgress.map((item) => item.points), 100);
  }, [data]);

  function motivationalMessage(message: string) {
    const leadMatch = message.match(/^You are ahead by (\d+) points\. Protect the lead with one clean session\.$/);
    if (leadMatch) return t("You are ahead by {points} points. Protect the lead with one clean session.", { points: leadMatch[1] });

    const chaseMatch = message.match(/^(.+) is ahead by (\d+) points\. A focused workout closes the gap fast\.$/);
    if (chaseMatch) return t("{name} is ahead by {points} points. A focused workout closes the gap fast.", { name: chaseMatch[1], points: chaseMatch[2] });

    return t(message);
  }

  function workoutTitle(title: string) {
    const focusMatch = title.match(/^(.+) focus$/);
    return focusMatch ? `${t(focusMatch[1])} ${t("focus")}` : t(title);
  }

  if (error) return <ErrorState message={t(error)} />;
  if (!data) return <LoadingState label={t("Loading dashboard")} />;

  const translatedMotivation = motivationalMessage(data.motivationalMessage);

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rival-cyan/30 bg-rival-cyan/10 px-3 py-1 text-xs font-bold text-rival-cyan">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatShortDate(new Date().toISOString())}
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">{t("Today's Workout")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{translatedMotivation}</p>
          </div>
          <div className="min-w-[260px]">
            <RankBadge rank={data.rank} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label={t("Workouts completed")} value={data.stats.workoutsCompleted} accent="bg-rival-green/15 text-rival-green" />
        <StatCard icon={Trophy} label={t("Total points")} value={data.stats.totalPoints} accent="bg-rival-amber/15 text-rival-amber" />
        <StatCard icon={Flame} label={t("Current streak")} value={`${data.stats.currentStreak} ${t("days")}`} accent="bg-rival-rose/15 text-rival-rose" />
        <StatCard icon={Swords} label={t("Weekly points")} value={`+${data.stats.weeklyPoints}`} accent="bg-rival-cyan/15 text-rival-cyan" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="surface-panel p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">{workoutTitle(data.todayWorkout.title)}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("Suggested exercises based on your profile focus.")}</p>
            </div>
            <Link to="/tracker" className="ghost-button">
              {t("Start")}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.todayWorkout.exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} compact />
            ))}
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Rival Comparison")}</h2>
          {data.friendComparison ? (
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-200">{data.user.username}</span>
                  <span className="text-rival-green">{data.stats.totalPoints}</span>
                </div>
                <ProgressBar value={data.stats.totalPoints} max={Math.max(data.stats.totalPoints, data.friendComparison.stats.totalPoints, 1)} color="green" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-200">{data.friendComparison.user.username}</span>
                  <span className="text-rival-cyan">{data.friendComparison.stats.totalPoints}</span>
                </div>
                <ProgressBar
                  value={data.friendComparison.stats.totalPoints}
                  max={Math.max(data.stats.totalPoints, data.friendComparison.stats.totalPoints, 1)}
                  color="cyan"
                />
              </div>
            </div>
          ) : null}
          <div className="mt-6 rounded-lg border border-rival-amber/20 bg-rival-amber/10 p-4">
            <div className="flex gap-3">
              <MessageSquareText className="h-5 w-5 shrink-0 text-rival-amber" />
              <p className="text-sm leading-6 text-slate-200">{translatedMotivation}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Weekly Progress")}</h2>
          <div className="mt-5 space-y-4">
            {data.weeklyProgress.map((day) => (
              <div key={day.date}>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-300">{day.day}</span>
                  <span className="text-slate-500">{day.points} {t("pts")} - {day.workouts} {t("workouts")}</span>
                </div>
                <ProgressBar value={day.points} max={maxWeeklyPoints} color={day.workouts > 0 ? "green" : "cyan"} />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Recent Workouts")}</h2>
          <div className="mt-5 space-y-3">
            {data.recentWorkouts.length > 0 ? (
              data.recentWorkouts.map((workout) => (
                <div key={workout.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-bold text-white">{formatShortDate(workout.workoutDate)}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip">+{workout.totalPoints} {t("pts")}</span>
                      <span className="chip">{workout.totalCalories} cal</span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-400">
                    {workout.exercises.map((exercise) => exercise.name).join(", ")}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t("No saved workouts yet.")}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
