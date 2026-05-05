import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

export type ExerciseAnimationMedia =
  | { type: "image"; src: string; alt?: string }
  | { type: "gif"; src: string; alt?: string }
  | { type: "video"; src: string }
  | { type: "lottie"; src: string }
  | { type: "three"; src: string };

type ExerciseAnimationProps = {
  exerciseName: string;
  muscleGroup: string;
  animationType: string;
  media?: ExerciseAnimationMedia;
  equipment?: string;
  instructions?: string[];
  recommendedSets?: number;
  recommendedReps?: string;
};

type PointFrames = {
  x: number[];
  y: number[];
};

type LimbFrames = {
  elbow: PointFrames;
  hand: PointFrames;
};

type StandingPreset = {
  template: "standing";
  cue: string;
  equipment:
    | "dumbbells"
    | "barbell"
    | "cable-high"
    | "cable-low"
    | "rope"
    | "kettlebell"
    | "medicine-ball"
    | "none";
  bodyY?: number[];
  torsoRotate?: number[];
  headX?: number[];
  leftArm: LimbFrames;
  rightArm: LimbFrames;
  barY?: number[];
  propX?: number[];
  propY?: number[];
  propRotate?: number[];
};

type BenchPreset = {
  template: "bench";
  cue: string;
  equipment: "barbell" | "dumbbells" | "ez-bar" | "pullover";
  incline?: boolean;
  bodyRotate?: number;
  pressY: number[];
  elbowY: number[];
  handX?: number[];
};

type FloorPreset = {
  template: "floor";
  cue: string;
  mode: "pushup" | "plank" | "crunch" | "leg-raise" | "twist" | "burpee";
};

type PullPreset = {
  template: "pull";
  cue: string;
  mode: "pullup" | "lat-pulldown" | "barbell-row" | "seated-row" | "face-pull" | "rower";
};

type LegPreset = {
  template: "legs";
  cue: string;
  mode: "squat" | "leg-press" | "lunge" | "rdl" | "calf";
};

type CardioPreset = {
  template: "cardio";
  cue: string;
  mode: "treadmill" | "ropes";
};

type ExercisePreset = StandingPreset | BenchPreset | FloorPreset | PullPreset | LegPreset | CardioPreset;

const loop = {
  duration: 1.65,
  repeat: Infinity,
  ease: "easeInOut" as const
};

const quickLoop = {
  duration: 1.1,
  repeat: Infinity,
  ease: "easeInOut" as const
};

const baseLeftArm: LimbFrames = {
  elbow: { x: [154, 154, 154], y: [112, 112, 112] },
  hand: { x: [143, 143, 143], y: [146, 146, 146] }
};

const baseRightArm: LimbFrames = {
  elbow: { x: [206, 206, 206], y: [112, 112, 112] },
  hand: { x: [217, 217, 217], y: [146, 146, 146] }
};

