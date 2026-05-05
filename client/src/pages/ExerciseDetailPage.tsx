import { ArrowLeft, CheckCircle2, Dumbbell, Flame, Gauge, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { getExerciseMedia } from "../animationMedia";
import { ExerciseAnimation } from "../components/ExerciseAnimation";
import { ErrorState, LoadingState } from "../components/PageState";
import { useI18n } from "../i18n";
import type { Exercise } from "../types";

export function ExerciseDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .exercise(Number(id))
      .then(setExercise)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) return <ErrorState message={t(error)} />;
  if (!exercise) return <LoadingState label={t("Loading exercise")} />;

  return (
    <div className="space-y-6">
      <Link to="/exercises" className="ghost-button">
        <ArrowLeft className="h-4 w-4" />
        {t("Back to exercises")}
      </Link>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="app-panel p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <span className="chip">
              <Dumbbell className="mr-1.5 h-3.5 w-3.5 text-rival-green" />
              {t(exercise.muscleGroup)}
            </span>
            <span className="chip">
              <Gauge className="mr-1.5 h-3.5 w-3.5 text-rival-cyan" />
              {t(exercise.difficulty)}
            </span>
            <span className="chip">
              <Flame className="mr-1.5 h-3.5 w-3.5 text-rival-rose" />
              {exercise.caloriesEstimate} cal
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black text-white">{exercise.name}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">{exercise.equipment}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="surface-panel p-4">
              <div className="text-sm text-slate-500">{t("Recommended sets")}</div>
              <div className="mt-1 text-2xl font-black text-white">{exercise.recommendedSets}</div>
            </div>
            <div className="surface-panel p-4">
              <div className="text-sm text-slate-500">{t("Recommended reps")}</div>
              <div className="mt-1 text-2xl font-black text-white">{exercise.recommendedReps}</div>
            </div>
          </div>
          <Link to="/tracker" state={{ exerciseId: exercise.id }} className="neon-button mt-6 w-full sm:w-auto">
            <Play className="h-4 w-4" />
            {t("Start Exercise")}
          </Link>
        </div>

        <div>
          <ExerciseAnimation
            exerciseName={exercise.name}
            muscleGroup={exercise.muscleGroup}
            animationType={exercise.animationType}
            media={getExerciseMedia(exercise)}
            equipment={exercise.equipment}
            instructions={exercise.instructions}
            recommendedSets={exercise.recommendedSets}
            recommendedReps={exercise.recommendedReps}
          />
          {exercise.animationCredit ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-400">
              {t("Media")}: {exercise.animationCredit}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Step-by-step Instructions")}</h2>
          <ol className="mt-5 space-y-3">
            {exercise.instructions.map((instruction, index) => (
              <li key={instruction} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rival-green/15 text-sm font-black text-rival-green">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-300">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Common Mistakes")}</h2>
          <div className="mt-5 space-y-3">
            {exercise.commonMistakes.map((mistake) => (
              <div key={mistake} className="flex gap-3 rounded-lg border border-rival-rose/15 bg-rival-rose/10 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rival-rose" />
                <span className="text-sm leading-6 text-slate-300">{mistake}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
