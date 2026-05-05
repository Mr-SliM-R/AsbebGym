import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/PageState";
import { WorkoutSessionForm } from "../components/WorkoutSessionForm";
import { useI18n } from "../i18n";
import type { Exercise, MetaData, WorkoutContext } from "../types";

export function WorkoutTrackerPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const initialExerciseId = Number((location.state as { exerciseId?: number } | null)?.exerciseId ?? 0) || undefined;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [context, setContext] = useState<WorkoutContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.exercises(), api.meta(), api.workoutContext(user.id)])
      .then(([exerciseData, metaData, workoutContext]) => {
        setExercises(exerciseData);
        setMeta(metaData);
        setContext(workoutContext);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  if (error) return <ErrorState message={t(error)} />;
  if (loading || !meta || !context) return <LoadingState label={t("Loading tracker")} />;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <h1 className="text-3xl font-black text-white">{t("Workout Tracker")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("Log sets, reps, weight, notes, and personal records.")}</p>
      </section>
      <WorkoutSessionForm
        user={user}
        exercises={exercises}
        categories={meta.categories}
        initialExerciseId={initialExerciseId}
        initialContext={context}
      />
    </div>
  );
}
