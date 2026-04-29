import {
  CalendarCheck,
  CircleDot,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Mountain,
  Shield,
  Trophy
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/PageState";
import { RankBadge } from "../components/RankBadge";
import type { Badge, ProfileData } from "../types";
import { formatDate, formatShortDate } from "../utils";

const badgeIconMap = {
  Medal,
  Dumbbell,
  Shield,
  Mountain,
  CircleDot,
  Flame,
  Crown,
  CalendarCheck
};

function BadgePill({ badge }: { badge: Badge }) {
  const Icon = badgeIconMap[badge.icon as keyof typeof badgeIconMap] ?? Medal;

  return (
    <div className="surface-panel p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rival-amber/15 text-rival-amber">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-white">{badge.title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">{badge.description}</div>
          <div className="mt-2 text-xs font-bold text-slate-500">{formatDate(badge.earnedAt)}</div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.profile(user.id).then(setProfile).catch((err: Error) => setError(err.message));
  }, [user]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <LoadingState label="Loading profile" />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-rival-green/15 text-3xl font-black text-rival-green">
              {profile.user.avatar}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{profile.user.username}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip">{profile.user.weightGoal}</span>
                <span className="chip">{profile.user.favoriteMuscleGroup}</span>
              </div>
            </div>
          </div>
          <div className="min-w-[280px]">
            <RankBadge rank={profile.rank} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">Points</div>
          <div className="mt-2 text-3xl font-black text-white">{profile.stats.totalPoints}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">Weekly</div>
          <div className="mt-2 text-3xl font-black text-rival-green">+{profile.stats.weeklyPoints}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">Workouts</div>
          <div className="mt-2 text-3xl font-black text-white">{profile.stats.workoutsCompleted}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">Streak</div>
          <div className="mt-2 text-3xl font-black text-rival-rose">{profile.stats.currentStreak}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">Badges Earned</h2>
          <div className="mt-5 grid gap-3">
            {profile.badges.length > 0 ? (
              profile.badges.map((badge) => <BadgePill key={badge.id} badge={badge} />)
            ) : (
              <p className="text-sm text-slate-500">No badges yet.</p>
            )}
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">Personal Records</h2>
          <div className="mt-5 space-y-3">
            {profile.personalRecords.length > 0 ? (
              profile.personalRecords.map((record) => (
                <div key={record.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-white">{record.exerciseName}</div>
                    <div className="mt-1 text-sm text-slate-500">{record.muscleGroup} - {formatShortDate(record.achievedAt)}</div>
                  </div>
                  <div className="chip">
                    <Trophy className="mr-1.5 h-3.5 w-3.5 text-rival-amber" />
                    {record.weight}kg x {record.reps}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No personal records yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="surface-panel p-5">
        <h2 className="text-xl font-black text-white">Workout History</h2>
        <div className="mt-5 space-y-3">
          {profile.workoutHistory.length > 0 ? (
            profile.workoutHistory.map((workout) => (
              <div key={workout.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-black text-white">{formatDate(workout.workoutDate)}</div>
                    <div className="mt-1 text-sm text-slate-500">{workout.notes || "Saved workout"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">+{workout.totalPoints} pts</span>
                    <span className="chip">{workout.totalCalories} cal</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {workout.exercises.map((exercise) => (
                    <span key={exercise.id} className="chip">
                      {exercise.name} - {exercise.completedSets} sets
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No workouts saved yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