const presetMap: Record<string, ExercisePreset> = {
  "back-squat": {
    template: "legs",
    cue: "Bar path stays over midfoot",
    mode: "squat"
  },
  "leg-press": {
    template: "legs",
    cue: "Drive through the platform",
    mode: "leg-press"
  },
  "walking-lunges": {
    template: "legs",
    cue: "Step, drop, drive",
    mode: "lunge"
  },
  "romanian-deadlift": {
    template: "legs",
    cue: "Hinge from the hips",
    mode: "rdl"
  },
  "deadlift": {
    template: "legs",
    cue: "Brace, push, lock out",
    mode: "rdl"
  },
  "calf-raises": {
    template: "legs",
    cue: "Pause tall on toes",
    mode: "calf"
  },
  "bench-press": {
    template: "bench",
    cue: "Press from lower chest",
    equipment: "barbell",
    pressY: [112, 74, 112],
    elbowY: [134, 104, 134]
  },
  "push-ups": {
    template: "floor",
    cue: "Straight plank line",
    mode: "pushup"
  },
  "incline-dumbbell-press": {
    template: "bench",
    cue: "Press up and slightly back",
    equipment: "dumbbells",
    incline: true,
    bodyRotate: -14,
    pressY: [118, 74, 118],
    elbowY: [136, 105, 136],
    handX: [142, 136, 142]
  },
  "cable-fly": {
    template: "standing",
    cue: "Wide arc, soft elbows",
    equipment: "cable-high",
    bodyY: [0, 0, 0],
    torsoRotate: [-6, -3, -6],
    leftArm: {
      elbow: { x: [132, 150, 132], y: [106, 112, 106] },
      hand: { x: [102, 174, 102], y: [122, 124, 122] }
    },
    rightArm: {
      elbow: { x: [228, 210, 228], y: [106, 112, 106] },
      hand: { x: [258, 186, 258], y: [122, 124, 122] }
    }
  },
  "dumbbell-pullover": {
    template: "bench",
    cue: "Arc behind head",
    equipment: "pullover",
    pressY: [82, 118, 82],
    elbowY: [92, 115, 92],
    handX: [116, 178, 116]
  },
  "pull-ups": {
    template: "pull",
    cue: "Chin over bar",
    mode: "pullup"
  },
  "lat-pulldown": {
    template: "pull",
    cue: "Elbows down to ribs",
    mode: "lat-pulldown"
  },
  "barbell-row": {
    template: "pull",
    cue: "Row to lower ribs",
    mode: "barbell-row"
  },
  "seated-cable-row": {
    template: "pull",
    cue: "Pull and squeeze",
    mode: "seated-row"
  },
  "face-pull": {
    template: "pull",
    cue: "Rope to eyebrows",
    mode: "face-pull"
  },
  "shoulder-press": {
    template: "standing",
    cue: "Ribs down, press tall",
    equipment: "dumbbells",
    bodyY: [0, -3, 0],
    leftArm: {
      elbow: { x: [148, 144, 148], y: [98, 70, 98] },
      hand: { x: [140, 138, 140], y: [86, 45, 86] }
    },
    rightArm: {
      elbow: { x: [212, 216, 212], y: [98, 70, 98] },
      hand: { x: [220, 222, 220], y: [86, 45, 86] }
    }
  },
  "lateral-raise": {
    template: "standing",
    cue: "Lead with elbows",
    equipment: "dumbbells",
    leftArm: {
      elbow: { x: [154, 128, 154], y: [112, 96, 112] },
      hand: { x: [143, 98, 143], y: [146, 92, 146] }
    },
    rightArm: {
      elbow: { x: [206, 232, 206], y: [112, 96, 112] },
      hand: { x: [217, 262, 217], y: [146, 92, 146] }
    }
  },
  "rear-delt-fly": {
    template: "standing",
    cue: "Open wide from rear delts",
    equipment: "dumbbells",
    torsoRotate: [22, 22, 22],
    leftArm: {
      elbow: { x: [152, 122, 152], y: [126, 108, 126] },
      hand: { x: [150, 92, 150], y: [156, 102, 156] }
    },
    rightArm: {
      elbow: { x: [208, 238, 208], y: [126, 108, 126] },
      hand: { x: [210, 268, 210], y: [156, 102, 156] }
    }
  },
  "arnold-press": {
    template: "standing",
    cue: "Rotate then press",
    equipment: "dumbbells",
    torsoRotate: [0, 0, 0],
    leftArm: {
      elbow: { x: [164, 146, 142, 164], y: [116, 92, 70, 116] },
      hand: { x: [176, 142, 138, 176], y: [96, 82, 42, 96] }
    },
    rightArm: {
      elbow: { x: [196, 214, 218, 196], y: [116, 92, 70, 116] },
      hand: { x: [184, 218, 222, 184], y: [96, 82, 42, 96] }
    }
  },
  "dumbbell-curl": {
    template: "standing",
    cue: "Elbows stay pinned",
    equipment: "dumbbells",
    leftArm: {
      elbow: { x: [154, 154, 154], y: [112, 112, 112] },
      hand: { x: [143, 156, 143], y: [146, 94, 146] }
    },
    rightArm: {
      elbow: { x: [206, 206, 206], y: [112, 112, 112] },
      hand: { x: [217, 204, 217], y: [146, 94, 146] }
    }
  },
  "hammer-curl": {
    template: "standing",
    cue: "Neutral wrists",
    equipment: "dumbbells",
    leftArm: {
      elbow: { x: [154, 154, 154], y: [112, 112, 112] },
      hand: { x: [142, 147, 142], y: [148, 98, 148] }
    },
    rightArm: {
      elbow: { x: [206, 206, 206], y: [112, 112, 112] },
      hand: { x: [218, 213, 218], y: [148, 98, 148] }
    }
  },
  "cable-curl": {
    template: "standing",
    cue: "Cable stays tight",
    equipment: "cable-low",
    leftArm: {
      elbow: { x: [158, 158, 158], y: [114, 114, 114] },
      hand: { x: [160, 168, 160], y: [152, 96, 152] }
    },
    rightArm: {
      elbow: { x: [202, 202, 202], y: [114, 114, 114] },
      hand: { x: [200, 192, 200], y: [152, 96, 152] }
    }
  },
  "preacher-curl": {
    template: "standing",
    cue: "Upper arms locked in",
    equipment: "barbell",
    torsoRotate: [14, 14, 14],
    leftArm: {
      elbow: { x: [160, 158, 160], y: [130, 130, 130] },
      hand: { x: [162, 170, 162], y: [160, 112, 160] }
    },
    rightArm: {
      elbow: { x: [200, 202, 200], y: [130, 130, 130] },
      hand: { x: [198, 190, 198], y: [160, 112, 160] }
    }
  },
  "triceps-pushdown": {
    template: "standing",
    cue: "Lock out cleanly",
    equipment: "cable-high",
    leftArm: {
      elbow: { x: [160, 160, 160], y: [106, 106, 106] },
      hand: { x: [168, 158, 168], y: [98, 150, 98] }
    },
    rightArm: {
      elbow: { x: [200, 200, 200], y: [106, 106, 106] },
      hand: { x: [192, 202, 192], y: [98, 150, 98] }
    }
  },
  "dips": {
    template: "standing",
    cue: "Shoulders down, press up",
    equipment: "none",
    bodyY: [-6, 26, -6],
    leftArm: {
      elbow: { x: [146, 145, 146], y: [104, 118, 104] },
      hand: { x: [130, 130, 130], y: [140, 140, 140] }
    },
    rightArm: {
      elbow: { x: [214, 215, 214], y: [104, 118, 104] },
      hand: { x: [230, 230, 230], y: [140, 140, 140] }
    }
  },
  "overhead-triceps-extension": {
    template: "standing",
    cue: "Elbows point forward",
    equipment: "dumbbells",
    leftArm: {
      elbow: { x: [168, 160, 168], y: [78, 70, 78] },
      hand: { x: [182, 166, 182], y: [112, 42, 112] }
    },
    rightArm: {
      elbow: { x: [192, 200, 192], y: [78, 70, 78] },
      hand: { x: [178, 194, 178], y: [112, 42, 112] }
    }
  },
  "skull-crusher": {
    template: "bench",
    cue: "Bend at elbows",
    equipment: "ez-bar",
    pressY: [88, 128, 88],
    elbowY: [86, 92, 86],
    handX: [160, 137, 160]
  },
  "plank": {
    template: "floor",
    cue: "Brace and breathe",
    mode: "plank"
  },
  "crunches": {
    template: "floor",
    cue: "Ribs curl to hips",
    mode: "crunch"
  },
  "hanging-leg-raises": {
    template: "floor",
    cue: "Lift with control",
    mode: "leg-raise"
  },
  "russian-twists": {
    template: "floor",
    cue: "Rotate the ribs",
    mode: "twist"
  },
  "treadmill-intervals": {
    template: "cardio",
    cue: "Quick cadence",
    mode: "treadmill"
  },
  "running-time": {
    template: "cardio",
    cue: "Steady pace, faster finish",
    mode: "treadmill"
  },
  "rowing-machine": {
    template: "pull",
    cue: "Legs, hips, arms",
    mode: "rower"
  },
  "battle-ropes": {
    template: "cardio",
    cue: "Drive fast waves",
    mode: "ropes"
  },
  "burpees": {
    template: "floor",
    cue: "Drop, plank, pop",
    mode: "burpee"
  },
  "kettlebell-swing": {
    template: "standing",
    cue: "Snap the hips",
    equipment: "kettlebell",
    torsoRotate: [24, -3, 24],
    bodyY: [8, -2, 8],
    leftArm: {
      elbow: { x: [164, 158, 164], y: [126, 108, 126] },
      hand: { x: [174, 150, 174], y: [166, 102, 166] }
    },
    rightArm: {
      elbow: { x: [196, 202, 196], y: [126, 108, 126] },
      hand: { x: [186, 210, 186], y: [166, 102, 166] }
    },
    propX: [180, 180, 180],
    propY: [170, 102, 170],
    propRotate: [-18, 12, -18]
  },
  "clean-and-press": {
    template: "standing",
    cue: "Clean, catch, press",
    equipment: "barbell",
    bodyY: [10, 0, -6, 10],
    leftArm: {
      elbow: { x: [154, 154, 146, 154], y: [138, 104, 70, 138] },
      hand: { x: [142, 146, 138, 142], y: [170, 92, 42, 170] }
    },
    rightArm: {
      elbow: { x: [206, 206, 214, 206], y: [138, 104, 70, 138] },
      hand: { x: [218, 214, 222, 218], y: [170, 92, 42, 170] }
    },
    barY: [170, 92, 42, 170]
  },
  "medicine-ball-slams": {
    template: "standing",
    cue: "Explode to the floor",
    equipment: "medicine-ball",
    bodyY: [-4, 12, -4],
    torsoRotate: [-8, 18, -8],
    leftArm: {
      elbow: { x: [164, 158, 164], y: [72, 112, 72] },
      hand: { x: [178, 166, 178], y: [42, 168, 42] }
    },
    rightArm: {
      elbow: { x: [196, 202, 196], y: [72, 112, 72] },
      hand: { x: [182, 194, 182], y: [42, 168, 42] }
    },
    propY: [38, 178, 38],
    propX: [180, 180, 180],
    propRotate: [0, 90, 0]
  }
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPreset(exerciseName: string, animationType: string): ExercisePreset {
  const key = slugify(exerciseName);
  const byKey = presetMap[key];

  if (byKey) {
    return byKey;
  }

  if (animationType === "pushup") return presetMap["push-ups"];
  if (animationType === "squat") return presetMap["back-squat"];
  if (animationType === "pull") return presetMap["pull-ups"];
  if (animationType === "row") return presetMap["seated-cable-row"];
  if (animationType === "curl") return presetMap["dumbbell-curl"];
  if (animationType === "overhead") return presetMap["shoulder-press"];
  if (animationType === "run") return presetMap["treadmill-intervals"];

  return {
    template: "standing",
    cue: "Original motion guide",
    equipment: "dumbbells",
    leftArm: baseLeftArm,
    rightArm: baseRightArm
  };
}

function SceneShell({
  exerciseName,
  muscleGroup,
  cue,
  equipment,
  instructions = [],
  recommendedSets,
  recommendedReps,
  children
}: {
  exerciseName: string;
  muscleGroup: string;
  cue: string;
  equipment?: string;
  instructions?: string[];
  recommendedSets?: number;
  recommendedReps?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const muscles = getTargetMuscles(exerciseName, muscleGroup);
  const steps = instructions.length > 0 ? instructions.slice(0, 4) : getDefaultSteps(exerciseName, muscleGroup).slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-300/60 bg-[#f8fafc] text-slate-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
      <div className="grid min-h-[360px] gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(230px,0.7fr)]">
        <div className="relative min-h-[300px] overflow-hidden bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.96),transparent_38%),linear-gradient(145deg,#ffffff,#edf2f7)]">
          <div className="absolute left-4 top-4 z-10 max-w-[74%]">
            <div className="text-3xl font-black uppercase italic tracking-normal text-slate-950 sm:text-4xl">{exerciseName}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase">
              <span className="rounded bg-slate-950 px-2.5 py-1 text-white">{equipment || t(muscleGroup)}</span>
              <span className="rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700">{cue}</span>
            </div>
          </div>
          <svg viewBox="0 0 360 260" className="absolute inset-x-0 bottom-0 h-full w-full" role="img" aria-label={`${exerciseName} illustrated guide`}>
            <defs>
              <linearGradient id="bodyGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#40ff9a" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#39d7ff" stopOpacity="0.92" />
              </linearGradient>
              <linearGradient id="skinGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffd8bd" />
                <stop offset="45%" stopColor="#d89464" />
                <stop offset="100%" stopColor="#8f5539" />
              </linearGradient>
              <linearGradient id="shirtGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffe4c7" />
                <stop offset="48%" stopColor="#d89464" />
                <stop offset="100%" stopColor="#8f5539" />
              </linearGradient>
              <linearGradient id="shortsGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#20242b" />
                <stop offset="45%" stopColor="#0d1117" />
                <stop offset="100%" stopColor="#030507" />
              </linearGradient>
              <linearGradient id="shoeGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#232831" />
                <stop offset="58%" stopColor="#080a0f" />
                <stop offset="100%" stopColor="#d8dde5" />
              </linearGradient>
              <linearGradient id="gloveGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#ffe0c2" />
                <stop offset="55%" stopColor="#d89464" />
                <stop offset="100%" stopColor="#8f5539" />
              </linearGradient>
              <linearGradient id="metalGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#f8fbff" />
                <stop offset="45%" stopColor="#9fb1c7" />
                <stop offset="100%" stopColor="#eef6ff" />
              </linearGradient>
              <radialGradient id="muscleHighlight" cx="35%" cy="25%" r="75%">
                <stop offset="0%" stopColor="#fff0dd" stopOpacity="0.78" />
                <stop offset="60%" stopColor="#d89464" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#6a3728" stopOpacity="0.2" />
              </radialGradient>
              <linearGradient id="fiberGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#fff0dd" stopOpacity="0.08" />
                <stop offset="48%" stopColor="#fff0dd" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#fff0dd" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="plateGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="45%" stopColor="#111827" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
              <radialGradient id="jointGlow" cx="35%" cy="25%" r="70%">
                <stop offset="0%" stopColor="#fff0dd" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#d89464" stopOpacity="0.12" />
              </radialGradient>
              <linearGradient id="gearGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#ffc857" />
                <stop offset="100%" stopColor="#ff4f7b" />
              </linearGradient>
              <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="heavyShadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#02040a" floodOpacity="0.35" />
              </filter>
            </defs>
            <GuideGrid />
            <MuscleBackplate muscleGroup={muscleGroup} />
            {children}
            <FrameBadge index={1} label="Start" x={22} y={132} />
            <FrameBadge index={2} label="Work" x={238} y={70} />
            <RepArrow />
          </svg>
        </div>

        <aside className="border-t border-slate-200 bg-white/92 p-4 lg:border-l lg:border-t-0">
          <div className="rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 text-center text-sm font-black uppercase text-white">
            Muscles Worked
          </div>
          <div className="mt-3 space-y-2">
            {muscles.map((muscle) => (
              <div key={muscle.name} className="flex items-center gap-2 text-sm font-bold">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: muscle.color }} />
                <span className="text-slate-900">{muscle.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-black uppercase text-slate-500">How to perform</div>
            <ol className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-slate-700">
              {steps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-2">
                  <span className="text-slate-950">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {recommendedSets || recommendedReps ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {recommendedSets ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                  <div className="text-[10px] font-black uppercase text-slate-500">Sets</div>
                  <div className="text-lg font-black text-slate-950">{recommendedSets}</div>
                </div>
              ) : null}
              {recommendedReps ? (
                <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                  <div className="text-[10px] font-black uppercase text-slate-500">Reps</div>
                  <div className="text-sm font-black text-slate-950">{recommendedReps}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function GuideGrid() {
  return (
    <g opacity="0.9">
      <path d="M28 212 C90 194 265 194 332 212" fill="none" stroke="#0f172a" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M54 220 L306 220" stroke="#0f172a" strokeOpacity="0.08" strokeWidth="1" />
      <path d="M78 227 L282 227" stroke="#0f172a" strokeOpacity="0.06" strokeWidth="1" />
      {Array.from({ length: 8 }).map((_, index) => (
        <path
          key={index}
          d={`M${58 + index * 35} 210 L${70 + index * 30} 228`}
          stroke="#0f172a"
          strokeOpacity="0.04"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function MuscleBackplate({ muscleGroup }: { muscleGroup: string }) {
  const color = getMuscleColor(muscleGroup);
  const areas = getMuscleAreas(muscleGroup);

  return (
    <g pointerEvents="none">
      {areas.map((area, index) => (
        <motion.ellipse
          key={`${area.cx}-${area.cy}-${index}`}
          cx={area.cx}
          cy={area.cy}
          rx={area.rx * 0.72}
          ry={area.ry * 0.72}
          fill={color}
          opacity="0.12"
          filter="url(#softGlow)"
          animate={{ opacity: [0.08, 0.2, 0.08], scale: [0.94, 1.05, 0.94] }}
          transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut", delay: index * 0.08 }}
          style={{ transformOrigin: `${area.cx}px ${area.cy}px` }}
        />
      ))}
    </g>
  );
}

function FrameBadge({ index, label, x, y }: { index: number; label: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="74" height="26" rx="6" fill="#0f172a" />
      <circle cx="13" cy="13" r="9" fill="#ffffff" />
      <text x="13" y="17" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0f172a">
        {index}
      </text>
      <text x="30" y="17" fontSize="10" fontWeight="900" fill="#ffffff">
        {label}
      </text>
    </g>
  );
}

function RepArrow() {
  return (
    <g transform="translate(138 232)">
      <path d="M0 0 H84" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <path d="M73 -5 L84 0 L73 5" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="42" y="-7" textAnchor="middle" fontSize="10" fontWeight="900" fill="#0f172a">
        REPEAT
      </text>
    </g>
  );
}

function Atmosphere({ muscleGroup }: { muscleGroup: string }) {
  const color = getMuscleColor(muscleGroup);
  const areas = getMuscleAreas(muscleGroup);

  return (
    <g>
      <motion.ellipse
        cx="180"
        cy="210"
        rx="112"
        ry="18"
        fill="#02040a"
        opacity="0.38"
        animate={{ rx: [96, 118, 96], opacity: [0.26, 0.42, 0.26] }}
        transition={loop}
      />
      <motion.circle
        cx="296"
        cy="66"
        r="38"
        fill={color}
        opacity="0.08"
        animate={{ r: [32, 43, 32], opacity: [0.05, 0.13, 0.05] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <g opacity="0.72">
        {areas.map((area) => (
          <motion.ellipse
            key={`${area.cx}-${area.cy}`}
            cx={area.cx}
            cy={area.cy}
            rx={area.rx}
            ry={area.ry}
            fill={color}
            opacity="0.16"
            filter="url(#softGlow)"
            animate={{ opacity: [0.08, 0.26, 0.08], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${area.cx}px ${area.cy}px` }}
          />
        ))}
      </g>
      {[0, 1, 2].map((index) => (
        <motion.circle
          key={index}
          cx={82 + index * 94}
          cy={84 + index * 8}
          r="2.4"
          fill="#ffffff"
          opacity="0.2"
          animate={{ y: [0, -18, 0], opacity: [0, 0.35, 0] }}
          transition={{ duration: 1.8 + index * 0.25, repeat: Infinity, ease: "easeInOut", delay: index * 0.22 }}
        />
      ))}
    </g>
  );
}

function getMuscleColor(muscleGroup: string) {
  const colors: Record<string, string> = {
    Legs: "#40ff9a",
    Chest: "#ff4f7b",
    Back: "#39d7ff",
    Shoulders: "#ffc857",
    Biceps: "#a78bfa",
    Triceps: "#f97316",
    Abs: "#22d3ee",
    Cardio: "#ef4444",
    "Full Body": "#40ff9a"
  };

  return colors[muscleGroup] ?? "#40ff9a";
}

function getTargetMuscles(exerciseName: string, muscleGroup: string) {
  const fallback = {
    Legs: [
      { name: "Quadriceps", color: "#ef4444" },
      { name: "Glutes", color: "#f97316" },
      { name: "Hamstrings", color: "#22c55e" }
    ],
    Chest: [
      { name: "Chest", color: "#ef4444" },
      { name: "Anterior Shoulders", color: "#f97316" },
      { name: "Triceps", color: "#22c55e" }
    ],
    Back: [
      { name: "Lats", color: "#ef4444" },
      { name: "Upper Back", color: "#f97316" },
      { name: "Biceps", color: "#22c55e" }
    ],
    Shoulders: [
      { name: "Deltoids", color: "#ef4444" },
      { name: "Traps", color: "#f97316" },
      { name: "Triceps", color: "#22c55e" }
    ],
    Biceps: [
      { name: "Biceps", color: "#ef4444" },
      { name: "Brachialis", color: "#f97316" },
      { name: "Forearms", color: "#22c55e" }
    ],
    Triceps: [
      { name: "Triceps", color: "#ef4444" },
      { name: "Shoulders", color: "#f97316" },
      { name: "Forearms", color: "#22c55e" }
    ],
    Abs: [
      { name: "Abdominals", color: "#ef4444" },
      { name: "Obliques", color: "#f97316" },
      { name: "Hip Flexors", color: "#22c55e" }
    ],
    Cardio: [
      { name: "Heart / Lungs", color: "#ef4444" },
      { name: "Legs", color: "#f97316" },
      { name: "Core", color: "#22c55e" }
    ],
    "Full Body": [
      { name: "Full Body", color: "#ef4444" },
      { name: "Core", color: "#f97316" },
      { name: "Shoulders", color: "#22c55e" }
    ]
  } satisfies Record<string, Array<{ name: string; color: string }>>;

  const key = slugify(exerciseName);
  const specific: Record<string, Array<{ name: string; color: string }>> = {
    "bench-press": fallback.Chest,
    "incline-dumbbell-press": fallback.Chest,
    "push-ups": fallback.Chest,
    "pull-ups": fallback.Back,
    "lat-pulldown": fallback.Back,
    "barbell-row": fallback.Back,
    "seated-cable-row": fallback.Back,
    "deadlift": [
      { name: "Hamstrings", color: "#ef4444" },
      { name: "Glutes", color: "#f97316" },
      { name: "Back", color: "#22c55e" }
    ],
    "romanian-deadlift": [
      { name: "Hamstrings", color: "#ef4444" },
      { name: "Glutes", color: "#f97316" },
      { name: "Lower Back", color: "#22c55e" }
    ],
    "treadmill-intervals": fallback.Cardio,
    "running-time": fallback.Cardio,
    "rowing-machine": [
      { name: "Back", color: "#ef4444" },
      { name: "Legs", color: "#f97316" },
      { name: "Cardio", color: "#22c55e" }
    ]
  };

  return specific[key] ?? fallback[muscleGroup as keyof typeof fallback] ?? fallback["Full Body"];
}

function getDefaultSteps(exerciseName: string, muscleGroup: string) {
  return [
    `Set up for ${exerciseName.toLowerCase()} with a stable stance and controlled posture.`,
    `Brace your core and move through the full range without rushing.`,
    `Focus tension on the ${muscleGroup.toLowerCase()} muscles shown in the guide.`,
    "Return under control and repeat for clean reps."
  ];
}

function getMuscleAreas(muscleGroup: string) {
  const areas: Record<string, Array<{ cx: number; cy: number; rx: number; ry: number }>> = {
    Legs: [
      { cx: 158, cy: 178, rx: 24, ry: 42 },
      { cx: 206, cy: 178, rx: 24, ry: 42 }
    ],
    Chest: [{ cx: 180, cy: 122, rx: 58, ry: 32 }],
    Back: [{ cx: 180, cy: 124, rx: 64, ry: 36 }],
    Shoulders: [
      { cx: 145, cy: 104, rx: 30, ry: 24 },
      { cx: 215, cy: 104, rx: 30, ry: 24 }
    ],
    Biceps: [
      { cx: 142, cy: 132, rx: 28, ry: 26 },
      { cx: 218, cy: 132, rx: 28, ry: 26 }
    ],
    Triceps: [
      { cx: 148, cy: 122, rx: 30, ry: 28 },
      { cx: 212, cy: 122, rx: 30, ry: 28 }
    ],
    Abs: [{ cx: 180, cy: 148, rx: 36, ry: 42 }],
    Cardio: [{ cx: 180, cy: 138, rx: 82, ry: 70 }],
    "Full Body": [{ cx: 180, cy: 140, rx: 90, ry: 78 }]
  };

  return areas[muscleGroup] ?? areas["Full Body"];
}

function TargetMusclePulse({ muscleGroup }: { muscleGroup: string }) {
  const color = getMuscleColor(muscleGroup);
  const areas = getMuscleAreas(muscleGroup);

  return (
    <g pointerEvents="none">
      {areas.map((area, index) => (
        <motion.g
          key={`${area.cx}-${area.cy}-${index}`}
          animate={{ opacity: [0.2, 0.72, 0.2] }}
          transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut", delay: index * 0.08 }}
        >
          <motion.ellipse
            cx={area.cx}
            cy={area.cy}
            rx={area.rx * 0.74}
            ry={area.ry * 0.74}
            fill={color}
            opacity="0.1"
            filter="url(#softGlow)"
            animate={{ scale: [0.92, 1.04, 0.92] }}
            transition={loop}
            style={{ transformOrigin: `${area.cx}px ${area.cy}px` }}
          />
          <motion.ellipse
            cx={area.cx}
            cy={area.cy}
            rx={area.rx * 0.68}
            ry={area.ry * 0.68}
            fill="none"
            stroke={color}
            strokeOpacity="0.58"
            strokeWidth="1.5"
            strokeDasharray="6 7"
            animate={{ rotate: [0, 18, 0], strokeDashoffset: [0, -26, 0] }}
            transition={loop}
            style={{ transformOrigin: `${area.cx}px ${area.cy}px` }}
          />
        </motion.g>
      ))}
    </g>
  );
}

function RepMeter() {
  return (
    <g transform="translate(24 228)">
      <rect x="0" y="0" width="84" height="8" rx="4" fill="#ffffff" opacity="0.08" />
      <motion.rect
        x="0"
        y="0"
        height="8"
        rx="4"
        fill="url(#bodyGradient)"
        animate={{ width: [8, 84, 8] }}
        transition={loop}
      />
      <motion.circle
        cx="92"
        cy="4"
        r="4"
        fill="#40ff9a"
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.25, 0.9] }}
        transition={loop}
      />
    </g>
  );
}

function Joint({ x, y }: { x: number | number[]; y: number | number[] }) {
  return (
    <motion.circle
      r="5"
      fill="url(#jointGlow)"
      stroke="#40ff9a"
      strokeOpacity="0.62"
      strokeWidth="1.5"
      filter="url(#softGlow)"
      animate={{ cx: x, cy: y }}
      transition={loop}
    />
  );
}

function Hand({ point }: { point: PointFrames }) {
  return <Joint x={point.x} y={point.y} />;
}

function AnimatedArm({ shoulder, arm }: { shoulder: { x: number; y: number }; arm: LimbFrames }) {
  return (
    <g>
      <motion.line
        x1={shoulder.x}
        y1={shoulder.y}
        animate={{ x2: arm.elbow.x, y2: arm.elbow.y }}
        transition={loop}
        stroke="url(#bodyGradient)"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <motion.line
        animate={{ x1: arm.elbow.x, y1: arm.elbow.y, x2: arm.hand.x, y2: arm.hand.y }}
        transition={loop}
        stroke="url(#bodyGradient)"
        strokeLinecap="round"
        strokeWidth="9"
      />
      <Joint x={arm.elbow.x} y={arm.elbow.y} />
      <Hand point={arm.hand} />
    </g>
  );
}

function StandingScene({ preset }: { preset: StandingPreset }) {
  const leftArm = preset.leftArm ?? baseLeftArm;
  const rightArm = preset.rightArm ?? baseRightArm;
  const bodyY = preset.bodyY ?? [0, 0, 0];
  const torsoRotate = preset.torsoRotate ?? [0, 0, 0];

  return (
    <>
      <StandingEquipment preset={preset} leftHand={leftArm.hand} rightHand={rightArm.hand} />
      <motion.g animate={{ y: bodyY, rotate: torsoRotate }} transition={loop} style={{ transformOrigin: "180px 130px" }}>
        <motion.circle
          cx="180"
          cy="66"
          r="15"
          fill="#101722"
          stroke="#40ff9a"
          strokeWidth="3"
          filter="url(#softGlow)"
          animate={{ cx: preset.headX ?? [180, 180, 180] }}
          transition={loop}
        />
        <motion.path
          d="M180 84 C168 104 168 130 180 146 C192 130 192 104 180 84Z"
          fill="url(#bodyGradient)"
          fillOpacity="0.32"
          stroke="#39d7ff"
          strokeOpacity="0.9"
          strokeWidth="3"
        />
        <AnimatedArm shoulder={{ x: 172, y: 96 }} arm={leftArm} />
        <AnimatedArm shoulder={{ x: 188, y: 96 }} arm={rightArm} />
        <motion.line x1="174" y1="145" x2="156" y2="190" stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
        <motion.line x1="186" y1="145" x2="204" y2="190" stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
        <line x1="145" y1="195" x2="164" y2="195" stroke="#ffffff" strokeLinecap="round" strokeWidth="8" opacity="0.75" />
        <line x1="196" y1="195" x2="217" y2="195" stroke="#ffffff" strokeLinecap="round" strokeWidth="8" opacity="0.75" />
      </motion.g>
      {preset.equipment === "none" ? <DipBars /> : null}
      {preset.equipment === "barbell" && preset.barY ? <Barbell y={preset.barY} /> : null}
    </>
  );
}

function StandingEquipment({
  preset,
  leftHand,
  rightHand
}: {
  preset: StandingPreset;
  leftHand: PointFrames;
  rightHand: PointFrames;
}) {
  if (preset.equipment === "dumbbells") {
    return (
      <g>
        <DumbbellAt point={leftHand} />
        <DumbbellAt point={rightHand} />
      </g>
    );
  }

  if (preset.equipment === "barbell" && !preset.barY) {
    const y = leftHand.y;
    return <Barbell y={y} />;
  }

  if (preset.equipment === "cable-high" || preset.equipment === "cable-low") {
    const topY = preset.equipment === "cable-high" ? 40 : 206;
    return (
      <g>
        <CableTower side="left" />
        <CableTower side="right" />
        <motion.line x1="78" y1={topY} animate={{ x2: leftHand.x, y2: leftHand.y }} transition={loop} stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2" />
        <motion.line x1="282" y1={topY} animate={{ x2: rightHand.x, y2: rightHand.y }} transition={loop} stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2" />
        <motion.rect animate={{ x: leftHand.x, y: leftHand.y }} transition={loop} width="22" height="5" rx="2.5" fill="#ffc857" />
        <motion.rect animate={{ x: rightHand.x, y: rightHand.y }} transition={loop} width="22" height="5" rx="2.5" fill="#ffc857" />
      </g>
    );
  }

  if (preset.equipment === "kettlebell") {
    return (
      <motion.g
        animate={{
          x: preset.propX ?? [180, 180, 180],
          y: preset.propY ?? [164, 112, 164],
          rotate: preset.propRotate ?? [-12, 12, -12]
        }}
        transition={loop}
        style={{ transformOrigin: "0px 0px" }}
      >
        <path d="M-10 -8 C-10 -24 10 -24 10 -8" fill="none" stroke="#ffc857" strokeWidth="5" strokeLinecap="round" />
        <circle cx="0" cy="6" r="14" fill="url(#gearGradient)" />
      </motion.g>
    );
  }

  if (preset.equipment === "medicine-ball") {
    return (
      <motion.circle
        r="16"
        fill="url(#gearGradient)"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="2"
        animate={{ cx: preset.propX ?? [180, 180, 180], cy: preset.propY ?? [42, 168, 42], rotate: preset.propRotate ?? [0, 90, 0] }}
        transition={loop}
      />
    );
  }

  return null;
}

function DumbbellAt({ point }: { point: PointFrames }) {
  return (
    <motion.g animate={{ x: point.x, y: point.y, rotate: [-7, 7, -7] }} transition={loop} filter="url(#heavyShadow)">
      <ellipse cx="0" cy="10" rx="25" ry="5" fill="#020617" opacity="0.38" />
      <rect x="-16" y="-4.5" width="32" height="9" rx="4.5" fill="url(#metalGradient)" stroke="#ffffff" strokeOpacity="0.26" />
      <rect x="-25" y="-11" width="10" height="22" rx="4" fill="url(#plateGradient)" stroke="#ff4f7b" strokeOpacity="0.65" />
      <rect x="15" y="-11" width="10" height="22" rx="4" fill="url(#plateGradient)" stroke="#ffc857" strokeOpacity="0.65" />
      <rect x="-31" y="-8" width="7" height="16" rx="3" fill="#ff4f7b" opacity="0.9" />
      <rect x="24" y="-8" width="7" height="16" rx="3" fill="#ffc857" opacity="0.9" />
      <path d="M-12 -2 H12" stroke="#ffffff" strokeOpacity="0.45" strokeLinecap="round" strokeWidth="1.5" />
    </motion.g>
  );
}

function Barbell({ y }: { y: number | number[] }) {
  return (
    <motion.g animate={{ y }} transition={loop} filter="url(#heavyShadow)">
      <ellipse cx="180" cy="17" rx="102" ry="7" fill="#020617" opacity="0.26" />
      <line x1="112" y1="0" x2="248" y2="0" stroke="#05070b" strokeOpacity="0.45" strokeLinecap="round" strokeWidth="11" />
      <line x1="112" y1="0" x2="248" y2="0" stroke="url(#metalGradient)" strokeLinecap="round" strokeWidth="7" />
      <line x1="126" y1="-2" x2="234" y2="-2" stroke="#ffffff" strokeOpacity="0.42" strokeLinecap="round" strokeWidth="1.6" />
      <rect x="94" y="-18" width="17" height="36" rx="5" fill="url(#plateGradient)" stroke="#ff4f7b" strokeOpacity="0.68" />
      <rect x="249" y="-18" width="17" height="36" rx="5" fill="url(#plateGradient)" stroke="#ffc857" strokeOpacity="0.68" />
      <rect x="76" y="-14" width="15" height="28" rx="5" fill="#ff4f7b" opacity="0.88" />
      <rect x="269" y="-14" width="15" height="28" rx="5" fill="#ffc857" opacity="0.88" />
      <path d="M101 -11 V11 M256 -11 V11" stroke="#ffffff" strokeOpacity="0.16" strokeLinecap="round" strokeWidth="2" />
    </motion.g>
  );
}

function CableTower({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? 72 : 278;
  return (
    <g opacity="0.72">
      <rect x={x - 8} y="34" width="16" height="174" rx="6" fill="#142033" stroke="#ffffff" strokeOpacity="0.14" />
      <circle cx={x} cy="42" r="9" fill="#39d7ff" fillOpacity="0.22" stroke="#39d7ff" strokeOpacity="0.45" />
      <circle cx={x} cy="205" r="8" fill="#40ff9a" fillOpacity="0.2" stroke="#40ff9a" strokeOpacity="0.42" />
    </g>
  );
}

function DipBars() {
  return (
    <g opacity="0.75">
      <path d="M116 138 H151 V210" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="7" strokeLinecap="round" />
      <path d="M244 138 H209 V210" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

function BenchScene({ preset }: { preset: BenchPreset }) {
  const benchAngle = preset.incline ? -14 : 0;
  const bodyRotate = preset.bodyRotate ?? benchAngle;
  const handX = preset.handX ?? [152, 152, 152];

  return (
    <>
      <motion.g style={{ transformOrigin: "180px 162px" }} animate={{ rotate: benchAngle }} transition={loop}>
        <rect x="94" y="166" width="172" height="16" rx="8" fill="#172235" stroke="#ffffff" strokeOpacity="0.14" />
        <line x1="120" y1="181" x2="102" y2="214" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
        <line x1="236" y1="181" x2="254" y2="214" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
      </motion.g>
      <motion.g animate={{ rotate: bodyRotate }} transition={loop} style={{ transformOrigin: "180px 150px" }}>
        <circle cx="116" cy="145" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <path d="M132 148 L210 160" stroke="url(#bodyGradient)" strokeWidth="16" strokeLinecap="round" />
        <line x1="206" y1="162" x2="248" y2="183" stroke="#39d7ff" strokeWidth="10" strokeLinecap="round" />
        <line x1="206" y1="162" x2="238" y2="198" stroke="#40ff9a" strokeWidth="10" strokeLinecap="round" />
        <motion.line x1="145" y1="146" animate={{ x2: handX, y2: preset.pressY }} transition={loop} stroke="#40ff9a" strokeWidth="10" strokeLinecap="round" />
        <motion.line x1="182" y1="154" animate={{ x2: 208, y2: preset.elbowY }} transition={loop} stroke="#39d7ff" strokeWidth="10" strokeLinecap="round" />
        <motion.line animate={{ x1: handX, y1: preset.pressY, x2: 208, y2: preset.elbowY }} transition={loop} stroke="#39d7ff" strokeWidth="9" strokeLinecap="round" />
      </motion.g>
      <BenchEquipment preset={preset} />
    </>
  );
}

function BenchEquipment({ preset }: { preset: BenchPreset }) {
  if (preset.equipment === "barbell") {
    return <Barbell y={preset.pressY} />;
  }

  if (preset.equipment === "dumbbells") {
    return (
      <g>
        <DumbbellAt point={{ x: preset.handX ?? [142, 136, 142], y: preset.pressY }} />
        <DumbbellAt point={{ x: [218, 224, 218], y: preset.pressY }} />
      </g>
    );
  }

  if (preset.equipment === "ez-bar") {
    return (
      <motion.path
        d="M132 0 H156 L166 -8 L180 8 L194 -8 L204 0 H228"
        fill="none"
        stroke="#ffc857"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
        animate={{ y: preset.pressY }}
        transition={loop}
      />
    );
  }

  return (
    <motion.circle
      r="14"
      fill="url(#gearGradient)"
      animate={{ cx: preset.handX ?? [116, 178, 116], cy: preset.pressY }}
      transition={loop}
    />
  );
}

function FloorScene({ preset }: { preset: FloorPreset }) {
  if (preset.mode === "pushup") {
    return <PushupScene />;
  }

  if (preset.mode === "plank") {
    return <PlankScene />;
  }

  if (preset.mode === "crunch") {
    return <CrunchScene />;
  }

  if (preset.mode === "leg-raise") {
    return <LegRaiseScene />;
  }

  if (preset.mode === "twist") {
    return <TwistScene />;
  }

  return <BurpeeScene />;
}

function PushupScene() {
  return (
    <motion.g animate={{ y: [0, 24, 0] }} transition={loop}>
      <line x1="104" y1="147" x2="244" y2="147" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
      <circle cx="83" cy="143" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <motion.line x1="132" y1="151" x2="126" animate={{ y2: [190, 166, 190] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
      <motion.line x1="172" y1="151" x2="176" animate={{ y2: [190, 166, 190] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      <line x1="239" y1="150" x2="286" y2="178" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      <line x1="240" y1="151" x2="292" y2="157" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
    </motion.g>
  );
}

function PlankScene() {
  return (
    <motion.g animate={{ y: [0, -2, 0], rotate: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "180px 150px" }}>
      <line x1="96" y1="150" x2="252" y2="150" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
      <circle cx="76" cy="145" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="126" y1="154" x2="102" y2="190" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
      <line x1="248" y1="151" x2="294" y2="180" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      <line x1="248" y1="151" x2="300" y2="155" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
    </motion.g>
  );
}

function CrunchScene() {
  return (
    <g>
      <line x1="106" y1="190" x2="292" y2="190" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="12" strokeLinecap="round" />
      <motion.g animate={{ rotate: [0, -25, 0], x: [0, 12, 0], y: [0, -22, 0] }} transition={loop} style={{ transformOrigin: "190px 178px" }}>
        <circle cx="118" cy="162" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <path d="M136 168 C168 154 196 162 224 184" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
      </motion.g>
      <motion.path d="M220 184 C244 166 266 168 286 190" fill="none" stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" animate={{ rotate: [0, 8, 0] }} transition={loop} style={{ transformOrigin: "220px 184px" }} />
    </g>
  );
}

function LegRaiseScene() {
  return (
    <g>
      <path d="M80 55 H280" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="8" strokeLinecap="round" />
      <circle cx="180" cy="88" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="180" y1="102" x2="180" y2="154" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="14" />
      <line x1="154" y1="56" x2="172" y2="104" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <line x1="206" y1="56" x2="188" y2="104" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="180" y1="154" animate={{ x2: [144, 130, 144], y2: [194, 124, 194] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="180" y1="154" animate={{ x2: [216, 230, 216], y2: [194, 124, 194] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
    </g>
  );
}

function TwistScene() {
  return (
    <g>
      <motion.g animate={{ rotate: [-18, 18, -18] }} transition={loop} style={{ transformOrigin: "178px 152px" }}>
        <circle cx="156" cy="105" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <path d="M164 122 C185 130 196 148 202 170" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
        <line x1="174" y1="136" x2="126" y2="156" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <line x1="180" y1="139" x2="232" y2="156" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
        <circle cx="180" cy="154" r="12" fill="url(#gearGradient)" />
      </motion.g>
      <path d="M200 170 C230 170 248 184 268 204" fill="none" stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      <path d="M200 170 C228 158 248 158 274 169" fill="none" stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
    </g>
  );
}

function BurpeeScene() {
  return (
    <g>
      <motion.g animate={{ y: [-44, 36, 0, -44], rotate: [0, 0, -8, 0] }} transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "180px 142px" }}>
        <circle cx="180" cy="72" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="180" y1="88" x2="180" y2="142" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <line x1="174" y1="105" x2="138" y2="144" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <line x1="186" y1="105" x2="222" y2="144" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
        <line x1="180" y1="142" x2="146" y2="192" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
        <line x1="180" y1="142" x2="214" y2="192" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      </motion.g>
    </g>
  );
}

function PullScene({ preset }: { preset: PullPreset }) {
  if (preset.mode === "pullup") return <PullupScene />;
  if (preset.mode === "lat-pulldown") return <LatPulldownScene />;
  if (preset.mode === "barbell-row") return <BarbellRowScene />;
  if (preset.mode === "seated-row") return <SeatedRowScene />;
  if (preset.mode === "face-pull") return <FacePullScene />;
  return <RowerScene />;
}

function PullupScene() {
  return (
    <g>
      <line x1="82" y1="50" x2="278" y2="50" stroke="#ffffff" strokeOpacity="0.42" strokeWidth="8" strokeLinecap="round" />
      <motion.g animate={{ y: [44, 0, 44] }} transition={loop}>
        <circle cx="180" cy="104" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="180" y1="120" x2="180" y2="166" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <line x1="170" y1="126" x2="132" y2="54" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <line x1="190" y1="126" x2="228" y2="54" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
        <line x1="180" y1="166" x2="160" y2="206" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
        <line x1="180" y1="166" x2="202" y2="206" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      </motion.g>
    </g>
  );
}

function LatPulldownScene() {
  return (
    <g>
      <CableTower side="left" />
      <CableTower side="right" />
      <line x1="180" y1="40" x2="180" y2="88" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" />
      <motion.line x1="126" x2="234" animate={{ y1: [84, 124, 84], y2: [84, 124, 84] }} transition={loop} stroke="#e5edf8" strokeWidth="7" strokeLinecap="round" />
      <circle cx="180" cy="134" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="180" y1="150" x2="180" y2="192" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
      <motion.line x1="170" y1="154" animate={{ x2: [126, 144, 126], y2: [84, 124, 84] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="190" y1="154" animate={{ x2: [234, 216, 234], y2: [84, 124, 84] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <rect x="139" y="198" width="82" height="12" rx="6" fill="#172235" />
    </g>
  );
}

function BarbellRowScene() {
  return (
    <motion.g animate={{ rotate: [18, 22, 18] }} transition={loop} style={{ transformOrigin: "178px 150px" }}>
      <circle cx="145" cy="100" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <path d="M158 112 C186 118 204 138 220 166" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
      <line x1="210" y1="162" x2="178" y2="206" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
      <line x1="216" y1="166" x2="254" y2="204" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
      <motion.line x1="178" y1="132" animate={{ x2: [170, 205, 170], y2: [190, 144, 190] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="196" y1="142" animate={{ x2: [220, 218, 220], y2: [190, 150, 190] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <motion.g animate={{ y: [190, 148, 190] }} transition={loop}>
        <line x1="132" y1="0" x2="252" y2="0" stroke="#e5edf8" strokeWidth="7" strokeLinecap="round" />
        <rect x="112" y="-14" width="16" height="28" rx="4" fill="#ff4f7b" />
        <rect x="256" y="-14" width="16" height="28" rx="4" fill="#ffc857" />
      </motion.g>
    </motion.g>
  );
}

function SeatedRowScene() {
  return (
    <g>
      <CableTower side="right" />
      <rect x="105" y="190" width="100" height="13" rx="6" fill="#172235" />
      <motion.g animate={{ x: [8, -18, 8] }} transition={loop}>
        <circle cx="145" cy="114" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <path d="M155 128 C174 146 185 164 196 190" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
        <line x1="194" y1="188" x2="248" y2="190" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
        <motion.line x1="166" y1="144" animate={{ x2: [226, 188, 226], y2: [144, 142, 144] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <motion.line x1="174" y1="154" animate={{ x2: [226, 194, 226], y2: [154, 150, 154] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      </motion.g>
      <motion.line x1="282" y1="122" animate={{ x2: [234, 190, 234], y2: [148, 146, 148] }} transition={loop} stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" />
    </g>
  );
}

function FacePullScene() {
  return (
    <g>
      <CableTower side="right" />
      <circle cx="158" cy="98" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="158" y1="114" x2="168" y2="168" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
      <motion.line x1="168" y1="126" animate={{ x2: [244, 176, 244], y2: [122, 101, 122] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="172" y1="135" animate={{ x2: [244, 182, 244], y2: [134, 106, 134] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="282" y1="86" animate={{ x2: [244, 178, 244], y2: [128, 104, 128] }} transition={loop} stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" />
      <line x1="168" y1="168" x2="146" y2="208" stroke="#40ff9a" strokeLinecap="round" strokeWidth="10" />
      <line x1="168" y1="168" x2="198" y2="208" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
    </g>
  );
}

function RowerScene() {
  return (
    <g>
      <path d="M92 198 H272" stroke="#ffffff" strokeOpacity="0.24" strokeWidth="8" strokeLinecap="round" />
      <rect x="250" y="154" width="38" height="48" rx="8" fill="#172235" stroke="#39d7ff" strokeOpacity="0.28" />
      <motion.g animate={{ x: [34, -20, 34] }} transition={loop}>
        <circle cx="138" cy="116" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <motion.path d="M148 130 C170 148 178 170 186 194" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" animate={{ rotate: [-8, 14, -8] }} transition={loop} style={{ transformOrigin: "186px 194px" }} />
        <line x1="184" y1="192" x2="232" y2="194" stroke="#39d7ff" strokeLinecap="round" strokeWidth="10" />
        <line x1="154" y1="140" x2="220" y2="144" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      </motion.g>
      <motion.line x1="268" y1="176" animate={{ x2: [226, 176, 226], y2: [144, 142, 144] }} transition={loop} stroke="#ffffff" strokeOpacity="0.32" strokeWidth="2" />
    </g>
  );
}

function LegScene({ preset }: { preset: LegPreset }) {
  if (preset.mode === "squat") return <SquatScene />;
  if (preset.mode === "leg-press") return <LegPressScene />;
  if (preset.mode === "lunge") return <LungeScene />;
  if (preset.mode === "rdl") return <RdlScene />;
  return <CalfScene />;
}

function SquatScene() {
  return (
    <g>
      <motion.g animate={{ y: [0, 34, 0] }} transition={loop}>
        <circle cx="180" cy="68" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="180" y1="84" x2="180" y2="138" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <line x1="142" y1="96" x2="218" y2="96" stroke="#e5edf8" strokeWidth="7" strokeLinecap="round" />
        <rect x="120" y="80" width="16" height="32" rx="4" fill="#ff4f7b" />
        <rect x="224" y="80" width="16" height="32" rx="4" fill="#ffc857" />
      </motion.g>
      <motion.line x1="176" y1="138" animate={{ x2: [150, 138, 150], y2: [184, 172, 184] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line animate={{ x1: [150, 138, 150], y1: [184, 172, 184], x2: [132, 162, 132], y2: [210, 210, 210] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="184" y1="138" animate={{ x2: [212, 222, 212], y2: [184, 172, 184] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      <motion.line animate={{ x1: [212, 222, 212], y1: [184, 172, 184], x2: [232, 198, 232], y2: [210, 210, 210] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
    </g>
  );
}

function LegPressScene() {
  return (
    <g>
      <path d="M88 198 L248 80" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="12" strokeLinecap="round" />
      <motion.g animate={{ x: [0, 30, 0], y: [0, -22, 0] }} transition={loop}>
        <rect x="226" y="70" width="54" height="86" rx="9" fill="#172235" stroke="#39d7ff" strokeOpacity="0.32" />
        <rect x="232" y="80" width="42" height="66" rx="6" fill="#39d7ff" fillOpacity="0.12" />
      </motion.g>
      <circle cx="116" cy="154" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <path d="M130 162 C154 178 178 190 206 194" fill="none" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="16" />
      <motion.line x1="198" y1="190" animate={{ x2: [226, 250, 226], y2: [150, 128, 150] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="208" y1="194" animate={{ x2: [236, 260, 236], y2: [160, 138, 160] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
    </g>
  );
}

function LungeScene() {
  return (
    <motion.g animate={{ x: [-12, 18, -12] }} transition={loop}>
      <circle cx="172" cy="72" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="172" y1="88" x2="176" y2="142" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
      <DumbbellAt point={{ x: [132, 132, 132], y: [144, 144, 144] }} />
      <DumbbellAt point={{ x: [220, 220, 220], y: [144, 144, 144] }} />
      <line x1="160" y1="104" x2="132" y2="144" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <line x1="188" y1="104" x2="220" y2="144" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="176" y1="142" animate={{ x2: [144, 128, 144], y2: [180, 190, 180] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line animate={{ x1: [144, 128, 144], y1: [180, 190, 180], x2: [118, 118, 118], y2: [210, 210, 210] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="176" y1="142" animate={{ x2: [222, 226, 222], y2: [170, 186, 170] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      <motion.line animate={{ x1: [222, 226, 222], y1: [170, 186, 170], x2: [260, 260, 260], y2: [210, 210, 210] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
    </motion.g>
  );
}

function RdlScene() {
  return (
    <g>
      <motion.g animate={{ rotate: [0, 34, 0], y: [0, 10, 0] }} transition={loop} style={{ transformOrigin: "178px 144px" }}>
        <circle cx="180" cy="68" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="180" y1="84" x2="180" y2="142" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <line x1="162" y1="112" x2="142" y2="174" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <line x1="198" y1="112" x2="218" y2="174" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      </motion.g>
      <motion.g animate={{ y: [174, 198, 174] }} transition={loop}>
        <line x1="116" y1="0" x2="244" y2="0" stroke="#e5edf8" strokeLinecap="round" strokeWidth="7" />
        <rect x="94" y="-14" width="16" height="28" rx="4" fill="#ff4f7b" />
        <rect x="250" y="-14" width="16" height="28" rx="4" fill="#ffc857" />
      </motion.g>
      <line x1="174" y1="142" x2="156" y2="210" stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <line x1="186" y1="142" x2="206" y2="210" stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
    </g>
  );
}

function CalfScene() {
  return (
    <motion.g animate={{ y: [6, -10, 6] }} transition={loop}>
      <circle cx="180" cy="70" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
      <line x1="180" y1="86" x2="180" y2="144" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
      <line x1="160" y1="110" x2="134" y2="154" stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
      <line x1="200" y1="110" x2="226" y2="154" stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
      <motion.line x1="174" y1="144" animate={{ x2: [158, 160, 158], y2: [198, 188, 198] }} transition={loop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="186" y1="144" animate={{ x2: [204, 202, 204], y2: [198, 188, 198] }} transition={loop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      <motion.line x1="146" y1="204" animate={{ x2: [170, 174, 170], y2: [204, 198, 204] }} transition={loop} stroke="#ffffff" strokeOpacity="0.75" strokeLinecap="round" strokeWidth="8" />
      <motion.line x1="214" y1="204" animate={{ x2: [238, 234, 238], y2: [204, 198, 204] }} transition={loop} stroke="#ffffff" strokeOpacity="0.75" strokeLinecap="round" strokeWidth="8" />
    </motion.g>
  );
}

function CardioScene({ preset }: { preset: CardioPreset }) {
  if (preset.mode === "ropes") return <BattleRopesScene />;
  return <TreadmillScene />;
}

function TreadmillScene() {
  return (
    <g>
      <rect x="90" y="196" width="184" height="18" rx="9" fill="#172235" stroke="#39d7ff" strokeOpacity="0.28" />
      <motion.path d="M108 205 H254" stroke="#40ff9a" strokeOpacity="0.65" strokeWidth="3" strokeDasharray="12 10" animate={{ strokeDashoffset: [0, -44, 0] }} transition={quickLoop} />
      <motion.g animate={{ y: [0, -8, 0] }} transition={quickLoop}>
        <circle cx="180" cy="78" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="180" y1="94" x2="176" y2="144" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <motion.line x1="170" y1="108" animate={{ x2: [142, 210, 142], y2: [142, 116, 142] }} transition={quickLoop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <motion.line x1="188" y1="108" animate={{ x2: [218, 146, 218], y2: [140, 116, 140] }} transition={quickLoop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
        <motion.line x1="176" y1="144" animate={{ x2: [142, 220, 142], y2: [192, 178, 192] }} transition={quickLoop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
        <motion.line x1="178" y1="144" animate={{ x2: [220, 142, 220], y2: [178, 192, 178] }} transition={quickLoop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      </motion.g>
    </g>
  );
}

function BattleRopesScene() {
  return (
    <g>
      <motion.path d="M180 150 C220 118 252 180 300 150" fill="none" stroke="#40ff9a" strokeLinecap="round" strokeWidth="6" animate={{ d: ["M180 150 C220 118 252 180 300 150", "M180 150 C220 182 252 118 300 150", "M180 150 C220 118 252 180 300 150"] }} transition={quickLoop} />
      <motion.path d="M180 160 C220 192 252 130 300 160" fill="none" stroke="#39d7ff" strokeLinecap="round" strokeWidth="6" animate={{ d: ["M180 160 C220 192 252 130 300 160", "M180 160 C220 128 252 192 300 160", "M180 160 C220 192 252 130 300 160"] }} transition={quickLoop} />
      <motion.g animate={{ y: [0, -6, 0] }} transition={quickLoop}>
        <circle cx="150" cy="76" r="14" fill="#101722" stroke="#40ff9a" strokeWidth="3" />
        <line x1="150" y1="92" x2="160" y2="148" stroke="url(#bodyGradient)" strokeLinecap="round" strokeWidth="15" />
        <motion.line x1="158" y1="112" animate={{ x2: [184, 178, 184], y2: [150, 132, 150] }} transition={quickLoop} stroke="#40ff9a" strokeLinecap="round" strokeWidth="9" />
        <motion.line x1="164" y1="126" animate={{ x2: [184, 178, 184], y2: [160, 178, 160] }} transition={quickLoop} stroke="#39d7ff" strokeLinecap="round" strokeWidth="9" />
        <line x1="160" y1="148" x2="136" y2="204" stroke="#40ff9a" strokeLinecap="round" strokeWidth="11" />
        <line x1="160" y1="148" x2="198" y2="204" stroke="#39d7ff" strokeLinecap="round" strokeWidth="11" />
      </motion.g>
    </g>
  );
}

type MotionNumber = number | number[];

function AnatomyLine({
  x1,
  y1,
  x2,
  y2,
  width = 15,
  fill = "url(#skinGradient)",
  transition = loop
}: {
  x1: MotionNumber;
  y1: MotionNumber;
  x2: MotionNumber;
  y2: MotionNumber;
  width?: number;
  fill?: string;
  transition?: typeof loop | typeof quickLoop;
}) {
  const mainPulse = [width * 0.96, width * 1.08, width * 0.96];
  const fiberWidth = Math.max(1.8, width * 0.16);
  const highlightWidth = Math.max(2.4, width * 0.22);

  return (
    <g filter="url(#heavyShadow)">
      <motion.line
        animate={{ x1, y1, x2, y2 }}
        transition={transition}
        stroke="#05070b"
        strokeOpacity="0.42"
        strokeLinecap="round"
        strokeWidth={width + 8}
      />
      <motion.line
        animate={{ x1, y1, x2, y2, strokeWidth: mainPulse }}
        transition={transition}
        stroke={fill}
        strokeLinecap="round"
        strokeWidth={width}
      />
      <motion.line
        animate={{ x1, y1, x2, y2, strokeDashoffset: [0, -18, 0] }}
        transition={transition}
        stroke="url(#fiberGradient)"
        strokeDasharray={`${Math.max(7, width * 0.48)} ${Math.max(9, width * 0.58)}`}
        strokeLinecap="round"
        strokeWidth={fiberWidth}
      />
      <motion.line
        animate={{ x1, y1, x2, y2 }}
        transition={transition}
        stroke="#fff0dd"
        strokeOpacity="0.42"
        strokeLinecap="round"
        strokeWidth={highlightWidth}
      />
    </g>
  );
}

function AvatarHead({ x, y, rotate = [0, 0, 0], scale = 1 }: { x: MotionNumber; y: MotionNumber; rotate?: MotionNumber; scale?: number }) {
  return (
    <motion.g animate={{ x, y, rotate, scale }} transition={loop} style={{ transformOrigin: "0px 0px" }} filter="url(#heavyShadow)">
      <ellipse cx="0" cy="20" rx="8" ry="7" fill="#9f6544" opacity="0.92" />
      <ellipse cx="0" cy="1" rx="15" ry="17" fill="url(#skinGradient)" stroke="#fff0dd" strokeOpacity="0.45" strokeWidth="1.5" />
      <ellipse cx="-6" cy="-2" rx="4.5" ry="6" fill="#fff0dd" opacity="0.16" />
      <path
        d="M-17 -4 C-21 -13 -13 -18 -8 -15 C-8 -23 0 -21 2 -16 C6 -24 14 -19 13 -12 C20 -15 21 -5 15 -2 C7 -8 -3 -8 -17 -4Z"
        fill="#080a0f"
      />
      <path
        d="M-13 -8 C-8 -19 -3 -12 0 -18 C3 -10 9 -19 13 -7 C7 -11 -2 -10 -13 -8Z"
        fill="#262b33"
        opacity="0.7"
      />
      <path d="M-13 0 C-9 -3 -6 -3 -3 -1 M4 -1 C8 -3 11 -2 14 1" stroke="#111318" strokeLinecap="round" strokeWidth="1.3" opacity="0.75" />
      <circle cx="-5" cy="1" r="1.5" fill="#16181f" />
      <circle cx="5" cy="1" r="1.5" fill="#16181f" />
      <path d="M0 2 L-2 7 L2 7" fill="none" stroke="#7a4630" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" opacity="0.75" />
      <path d="M-4 9 C0 12 5 11 8 8" fill="none" stroke="#6d3f2e" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M-14 2 C-19 4 -18 12 -12 13" fill="url(#skinGradient)" opacity="0.9" />
      <motion.path
        d="M12 5 C17 10 15 16 10 18 C12 13 11 10 12 5Z"
        fill="#39d7ff"
        opacity="0.45"
        animate={{ y: [0, 4, 0], opacity: [0.08, 0.5, 0.08] }}
        transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.g>
  );
}

function AvatarTorso({ x = 180, y = 86, rotate = 0 }: { x?: MotionNumber; y?: MotionNumber; rotate?: MotionNumber }) {
  return (
    <motion.g animate={{ x, y, rotate }} transition={loop} style={{ transformOrigin: "0px 36px" }} filter="url(#heavyShadow)">
      <motion.g
        animate={{ scaleX: [1, 1.025, 1], scaleY: [1, 0.985, 1] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "0px 35px" }}
      >
        <path
          d="M-32 5 C-24 -11 24 -11 32 5 L29 56 C17 70 -17 70 -29 56Z"
          fill="url(#shirtGradient)"
          stroke="#fff0dd"
          strokeOpacity="0.38"
          strokeWidth="2"
        />
        <path d="M-25 13 C-10 23 10 23 25 13" fill="none" stroke="#7a4630" strokeOpacity="0.42" strokeWidth="1.8" />
        <path d="M-20 19 C-12 14 -5 14 0 22 C5 14 12 14 20 19" fill="none" stroke="#6d3f2e" strokeOpacity="0.34" strokeWidth="1.5" />
        <path d="M-18 31 C-10 26 -4 27 0 34 C4 27 10 26 18 31" fill="none" stroke="#6d3f2e" strokeOpacity="0.32" strokeWidth="1.5" />
        <path d="M-15 43 C-8 39 -3 40 0 46 C3 40 8 39 15 43" fill="none" stroke="#6d3f2e" strokeOpacity="0.3" strokeWidth="1.5" />
        <path d="M0 13 L0 58" stroke="#6d3f2e" strokeOpacity="0.38" strokeWidth="1.6" />
        <path d="M-31 6 C-39 10 -42 19 -39 29 M31 6 C39 10 42 19 39 29" fill="none" stroke="#fff0dd" strokeOpacity="0.18" strokeLinecap="round" strokeWidth="4" />
        <ellipse cx="-18" cy="21" rx="7" ry="17" fill="#ffffff" opacity="0.1" />
        <ellipse cx="18" cy="21" rx="7" ry="17" fill="#020617" opacity="0.12" />
        <path d="M-30 55 C-16 66 16 66 30 55 L36 77 C16 89 -16 89 -36 77Z" fill="url(#shortsGradient)" />
        <path d="M-21 62 C-8 67 8 67 21 62" stroke="#ffffff" strokeOpacity="0.1" strokeLinecap="round" strokeWidth="2" />
        <path d="M0 59 L0 80" stroke="#030507" strokeOpacity="0.55" strokeWidth="1.8" />
      </motion.g>
    </motion.g>
  );
}

function AvatarGlove({ point, size = 8 }: { point: PointFrames; size?: number }) {
  return (
    <motion.g animate={{ x: point.x, y: point.y, rotate: [-5, 5, -5] }} transition={loop} filter="url(#heavyShadow)">
      <ellipse cx="0" cy="0" rx={size + 3} ry={size} fill="#05070b" fillOpacity="0.3" />
      <ellipse cx="0" cy="-1" rx={size} ry={size + 2} fill="url(#gloveGradient)" stroke="#fff0dd" strokeOpacity="0.28" />
      <circle cx="-3" cy="-5" r={Math.max(2, size * 0.24)} fill="#fff0dd" opacity="0.28" />
    </motion.g>
  );
}

function AvatarShoe({ x, y, flip = false }: { x: MotionNumber; y: MotionNumber; flip?: boolean }) {
  return (
    <motion.g animate={{ x, y, scaleX: flip ? -1 : 1 }} transition={loop} filter="url(#heavyShadow)">
      <path d="M-5 -7 C7 -6 20 -1 25 6 C15 11 -11 10 -22 6 C-20 -2 -14 -7 -5 -7Z" fill="url(#shoeGradient)" />
      <path d="M-20 6 H23" stroke="#05070b" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />
      <path d="M-7 -3 C2 -2 10 0 17 4" stroke="#ffffff" strokeOpacity="0.42" strokeLinecap="round" strokeWidth="1.6" />
    </motion.g>
  );
}

function RealisticArm({ shoulder, arm }: { shoulder: { x: number; y: number }; arm: LimbFrames }) {
  return (
    <g>
      <AnatomyLine x1={shoulder.x} y1={shoulder.y} x2={arm.elbow.x} y2={arm.elbow.y} width={14} />
      <AnatomyLine x1={arm.elbow.x} y1={arm.elbow.y} x2={arm.hand.x} y2={arm.hand.y} width={12} />
      <Joint x={shoulder.x} y={shoulder.y} />
      <Joint x={arm.elbow.x} y={arm.elbow.y} />
      <AvatarGlove point={arm.hand} />
    </g>
  );
}

function RealisticStandingScene({ preset }: { preset: StandingPreset }) {
  const leftArm = preset.leftArm ?? baseLeftArm;
  const rightArm = preset.rightArm ?? baseRightArm;
  const bodyY = preset.bodyY ?? [0, 0, 0];
  const torsoRotate = preset.torsoRotate ?? [0, 0, 0];

  return (
    <>
      {preset.equipment === "cable-high" || preset.equipment === "cable-low" ? (
        <StandingEquipment preset={preset} leftHand={leftArm.hand} rightHand={rightArm.hand} />
      ) : null}
      {preset.equipment === "none" ? <DipBars /> : null}
      <motion.g animate={{ y: bodyY, rotate: torsoRotate }} transition={loop} style={{ transformOrigin: "180px 132px" }}>
        <AnatomyLine x1={171} y1={154} x2={154} y2={190} width={18} />
        <AnatomyLine x1={189} y1={154} x2={207} y2={190} width={18} />
        <AvatarShoe x={146} y={195} />
        <AvatarShoe x={215} y={195} flip />
        <RealisticArm shoulder={{ x: 157, y: 100 }} arm={leftArm} />
        <RealisticArm shoulder={{ x: 203, y: 100 }} arm={rightArm} />
        <AvatarTorso />
        <AvatarHead x={preset.headX ?? [180, 180, 180]} y={62} />
        {preset.equipment === "dumbbells" ? (
          <>
            <DumbbellAt point={leftArm.hand} />
            <DumbbellAt point={rightArm.hand} />
          </>
        ) : null}
        {preset.equipment === "barbell" && !preset.barY ? <Barbell y={leftArm.hand.y} /> : null}
        {preset.equipment === "barbell" && preset.barY ? <Barbell y={preset.barY} /> : null}
        {preset.equipment === "kettlebell" || preset.equipment === "medicine-ball" ? (
          <StandingEquipment preset={preset} leftHand={leftArm.hand} rightHand={rightArm.hand} />
        ) : null}
      </motion.g>
    </>
  );
}

function RealisticBenchScene({ preset }: { preset: BenchPreset }) {
  const benchAngle = preset.incline ? -14 : 0;
  const bodyRotate = preset.bodyRotate ?? benchAngle;
  const handX = preset.handX ?? [152, 152, 152];

  return (
    <>
      <motion.g style={{ transformOrigin: "180px 162px" }} animate={{ rotate: benchAngle }} transition={loop}>
        <rect x="88" y="166" width="184" height="18" rx="9" fill="#172235" stroke="#ffffff" strokeOpacity="0.18" />
        <rect x="104" y="154" width="82" height="11" rx="5" fill="#243554" opacity="0.8" />
        <path d="M121 183 L103 215 M239 183 L259 215" stroke="url(#metalGradient)" strokeOpacity="0.62" strokeWidth="7" strokeLinecap="round" />
      </motion.g>
      <motion.g animate={{ rotate: bodyRotate }} transition={loop} style={{ transformOrigin: "180px 150px" }}>
        <AvatarHead x={116} y={142} rotate={bodyRotate ? 0 : -6} scale={0.88} />
        <path d="M133 145 C158 136 191 144 214 160 C205 177 151 171 130 155Z" fill="url(#shirtGradient)" stroke="#bfffe0" strokeOpacity="0.28" strokeWidth="2" />
        <path d="M206 162 C221 164 237 173 252 185 L241 201 C223 194 209 183 198 170Z" fill="url(#shortsGradient)" />
        <AnatomyLine x1={209} y1={170} x2={248} y2={190} width={14} />
        <AnatomyLine x1={204} y1={166} x2={238} y2={204} width={14} />
        <AvatarShoe x={252} y={188} />
        <AvatarShoe x={239} y={205} flip />
        <AnatomyLine x1={145} y1={146} x2={handX} y2={preset.pressY} width={12} />
        <AnatomyLine x1={182} y1={154} x2={208} y2={preset.elbowY} width={13} />
        <AnatomyLine x1={208} y1={preset.elbowY} x2={preset.handX ?? [218, 224, 218]} y2={preset.pressY} width={12} />
        <AvatarGlove point={{ x: handX, y: preset.pressY }} size={7} />
        <AvatarGlove point={{ x: preset.handX ?? [218, 224, 218], y: preset.pressY }} size={7} />
      </motion.g>
      <BenchEquipment preset={preset} />
    </>
  );
}

function RealisticFloorScene({ preset }: { preset: FloorPreset }) {
  if (preset.mode === "pushup") return <RealisticPushup />;
  if (preset.mode === "plank") return <RealisticPlank />;
  if (preset.mode === "crunch") return <RealisticCrunch />;
  if (preset.mode === "leg-raise") return <RealisticLegRaise />;
  if (preset.mode === "twist") return <RealisticTwist />;
  return <RealisticBurpee />;
}

function RealisticPushup() {
  return (
    <motion.g animate={{ y: [0, 23, 0] }} transition={loop}>
      <AvatarHead x={82} y={141} rotate={-7} scale={0.9} />
      <path d="M101 143 C139 132 200 136 244 148 C238 164 150 164 99 154Z" fill="url(#shirtGradient)" />
      <AnatomyLine x1={132} y1={151} x2={126} y2={[190, 166, 190]} width={13} />
      <AnatomyLine x1={172} y1={151} x2={176} y2={[190, 166, 190]} width={13} />
      <AnatomyLine x1={238} y1={151} x2={286} y2={178} width={14} />
      <AnatomyLine x1={240} y1={151} x2={292} y2={157} width={14} />
      <AvatarShoe x={292} y={158} flip />
      <AvatarShoe x={286} y={179} flip />
    </motion.g>
  );
}

function RealisticPlank() {
  return (
    <motion.g animate={{ y: [0, -2, 0], rotate: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "180px 150px" }}>
      <AvatarHead x={76} y={144} rotate={-6} scale={0.9} />
      <path d="M96 145 C136 135 204 137 255 148 C249 162 149 163 94 154Z" fill="url(#shirtGradient)" />
      <AnatomyLine x1={126} y1={154} x2={102} y2={190} width={13} />
      <AnatomyLine x1={248} y1={151} x2={294} y2={180} width={14} />
      <AnatomyLine x1={248} y1={151} x2={300} y2={155} width={14} />
      <AvatarShoe x={298} y={156} flip />
    </motion.g>
  );
}

function RealisticCrunch() {
  return (
    <g>
      <path d="M106 190 H292" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="14" strokeLinecap="round" />
      <motion.g animate={{ rotate: [0, -25, 0], x: [0, 12, 0], y: [0, -22, 0] }} transition={loop} style={{ transformOrigin: "190px 178px" }}>
        <AvatarHead x={118} y={160} rotate={-8} scale={0.9} />
        <path d="M136 168 C166 150 198 158 226 184 C203 194 159 192 135 177Z" fill="url(#shirtGradient)" />
      </motion.g>
      <AnatomyLine x1={220} y1={184} x2={[250, 265, 250]} y2={[172, 178, 172]} width={14} />
      <AnatomyLine x1={224} y1={184} x2={286} y2={190} width={14} />
      <AvatarShoe x={286} y={190} flip />
    </g>
  );
}

function RealisticLegRaise() {
  return (
    <g>
      <path d="M80 55 H280" stroke="url(#metalGradient)" strokeWidth="9" strokeLinecap="round" />
      <AvatarHead x={180} y={88} scale={0.9} />
      <path d="M161 105 C171 98 190 98 199 105 L197 153 C187 160 173 160 163 153Z" fill="url(#shirtGradient)" />
      <AnatomyLine x1={154} y1={56} x2={172} y2={104} width={12} />
      <AnatomyLine x1={206} y1={56} x2={188} y2={104} width={12} />
      <AnatomyLine x1={180} y1={154} x2={[144, 130, 144]} y2={[194, 124, 194]} width={14} />
      <AnatomyLine x1={180} y1={154} x2={[216, 230, 216]} y2={[194, 124, 194]} width={14} />
    </g>
  );
}

function RealisticTwist() {
  return (
    <g>
      <motion.g animate={{ rotate: [-18, 18, -18] }} transition={loop} style={{ transformOrigin: "178px 152px" }}>
        <AvatarHead x={156} y={103} scale={0.9} />
        <path d="M161 119 C183 123 199 146 204 171 C186 179 163 169 152 143Z" fill="url(#shirtGradient)" />
        <AnatomyLine x1={174} y1={136} x2={126} y2={156} width={12} />
        <AnatomyLine x1={180} y1={139} x2={232} y2={156} width={12} />
        <circle cx="180" cy="154" r="13" fill="url(#gearGradient)" stroke="#ffffff" strokeOpacity="0.28" />
      </motion.g>
      <AnatomyLine x1={200} y1={170} x2={268} y2={204} width={14} />
      <AnatomyLine x1={200} y1={170} x2={274} y2={169} width={14} />
    </g>
  );
}

function RealisticBurpee() {
  return (
    <motion.g animate={{ y: [-44, 36, 0, -44], rotate: [0, 0, -8, 0] }} transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "180px 142px" }}>
      <AvatarHead x={180} y={70} />
      <AvatarTorso x={180} y={88} rotate={[0, 0, -4, 0]} />
      <AnatomyLine x1={162} y1={107} x2={138} y2={144} width={12} />
      <AnatomyLine x1={198} y1={107} x2={222} y2={144} width={12} />
      <AnatomyLine x1={174} y1={160} x2={146} y2={192} width={14} />
      <AnatomyLine x1={186} y1={160} x2={214} y2={192} width={14} />
      <AvatarShoe x={146} y={192} />
      <AvatarShoe x={214} y={192} flip />
    </motion.g>
  );
}

function RealisticPullScene({ preset }: { preset: PullPreset }) {
  if (preset.mode === "pullup") return <RealisticPullup />;
  if (preset.mode === "lat-pulldown") return <RealisticLatPulldown />;
  if (preset.mode === "barbell-row") return <RealisticBarbellRow />;
  if (preset.mode === "seated-row") return <RealisticSeatedRow />;
  if (preset.mode === "face-pull") return <RealisticFacePull />;
  return <RealisticRower />;
}

function RealisticPullup() {
  return (
    <g>
      <path d="M82 50 H278" stroke="url(#metalGradient)" strokeWidth="9" strokeLinecap="round" />
      <motion.g animate={{ y: [44, 0, 44] }} transition={loop}>
        <AvatarHead x={180} y={103} />
        <AvatarTorso x={180} y={120} />
        <AnatomyLine x1={164} y1={126} x2={132} y2={54} width={12} />
        <AnatomyLine x1={196} y1={126} x2={228} y2={54} width={12} />
        <AnatomyLine x1={173} y1={184} x2={160} y2={206} width={14} />
        <AnatomyLine x1={187} y1={184} x2={202} y2={206} width={14} />
      </motion.g>
    </g>
  );
}

function RealisticLatPulldown() {
  return (
    <g>
      <CableTower side="left" />
      <CableTower side="right" />
      <motion.path d="M126 0 H234" animate={{ y: [84, 124, 84] }} transition={loop} stroke="url(#metalGradient)" strokeWidth="8" strokeLinecap="round" />
      <AvatarHead x={180} y={132} />
      <AvatarTorso x={180} y={150} />
      <AnatomyLine x1={164} y1={154} x2={[126, 144, 126]} y2={[84, 124, 84]} width={12} />
      <AnatomyLine x1={196} y1={154} x2={[234, 216, 234]} y2={[84, 124, 84]} width={12} />
      <rect x="139" y="198" width="82" height="12" rx="6" fill="#172235" />
    </g>
  );
}

function RealisticBarbellRow() {
  return (
    <motion.g animate={{ rotate: [18, 22, 18] }} transition={loop} style={{ transformOrigin: "178px 150px" }}>
      <AvatarHead x={145} y={98} rotate={18} scale={0.9} />
      <path d="M158 112 C188 111 211 137 224 166 C203 177 169 159 151 127Z" fill="url(#shirtGradient)" />
      <AnatomyLine x1={210} y1={162} x2={178} y2={206} width={14} />
      <AnatomyLine x1={216} y1={166} x2={254} y2={204} width={14} />
      <AnatomyLine x1={178} y1={132} x2={[170, 205, 170]} y2={[190, 144, 190]} width={12} />
      <AnatomyLine x1={196} y1={142} x2={[220, 218, 220]} y2={[190, 150, 190]} width={12} />
      <motion.g animate={{ y: [190, 148, 190] }} transition={loop}>
        <path d="M132 0 H252" stroke="url(#metalGradient)" strokeWidth="8" strokeLinecap="round" />
        <rect x="112" y="-14" width="16" height="28" rx="4" fill="#ff4f7b" />
        <rect x="256" y="-14" width="16" height="28" rx="4" fill="#ffc857" />
      </motion.g>
    </motion.g>
  );
}

function RealisticSeatedRow() {
  return (
    <g>
      <CableTower side="right" />
      <rect x="105" y="190" width="100" height="13" rx="6" fill="#172235" />
      <motion.g animate={{ x: [8, -18, 8] }} transition={loop}>
        <AvatarHead x={145} y={114} scale={0.9} />
        <path d="M153 129 C177 139 192 160 201 190 C183 196 157 169 145 137Z" fill="url(#shirtGradient)" />
        <AnatomyLine x1={184} y1={192} x2={232} y2={194} width={14} />
        <AnatomyLine x1={154} y1={140} x2={[220, 188, 220]} y2={[144, 142, 144]} width={12} />
      </motion.g>
    </g>
  );
}

function RealisticFacePull() {
  return (
    <g>
      <CableTower side="right" />
      <AvatarHead x={158} y={98} scale={0.9} />
      <AvatarTorso x={168} y={114} rotate={-3} />
      <AnatomyLine x1={168} y1={126} x2={[244, 176, 244]} y2={[122, 101, 122]} width={12} />
      <AnatomyLine x1={172} y1={135} x2={[244, 182, 244]} y2={[134, 106, 134]} width={12} />
      <AnatomyLine x1={163} y1={184} x2={146} y2={208} width={14} />
      <AnatomyLine x1={176} y1={184} x2={198} y2={208} width={14} />
    </g>
  );
}

function RealisticRower() {
  return (
    <g>
      <path d="M92 198 H272" stroke="url(#metalGradient)" strokeOpacity="0.7" strokeWidth="9" strokeLinecap="round" />
      <rect x="250" y="154" width="38" height="48" rx="8" fill="#172235" stroke="#39d7ff" strokeOpacity="0.28" />
      <motion.g animate={{ x: [34, -20, 34] }} transition={loop}>
        <AvatarHead x={138} y={116} scale={0.9} />
        <path d="M148 130 C170 139 186 165 191 194 C173 195 149 162 139 132Z" fill="url(#shirtGradient)" />
        <AnatomyLine x1={184} y1={192} x2={232} y2={194} width={14} />
        <AnatomyLine x1={154} y1={140} x2={220} y2={144} width={12} />
      </motion.g>
    </g>
  );
}

function RealisticLegScene({ preset }: { preset: LegPreset }) {
  if (preset.mode === "squat") return <RealisticSquat />;
  if (preset.mode === "leg-press") return <RealisticLegPress />;
  if (preset.mode === "lunge") return <RealisticLunge />;
  if (preset.mode === "rdl") return <RealisticRdl />;
  return <RealisticCalf />;
}

function RealisticSquat() {
  return (
    <g>
      <motion.g animate={{ y: [0, 34, 0] }} transition={loop}>
        <AvatarHead x={180} y={68} />
        <AvatarTorso x={180} y={84} />
        <Barbell y={96} />
      </motion.g>
      <AnatomyLine x1={176} y1={154} x2={[150, 138, 150]} y2={[184, 172, 184]} width={17} />
      <AnatomyLine x1={[150, 138, 150]} y1={[184, 172, 184]} x2={[132, 162, 132]} y2={[210, 210, 210]} width={15} />
      <AnatomyLine x1={184} y1={154} x2={[212, 222, 212]} y2={[184, 172, 184]} width={17} />
      <AnatomyLine x1={[212, 222, 212]} y1={[184, 172, 184]} x2={[232, 198, 232]} y2={[210, 210, 210]} width={15} />
    </g>
  );
}

function RealisticLegPress() {
  return (
    <g>
      <path d="M88 198 L248 80" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="13" strokeLinecap="round" />
      <motion.g animate={{ x: [0, 30, 0], y: [0, -22, 0] }} transition={loop}>
        <rect x="226" y="70" width="54" height="86" rx="9" fill="#172235" stroke="#39d7ff" strokeOpacity="0.32" />
      </motion.g>
      <AvatarHead x={116} y={154} scale={0.9} />
      <path d="M130 162 C156 164 187 180 209 194 C197 207 149 190 124 170Z" fill="url(#shirtGradient)" />
      <AnatomyLine x1={198} y1={190} x2={[226, 250, 226]} y2={[150, 128, 150]} width={16} />
      <AnatomyLine x1={208} y1={194} x2={[236, 260, 236]} y2={[160, 138, 160]} width={16} />
    </g>
  );
}

function RealisticLunge() {
  return (
    <motion.g animate={{ x: [-12, 18, -12] }} transition={loop}>
      <AvatarHead x={172} y={70} />
      <AvatarTorso x={174} y={88} />
      <DumbbellAt point={{ x: [132, 132, 132], y: [144, 144, 144] }} />
      <DumbbellAt point={{ x: [220, 220, 220], y: [144, 144, 144] }} />
      <AnatomyLine x1={158} y1={107} x2={132} y2={144} width={12} />
      <AnatomyLine x1={196} y1={107} x2={220} y2={144} width={12} />
      <AnatomyLine x1={176} y1={160} x2={[144, 128, 144]} y2={[180, 190, 180]} width={16} />
      <AnatomyLine x1={[144, 128, 144]} y1={[180, 190, 180]} x2={118} y2={210} width={15} />
      <AnatomyLine x1={184} y1={160} x2={[222, 226, 222]} y2={[170, 186, 170]} width={16} />
      <AnatomyLine x1={[222, 226, 222]} y1={[170, 186, 170]} x2={260} y2={210} width={15} />
    </motion.g>
  );
}

function RealisticRdl() {
  return (
    <g>
      <motion.g animate={{ rotate: [0, 34, 0], y: [0, 10, 0] }} transition={loop} style={{ transformOrigin: "178px 144px" }}>
        <AvatarHead x={180} y={68} />
        <AvatarTorso x={180} y={84} />
        <AnatomyLine x1={162} y1={112} x2={142} y2={174} width={12} />
        <AnatomyLine x1={198} y1={112} x2={218} y2={174} width={12} />
      </motion.g>
      <Barbell y={[174, 198, 174]} />
      <AnatomyLine x1={174} y1={154} x2={156} y2={210} width={16} />
      <AnatomyLine x1={186} y1={154} x2={206} y2={210} width={16} />
    </g>
  );
}

function RealisticCalf() {
  return (
    <motion.g animate={{ y: [6, -10, 6] }} transition={loop}>
      <AvatarHead x={180} y={70} />
      <AvatarTorso x={180} y={86} />
      <AnatomyLine x1={160} y1={110} x2={134} y2={154} width={12} />
      <AnatomyLine x1={200} y1={110} x2={226} y2={154} width={12} />
      <AnatomyLine x1={174} y1={160} x2={[158, 160, 158]} y2={[198, 188, 198]} width={16} />
      <AnatomyLine x1={186} y1={160} x2={[204, 202, 204]} y2={[198, 188, 198]} width={16} />
      <AvatarShoe x={[170, 174, 170]} y={[204, 198, 204]} />
      <AvatarShoe x={[238, 234, 238]} y={[204, 198, 204]} flip />
    </motion.g>
  );
}

function RealisticCardioScene({ preset }: { preset: CardioPreset }) {
  if (preset.mode === "ropes") return <RealisticBattleRopes />;
  return <RealisticTreadmill />;
}

function RealisticTreadmill() {
  return (
    <g>
      <rect x="90" y="196" width="184" height="18" rx="9" fill="#172235" stroke="#39d7ff" strokeOpacity="0.28" />
      <motion.path d="M108 205 H254" stroke="#40ff9a" strokeOpacity="0.65" strokeWidth="3" strokeDasharray="12 10" animate={{ strokeDashoffset: [0, -44, 0] }} transition={quickLoop} />
      <motion.g animate={{ y: [0, -8, 0] }} transition={quickLoop}>
        <AvatarHead x={180} y={78} />
        <AvatarTorso x={178} y={94} rotate={[-3, 3, -3]} />
        <AnatomyLine x1={170} y1={108} x2={[142, 210, 142]} y2={[142, 116, 142]} width={12} transition={quickLoop} />
        <AnatomyLine x1={188} y1={108} x2={[218, 146, 218]} y2={[140, 116, 140]} width={12} transition={quickLoop} />
        <AnatomyLine x1={176} y1={160} x2={[142, 220, 142]} y2={[192, 178, 192]} width={15} transition={quickLoop} />
        <AnatomyLine x1={178} y1={160} x2={[220, 142, 220]} y2={[178, 192, 178]} width={15} transition={quickLoop} />
      </motion.g>
    </g>
  );
}

function RealisticBattleRopes() {
  return (
    <g>
      <motion.path d="M180 150 C220 118 252 180 300 150" fill="none" stroke="#40ff9a" strokeLinecap="round" strokeWidth="7" animate={{ d: ["M180 150 C220 118 252 180 300 150", "M180 150 C220 182 252 118 300 150", "M180 150 C220 118 252 180 300 150"] }} transition={quickLoop} />
      <motion.path d="M180 160 C220 192 252 130 300 160" fill="none" stroke="#39d7ff" strokeLinecap="round" strokeWidth="7" animate={{ d: ["M180 160 C220 192 252 130 300 160", "M180 160 C220 128 252 192 300 160", "M180 160 C220 192 252 130 300 160"] }} transition={quickLoop} />
      <motion.g animate={{ y: [0, -6, 0] }} transition={quickLoop}>
        <AvatarHead x={150} y={76} />
        <AvatarTorso x={158} y={92} rotate={8} />
        <AnatomyLine x1={158} y1={112} x2={[184, 178, 184]} y2={[150, 132, 150]} width={12} transition={quickLoop} />
        <AnatomyLine x1={164} y1={126} x2={[184, 178, 184]} y2={[160, 178, 160]} width={12} transition={quickLoop} />
        <AnatomyLine x1={160} y1={160} x2={136} y2={204} width={15} />
        <AnatomyLine x1={160} y1={160} x2={198} y2={204} width={15} />
      </motion.g>
    </g>
  );
}

function RealisticScene({ preset }: { preset: ExercisePreset }) {
  if (preset.template === "standing") return <RealisticStandingScene preset={preset} />;
  if (preset.template === "bench") return <RealisticBenchScene preset={preset} />;
  if (preset.template === "floor") return <RealisticFloorScene preset={preset} />;
  if (preset.template === "pull") return <RealisticPullScene preset={preset} />;
  if (preset.template === "legs") return <RealisticLegScene preset={preset} />;
  return <RealisticCardioScene preset={preset} />;
}

function GuideImagePending({
  exerciseName,
  muscleGroup,
  equipment,
  instructions = [],
  recommendedSets,
  recommendedReps
}: {
  exerciseName: string;
  muscleGroup: string;
  equipment?: string;
  instructions?: string[];
  recommendedSets?: number;
  recommendedReps?: string;
}) {
  const muscles = getTargetMuscles(exerciseName, muscleGroup);
  const steps = instructions.length > 0 ? instructions.slice(0, 3) : getDefaultSteps(exerciseName, muscleGroup).slice(0, 3);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300/70 bg-[#f8fafc] text-slate-950">
      <div className="grid min-h-[340px] lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-h-[280px] flex-col justify-between bg-[linear-gradient(145deg,#ffffff,#eef2f7)] p-5">
          <div>
            <div className="text-3xl font-black uppercase italic tracking-normal">{exerciseName}</div>
            <div className="mt-2 inline-flex rounded bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">
              {equipment ?? muscleGroup}
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-5 text-center">
            <div className="text-sm font-black uppercase text-slate-800">Illustrated guide image needed</div>
            <div className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-slate-500">
              Add a generated image at the matching exercise-media path to replace this placeholder.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {recommendedSets ? (
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-black uppercase text-slate-500">Sets</div>
                <div className="text-lg font-black">{recommendedSets}</div>
              </div>
            ) : null}
            {recommendedReps ? (
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                <div className="text-[10px] font-black uppercase text-slate-500">Reps</div>
                <div className="text-sm font-black">{recommendedReps}</div>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
          <div className="rounded-lg bg-slate-950 px-3 py-2 text-center text-sm font-black uppercase text-white">Muscles Worked</div>
          <div className="mt-3 space-y-2">
            {muscles.map((muscle) => (
              <div key={muscle.name} className="flex items-center gap-2 text-sm font-bold">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: muscle.color }} />
                <span>{muscle.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs font-black uppercase text-slate-500">How to perform</div>
          <ol className="mt-2 space-y-2 text-xs font-semibold leading-5 text-slate-700">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex gap-2">
                <span className="font-black text-slate-950">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

export function ExerciseAnimation({
  exerciseName,
  muscleGroup,
  animationType,
  media,
  equipment,
  instructions,
  recommendedSets,
  recommendedReps
}: ExerciseAnimationProps) {
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setMediaFailed(false);
  }, [media?.src]);

  if (!mediaFailed && (media?.type === "image" || media?.type === "gif")) {
    return (
      <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
        <img
          src={media.src}
          alt={media.alt ?? exerciseName}
          className="h-full w-full object-contain object-center"
          onError={() => setMediaFailed(true)}
        />
      </div>
    );
  }

  if (!mediaFailed && media?.type === "video") {
    return (
      <video
        src={media.src}
        className="aspect-[4/3] w-full rounded-lg border border-white/10 bg-ink-950 object-cover"
        controls
        muted
        loop
        onError={() => setMediaFailed(true)}
      />
    );
  }

  return (
    <GuideImagePending
      exerciseName={exerciseName}
      muscleGroup={muscleGroup}
      equipment={equipment}
      instructions={instructions}
      recommendedSets={recommendedSets}
      recommendedReps={recommendedReps}
    />
  );
}
