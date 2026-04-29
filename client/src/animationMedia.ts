import type { ExerciseAnimationMedia } from "./components/ExerciseAnimation";
import type { Exercise } from "./types";

type MediaType = ExerciseAnimationMedia["type"];

const supportedMediaTypes = new Set<MediaType>(["image", "gif", "video", "lottie", "three"]);
const localMediaByAssetKey: Record<string, { type: MediaType; src: string }> = {};

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
