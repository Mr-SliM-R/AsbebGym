import {
  CalendarCheck,
  Camera,
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
import { UserAvatar } from "../components/UserAvatar";
import { useI18n } from "../i18n";
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
  const { t } = useI18n();

  return (
    <div className="surface-panel p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rival-amber/15 text-rival-amber">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-white">{t(badge.title)}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">{t(badge.description)}</div>
          <div className="mt-2 text-xs font-bold text-slate-500">{formatDate(badge.earnedAt)}</div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.profile(user.id).then(setProfile).catch((err: Error) => setError(err.message));
  }, [user]);

  async function handleAvatarFile(file: File | undefined) {
    if (!file || !profile) return;

    setAvatarMessage(null);

    if (!file.type.startsWith("image/")) {
      setAvatarMessage(t("Please choose an image file."));
      return;
    }

    if (file.size > 1_500_000) {
      setAvatarMessage(t("Upload a square image under 1.5 MB."));
      return;
    }

    setUploadingAvatar(true);

    try {
      const avatar = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(t("Upload failed.")));
        reader.readAsDataURL(file);
      });
      const result = await api.updateAvatar(profile.user.id, avatar);
      updateUser(result.user);
      setProfile((current) => (current ? { ...current, user: result.user } : current));
      setAvatarMessage(t("Profile photo updated."));
    } catch (err) {
      setAvatarMessage(err instanceof Error ? t(err.message) : t("Upload failed."));
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (error) return <ErrorState message={t(error)} />;
  if (!profile) return <LoadingState label={t("Loading profile")} />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <UserAvatar avatar={profile.user.avatar} name={profile.user.username} size="xl" className="bg-rival-green/15 text-rival-green" />
              <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-rival-cyan/30 bg-ink-950 text-rival-cyan shadow-neon transition hover:bg-rival-cyan/10">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingAvatar}
                  onChange={(event) => {
                    void handleAvatarFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{profile.user.username}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip">{t(profile.user.weightGoal)}</span>
                <span className="chip">{t(profile.user.favoriteMuscleGroup)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="ghost-button cursor-pointer">
                  <Camera className="h-4 w-4" />
                  {uploadingAvatar ? t("Saving") : t("Upload photo")}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={(event) => {
                      void handleAvatarFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <span className="text-xs font-semibold text-slate-500">{t("Upload a square image under 1.5 MB.")}</span>
              </div>
              {avatarMessage ? <div className="mt-2 text-xs font-bold text-rival-cyan">{avatarMessage}</div> : null}
            </div>
          </div>
          <div className="min-w-[280px]">
            <RankBadge rank={profile.rank} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Points")}</div>
          <div className="mt-2 text-3xl font-black text-white">{profile.stats.totalPoints}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Weekly")}</div>
          <div className="mt-2 text-3xl font-black text-rival-green">+{profile.stats.weeklyPoints}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Workouts")}</div>
          <div className="mt-2 text-3xl font-black text-white">{profile.stats.workoutsCompleted}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Streak")}</div>
          <div className="mt-2 text-3xl font-black text-rival-rose">{profile.stats.currentStreak}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Badges Earned")}</h2>
          <div className="mt-5 grid gap-3">
            {profile.badges.length > 0 ? (
              profile.badges.map((badge) => <BadgePill key={badge.id} badge={badge} />)
            ) : (
              <p className="text-sm text-slate-500">{t("No badges yet.")}</p>
            )}
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Personal Records")}</h2>
          <div className="mt-5 space-y-3">
            {profile.personalRecords.length > 0 ? (
              profile.personalRecords.map((record) => (
                <div key={record.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-white">{record.exerciseName}</div>
                    <div className="mt-1 text-sm text-slate-500">{t(record.muscleGroup)} - {formatShortDate(record.achievedAt)}</div>
                  </div>
                  <div className="chip">
                    <Trophy className="mr-1.5 h-3.5 w-3.5 text-rival-amber" />
                    {record.weight}{t("kg")} x {record.reps}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t("No personal records yet.")}</p>
            )}
          </div>
        </div>
      </section>

      <section className="surface-panel p-5">
        <h2 className="text-xl font-black text-white">{t("Workout History")}</h2>
        <div className="mt-5 space-y-3">
          {profile.workoutHistory.length > 0 ? (
            profile.workoutHistory.map((workout) => (
              <div key={workout.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-black text-white">{formatDate(workout.workoutDate)}</div>
                    <div className="mt-1 text-sm text-slate-500">{workout.notes ? t(workout.notes) : t("Saved workout")}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">+{workout.totalPoints} {t("pts")}</span>
                    <span className="chip">{workout.totalCalories} cal</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {workout.exercises.map((exercise) => (
                    <span key={exercise.id} className="chip">
                      {exercise.name} - {exercise.completedSets} {t("Sets").toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">{t("No workouts saved yet.")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
