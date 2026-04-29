import { ArrowRight, Dumbbell, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { getExerciseMedia } from "../animationMedia";
import type { Exercise } from "../types";
import { ExerciseAnimation } from "./ExerciseAnimation";

type ExerciseCardProps = {
  exercise: Exercise;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function ExerciseCard({ exercise, compact = false, actionLabel, onAction }: ExerciseCardProps) {
  return (
    <article className="surface-panel overflow-hidden transition hover:border-rival-green/30">
      {!compact ? (
        <ExerciseAnimation
          exerciseName={exercise.name}
          muscleGroup={exercise.muscleGroup}
          animationType={exercise.animationType}
          media={getExerciseMedia(exercise)}
        />
      ) : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">{exercise.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip">
                <Dumbbell className="mr-1.5 h-3.5 w-3.5 text-rival-green" />
                {exercise.muscleGroup}
              </span>
              <span className="chip">
                <Gauge className="mr-1.5 h-3.5 w-3.5 text-rival-cyan" />
                {exercise.difficulty}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Sets</div>
            <div className="font-bold text-slate-100">{exercise.recommendedSets}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Reps</div>
            <div className="font-bold text-slate-100">{exercise.recommendedReps}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="ghost-button flex-1" to={`/exercises/${exercise.id}`}>
            Detail
            <ArrowRight className="h-4 w-4" />
          </Link>
          {onAction ? (
            <button className="neon-button flex-1" type="button" onClick={onAction}>
              {actionLabel ?? "Start"}
            </button>
          ) : (
            <Link className="neon-button flex-1" to="/tracker" state={{ exerciseId: exercise.id }}>
              {actionLabel ?? "Start Exercise"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
