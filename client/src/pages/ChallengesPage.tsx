import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { ChallengeCard } from "../components/ChallengeCard";
import { ErrorState, LoadingState } from "../components/PageState";
import { useI18n } from "../i18n";
import type { Challenge } from "../types";

export function ChallengesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .challenges(user.id)
      .then(setChallenges)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (error) return <ErrorState message={t(error)} />;
  if (loading) return <LoadingState label={t("Loading challenges")} />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <h1 className="text-3xl font-black text-white">{t("Weekly Challenges")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("Challenge progress updates from saved workouts.")}</p>
      </section>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </section>
    </div>
  );
}
