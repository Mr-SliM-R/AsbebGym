import type { ExerciseAnimationMedia } from "./components/ExerciseAnimation";
import type { Exercise } from "./types";

type MediaType = ExerciseAnimationMedia["type"];

const supportedMediaTypes = new Set<MediaType>(["image", "gif", "video", "lottie", "three"]);
const exerciseGuideFolders: Record<string, string> = {
  "back-squat": "legs",
  "leg-press": "legs",
  "walking-lunges": "legs",
  "romanian-deadlift": "legs",
  "calf-raises": "legs",
  "bench-press": "chest",
  "push-ups": "chest",
  "incline-dumbbell-press": "chest",
  "cable-fly": "chest",
  "dumbbell-pullover": "chest",
  "pull-ups": "back",
  "lat-pulldown": "back",
  "barbell-row": "back",
  "seated-cable-row": "back",
  "face-pull": "back",
  "shoulder-press": "shoulders",
  "lateral-raise": "shoulders",
  "rear-delt-fly": "shoulders",
  "arnold-press": "shoulders",
  "dumbbell-curl": "biceps",
  "hammer-curl": "biceps",
  "cable-curl": "biceps",
  "preacher-curl": "biceps",
  "triceps-pushdown": "triceps",
  "dips": "triceps",
  "overhead-triceps-extension": "triceps",
  "skull-crusher": "triceps",
  "plank": "abs",
  "crunches": "abs",
  "hanging-leg-raises": "abs",
  "russian-twists": "abs",
  "treadmill-intervals": "cardio",
  "rowing-machine": "cardio",
  "battle-ropes": "cardio",
  "burpees": "full-body",
  "kettlebell-swing": "full-body",
  "clean-and-press": "full-body",
  "medicine-ball-slams": "full-body",
  "deadlift": "legs",
  "running-time": "cardio"
};

const localMediaByAssetKey = Object.fromEntries(
  Object.entries(exerciseGuideFolders).map(([assetKey, folder]) => [
    assetKey,
    {
      type: "image" as MediaType,
      src: `/exercise-media/${folder}/${assetKey}-guide.png`
    }
  ])
);

export function getExerciseMedia(exercise: Exercise): ExerciseAnimationMedia | undefined {
  const localMedia = exercise.animationAssetKey ? localMediaByAssetKey[exercise.animationAssetKey] : undefined;
  const src = exercise.animationSrc ?? localMedia?.src ?? null;
  const mediaType = exercise.animationMediaType ?? localMedia?.type ?? null;

  if (!src || !mediaType || !supportedMediaTypes.has(mediaType)) {
    return undefined;
  }

  if (mediaType === "image" || mediaType === "gif") {
    return {
      type: mediaType,
      src,
      alt: exercise.name
    };
  }

  return {
    type: mediaType,
    src
  };
}
