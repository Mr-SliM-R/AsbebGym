import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { ExerciseCard } from "../components/ExerciseCard";
import { ErrorState, LoadingState } from "../components/PageState";
import { ProgressBar } from "../components/ProgressBar";
import { RankBadge } from "../components/RankBadge";
import { UserAvatar } from "../components/UserAvatar";
import { useI18n } from "../i18n";
import type { DashboardData, LeaderboardEntry, PersonalRecordBoard } from "../types";
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

function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {entries.slice(0, 3).map((entry) => (
        <div key={entry.user.id} className="surface-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar avatar={entry.user.avatar} name={entry.user.username} size="md" />
              <div>
                <div className="flex items-center gap-2 font-black text-white">
                  {entry.place === 1 ? <Crown className="h-4 w-4 text-rival-amber" /> : <Medal className="h-4 w-4 text-slate-400" />}
                  #{entry.place} {entry.user.username}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{entry.stats.totalPoints} {t("pts")}</div>
              </div>
            </div>
            <RankBadge rank={entry.rank} compact totalPoints={entry.stats.totalPoints} />
          </div>
          <div className="mt-4">
            <ProgressBar value={entry.rank.progress} color={entry.place === 1 ? "green" : "cyan"} label={`${entry.rank.progress}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyChallengePanel({ data }: { data: DashboardData["weeklyChallenges"] }) {
  const { t } = useI18n();

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("Weekly Challenges")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("Current weekly leaderboard")}</p>
        </div>
        <Link to="/challenges" className="ghost-button">
          <Trophy className="h-4 w-4" />
          {t("View")}
        </Link>
      </div>
      <div className="mt-5 space-y-4">
        {data.challenges.slice(0, 5).map((challenge) => {
          const leader = challenge.leaderboard[0];
          return (
            <div key={challenge.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-white">{t(challenge.title)}</div>
                  <div className="mt-1 text-sm text-slate-500">{t(challenge.description)}</div>
                </div>
                {leader ? (
                  <span className="chip shrink-0">
                    <Crown className="mr-1.5 h-3.5 w-3.5 text-rival-amber" />
                    {leader.user.username}: {leader.label}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgesPreview({ badges }: { badges: DashboardData["badges"] }) {
  const { t } = useI18n();

  return (
    <div className="surface-panel p-5">
      <h2 className="text-xl font-black text-white">{t("Badges / Quests")}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {badges.slice(0, 8).map((badge) => (
          <div
            key={badge.id}
            className={`rounded-lg border p-3 ${badge.unlocked ? "border-rival-green/25 bg-rival-green/10" : "border-white/10 bg-white/[0.035] opacity-70"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${badge.unlocked ? "bg-rival-green/15 text-rival-green" : "bg-white/[0.055] text-slate-500"}`}>
                {badge.unlocked ? <ShieldCheck className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white">{t(badge.title)}</div>
                <div className="text-xs text-slate-500">{badge.unlocked ? t("Unlocked") : t("Quest")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordsPanel({ boards }: { boards: PersonalRecordBoard[] }) {
  const { t } = useI18n();

  return (
    <div className="surface-panel p-5">
      <h2 className="text-xl font-black text-white">{t("Personal Records Leaderboard")}</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-3 pr-4">{t("Exercise")}</th>
              <th className="py-3 pr-4">#1</th>
              <th className="py-3 pr-4">#2</th>
              <th className="py-3 pr-4">#3</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((board) => (
              <tr key={board.key} className="border-b border-white/10 last:border-0">
                <td className="py-3 pr-4 font-bold text-white">{t(board.label)}</td>
                {board.records.slice(0, 3).map((entry) => (
                  <td key={entry.user.id} className="py-3 pr-4 text-slate-300">
                    <span className="font-bold text-white">{entry.user.username}</span>
                    <span className="ml-2 text-slate-500">{entry.displayValue}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlyLoserPanel({ data }: { data: DashboardData["monthlyLoser"] }) {
  const { t } = useI18n();

  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("Monthly Loser")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t(data.status)}</p>
        </div>
        <span className="chip">{data.points} {t("pts")}</span>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-rival-rose/25 bg-rival-rose/10 p-4">
        <UserAvatar avatar={data.user.avatar} name={data.user.username} size="md" className="bg-rival-rose/15 text-rival-rose" />
        <div>
          <div className="font-black text-white">{data.user.username}</div>
          <div className="text-sm text-slate-400">{t("Lowest monthly points so far")}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {data.punishments.map((punishment) => (
          <span key={punishment} className="chip">{t(punishment)}</span>
        ))}
      </div>
    </div>
  );
}

function ProgressChartsPanel({ data }: { data: DashboardData["progressCharts"] }) {
  const { t } = useI18n();
  const maxVolume = Math.max(...data.volumeByWeek.map((week) => week.volume), 1);
  const maxMuscleSets = Math.max(...data.muscleBalance.map((muscle) => muscle.sets), 1);

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("Progress Charts")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("Volume, muscle balance, and recent records.")}</p>
        </div>
        <BarChart3 className="h-5 w-5 text-rival-cyan" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-200">
            <TrendingUp className="h-4 w-4 text-rival-green" />
            {t("Training volume")}
          </div>
          <div className="flex h-40 items-end gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            {data.volumeByWeek.map((week) => (
              <div key={week.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <div
                  className="min-h-2 rounded-t bg-rival-green/80"
                  style={{ height: `${Math.max(week.volume / maxVolume, 0.05) * 100}%` }}
                  title={`${week.volume}`}
                />
                <div className="truncate text-center text-[10px] font-bold text-slate-500">{week.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-black text-slate-200">{t("Muscle balance")}</div>
          <div className="space-y-3">
            {data.muscleBalance.slice(0, 6).map((muscle) => (
              <div key={muscle.muscleGroup}>
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span className="text-slate-300">{t(muscle.muscleGroup)}</span>
                  <span className="text-slate-500">{muscle.sets} {t("sets")}</span>
                </div>
                <ProgressBar value={muscle.sets} max={maxMuscleSets} color="cyan" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.personalRecordTrend.slice(0, 6).map((record) => (
          <div key={`${record.exerciseId}-${record.achievedAt}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="text-sm font-black text-white">{record.exerciseName}</div>
            <div className="mt-1 text-xs font-semibold text-rival-amber">{record.label}</div>
            <div className="mt-1 text-[11px] text-slate-500">{formatShortDate(record.achievedAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeedPanel({ items }: { items: DashboardData["activityFeed"] }) {
  const { t } = useI18n();

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("Activity Feed")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("Live rivalry events from your group.")}</p>
        </div>
        <Radio className="h-5 w-5 text-rival-green" />
      </div>
      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <UserAvatar avatar={item.user.avatar} name={item.user.username} size="sm" />
              <div className="min-w-0">
                <div className="font-bold text-white">{t(item.title)}</div>
                <div className="mt-1 text-sm text-slate-400">{t(item.description)}</div>
                <div className="mt-1 text-xs font-semibold text-slate-600">{formatShortDate(item.createdAt)}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{t("No activity yet.")}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    if (!user) return Promise.resolve();
    setError(null);
    return api
      .dashboard(user.id)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  async function handleDailyCheckIn() {
    if (!user) return;
    setCheckingIn(true);
    setCheckInMessage(null);

    try {
      const result = await api.dailyCheckIn(user.id);
      setCheckInMessage(t(result.message));
      await loadDashboard();
    } catch (err) {
      setCheckInMessage(err instanceof Error ? t(err.message) : t("Check-in failed."));
    } finally {
      setCheckingIn(false);
    }
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">{t("Gym Rival")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{translatedMotivation}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button className="neon-button" type="button" onClick={handleDailyCheckIn} disabled={checkingIn || data.todayCheckIn.completed}>
                <CheckCircle2 className="h-4 w-4" />
                {data.todayCheckIn.completed ? t("Workout checked in") : checkingIn ? t("Saving") : t("I completed today's workout")}
              </button>
              {checkInMessage ? <span className="text-sm font-bold text-rival-cyan">{checkInMessage}</span> : null}
            </div>
          </div>
          <div className="min-w-[260px]">
            <RankBadge rank={data.rank} totalPoints={data.stats.totalPoints} />
          </div>
        </div>
      </section>

      <LeaderboardPreview entries={data.leaderboard} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label={t("Workouts completed")} value={data.stats.workoutsCompleted} accent="bg-rival-green/15 text-rival-green" />
        <StatCard icon={Trophy} label={t("Total points")} value={data.stats.totalPoints} accent="bg-rival-amber/15 text-rival-amber" />
        <StatCard icon={Flame} label={t("Current streak")} value={`${data.stats.currentStreak} ${t("days")}`} accent="bg-rival-rose/15 text-rival-rose" />
        <StatCard icon={Swords} label={t("Weekly points")} value={`+${data.stats.weeklyPoints}`} accent="bg-rival-cyan/15 text-rival-cyan" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-panel p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">{workoutTitle(data.todayWorkout.title)}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("Suggested exercises based on your profile focus.")}</p>
            </div>
            <Link to="/tracker" className="ghost-button">
              <Dumbbell className="h-4 w-4" />
              {t("Start")}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.todayWorkout.exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} compact />
            ))}
          </div>
        </div>

        <div className="space-y-6">
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
          <MonthlyLoserPanel data={data.monthlyLoser} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WeeklyChallengePanel data={data.weeklyChallenges} />
        <BadgesPreview badges={data.badges} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProgressChartsPanel data={data.progressCharts} />
        <ActivityFeedPanel items={data.activityFeed} />
      </section>

      <RecordsPanel boards={data.personalRecordBoards} />

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
