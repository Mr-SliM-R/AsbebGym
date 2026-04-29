import { motion } from "framer-motion";
import { Activity, Box, Dumbbell, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  children
}: {
  exerciseName: string;
  muscleGroup: string;
  cue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(64,255,154,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(57,215,255,0.14),transparent_34%),linear-gradient(145deg,#101722,#070a0f)]">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/75 px-3 py-1 text-xs font-bold text-slate-200">
        <Activity className="h-3.5 w-3.5 text-rival-green" />
        Original motion
      </div>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-rival-cyan/20 bg-rival-cyan/10 px-3 py-1 text-xs font-bold text-rival-cyan">
        <Play className="h-3.5 w-3.5 fill-current" />
        Loop
      </div>
      <svg viewBox="0 0 360 260" className="absolute inset-0 h-full w-full" role="img" aria-label={`${exerciseName} animation`}>
        <defs>
          <linearGradient id="bodyGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#40ff9a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#39d7ff" stopOpacity="0.92" />
          </linearGradient>
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
        </defs>
        <Grid />
        {children}
      </svg>
      <div className="absolute bottom-4 left-4 z-10 max-w-[72%]">
        <div className="text-sm font-bold text-white">{exerciseName}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-slate-300">{muscleGroup}</span>
          <span className="rounded-full border border-rival-green/20 bg-rival-green/10 px-2 py-1 text-rival-green">{cue}</span>
        </div>
      </div>
    </div>
  );
}

function Grid() {
  return (
    <g opacity="0.9">
      <path d="M32 206 C92 190 264 190 328 206" fill="none" stroke="#39d7ff" strokeOpacity="0.26" strokeWidth="2" />
      <path d="M54 213 L306 213" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
      <path d="M78 219 L282 219" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />
      {Array.from({ length: 8 }).map((_, index) => (
        <path
          key={index}
          d={`M${58 + index * 35} 210 L${70 + index * 30} 228`}
          stroke="#ffffff"
          strokeOpacity="0.055"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

function Joint({ x, y }: { x: number | number[]; y: number | number[] }) {
  return (
    <motion.circle
      r="4"
      fill="#05070b"
      stroke="#40ff9a"
      strokeWidth="2"
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
    <motion.g animate={{ x: point.x, y: point.y }} transition={loop}>
      <rect x="-15" y="-4" width="30" height="8" rx="4" fill="#e5edf8" />
      <rect x="-21" y="-8" width="8" height="16" rx="3" fill="#ff4f7b" />
      <rect x="13" y="-8" width="8" height="16" rx="3" fill="#ffc857" />
    </motion.g>
  );
}

function Barbell({ y }: { y: number | number[] }) {
  return (
    <motion.g animate={{ y }} transition={loop}>
      <line x1="116" y1="0" x2="244" y2="0" stroke="#e5edf8" strokeLinecap="round" strokeWidth="7" />
      <rect x="96" y="-17" width="16" height="34" rx="4" fill="#ff4f7b" />
      <rect x="248" y="-17" width="16" height="34" rx="4" fill="#ffc857" />
      <rect x="78" y="-13" width="14" height="26" rx="4" fill="#ff4f7b" opacity="0.82" />
      <rect x="268" y="-13" width="14" height="26" rx="4" fill="#ffc857" opacity="0.82" />
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
        <motion.g animate={{ x: preset.handX ?? [142, 136, 142], y: preset.pressY }} transition={loop}>
          <rect x="-16" y="-5" width="32" height="10" rx="5" fill="#e5edf8" />
          <rect x="-24" y="-10" width="8" height="20" rx="3" fill="#ff4f7b" />
          <rect x="16" y="-10" width="8" height="20" rx="3" fill="#ffc857" />
        </motion.g>
        <motion.g animate={{ x: [218, 224, 218], y: preset.pressY }} transition={loop}>
          <rect x="-16" y="-5" width="32" height="10" rx="5" fill="#e5edf8" />
          <rect x="-24" y="-10" width="8" height="20" rx="3" fill="#ff4f7b" />
          <rect x="16" y="-10" width="8" height="20" rx="3" fill="#ffc857" />
        </motion.g>
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

export function ExerciseAnimation({ exerciseName, muscleGroup, animationType, media }: ExerciseAnimationProps) {
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setMediaFailed(false);
  }, [media?.src]);

  const preset = useMemo(() => getPreset(exerciseName, animationType), [exerciseName, animationType]);

  if (!mediaFailed && (media?.type === "image" || media?.type === "gif")) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-ink-950">
        <img
          src={media.src}
          alt={media.alt ?? exerciseName}
          className="h-full w-full object-cover"
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
    <SceneShell exerciseName={exerciseName} muscleGroup={muscleGroup} cue={preset.cue}>
      {preset.template === "standing" ? <StandingScene preset={preset} /> : null}
      {preset.template === "bench" ? <BenchScene preset={preset} /> : null}
      {preset.template === "floor" ? <FloorScene preset={preset} /> : null}
      {preset.template === "pull" ? <PullScene preset={preset} /> : null}
      {preset.template === "legs" ? <LegScene preset={preset} /> : null}
      {preset.template === "cardio" ? <CardioScene preset={preset} /> : null}
      <motion.g animate={{ opacity: [0.38, 1, 0.38], scale: [0.96, 1.04, 0.96] }} transition={loop}>
        <foreignObject x="300" y="202" width="42" height="42">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rival-green/30 bg-rival-green/10 text-rival-green">
            {preset.template === "legs" ? <Box className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
          </div>
        </foreignObject>
      </motion.g>
    </SceneShell>
  );
}
