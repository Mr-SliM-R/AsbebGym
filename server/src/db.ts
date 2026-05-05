import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.resolve(__dirname, "../data");
export const DB_PATH = path.join(DATA_DIR, "gym-rival.sqlite");

let db: DatabaseSync | undefined;

const categories = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Abs",
  "Cardio",
  "Full Body"
];

const ranks = [
  { name: "Bronze", minPoints: 0, maxPoints: 499, color: "#f59e0b" },
  { name: "Silver", minPoints: 500, maxPoints: 1499, color: "#cbd5e1" },
  { name: "Gold", minPoints: 1500, maxPoints: 2999, color: "#facc15" },
  { name: "Diamond", minPoints: 3000, maxPoints: 4999, color: "#38bdf8" },
  { name: "Master", minPoints: 5000, maxPoints: 7999, color: "#fb7185" },
  { name: "Titan", minPoints: 8000, maxPoints: 999999, color: "#a78bfa" }
];

const users = [
  {
    id: 1,
    username: "Slim",
    avatar: "S",
    weightGoal: "Lean muscle gain",
    favoriteMuscleGroup: "Chest"
  },
  {
    id: 2,
    username: "Adel",
    avatar: "A",
    weightGoal: "Strength and conditioning",
    favoriteMuscleGroup: "Legs"
  },
  {
    id: 3,
    username: "Saber",
    avatar: "S",
    weightGoal: "Power and athleticism",
    favoriteMuscleGroup: "Back"
  }
];

const badges = [
  ["First Workout", "Complete your first workout check-in or saved workout.", "Medal"],
  ["7-Day Streak", "Check in for seven training days in a row.", "Flame"],
  ["30-Day Streak", "Check in for thirty training days in a row.", "CalendarCheck"],
  ["Chest Warrior", "Complete three chest sessions.", "Shield"],
  ["Leg Day Survivor", "Complete two leg sessions.", "Dumbbell"],
  ["Cardio Machine", "Complete three cardio sessions.", "Activity"],
  ["1000 Points", "Reach 1000 total points.", "Trophy"],
  ["5000 Points", "Reach 5000 total points.", "Crown"]
];

type ExerciseSeed = {
  name: string;
  muscleGroup: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: string;
  instructions: string[];
  commonMistakes: string[];
  recommendedSets: number;
  recommendedReps: string;
  animationType: string;
  animationMediaType?: string | null;
  animationSrc?: string | null;
  animationCredit?: string | null;
  caloriesEstimate: number;
};

const exercises: ExerciseSeed[] = [
  {
    name: "Back Squat",
    muscleGroup: "Legs",
    difficulty: "Intermediate",
    equipment: "Barbell, squat rack",
    instructions: [
      "Set the bar across your upper back and brace your core.",
      "Sit the hips back and bend the knees under control.",
      "Descend until thighs reach at least parallel.",
      "Drive through the midfoot and stand tall."
    ],
    commonMistakes: ["Knees collapsing inward", "Losing core tension", "Heels lifting off the floor"],
    recommendedSets: 4,
    recommendedReps: "6-10",
    animationType: "squat",
    caloriesEstimate: 90
  },
  {
    name: "Leg Press",
    muscleGroup: "Legs",
    difficulty: "Beginner",
    equipment: "Leg press machine",
    instructions: [
      "Place feet shoulder-width on the platform.",
      "Lower the sled until knees bend deeply without hips lifting.",
      "Press the platform away while keeping knees aligned.",
      "Stop just before locking the knees."
    ],
    commonMistakes: ["Locking knees hard", "Letting hips curl up", "Using a shallow range of motion"],
    recommendedSets: 4,
    recommendedReps: "10-15",
    animationType: "press",
    caloriesEstimate: 75
  },
  {
    name: "Walking Lunges",
    muscleGroup: "Legs",
    difficulty: "Intermediate",
    equipment: "Bodyweight or dumbbells",
    instructions: [
      "Stand tall with shoulders stacked over hips.",
      "Step forward and lower both knees under control.",
      "Push through the front foot to rise.",
      "Alternate legs for the target reps."
    ],
    commonMistakes: ["Short steps", "Front knee caving inward", "Torso leaning too far forward"],
    recommendedSets: 3,
    recommendedReps: "10-12 each leg",
    animationType: "lunge",
    caloriesEstimate: 80
  },
  {
    name: "Romanian Deadlift",
    muscleGroup: "Legs",
    difficulty: "Intermediate",
    equipment: "Barbell or dumbbells",
    instructions: [
      "Hold the weight with soft knees and a tall chest.",
      "Hinge the hips back while keeping the spine neutral.",
      "Lower until hamstrings are stretched.",
      "Drive hips forward to stand."
    ],
    commonMistakes: ["Squatting instead of hinging", "Rounding the back", "Letting the bar drift forward"],
    recommendedSets: 3,
    recommendedReps: "8-12",
    animationType: "hinge",
    caloriesEstimate: 85
  },
  {
    name: "Calf Raises",
    muscleGroup: "Legs",
    difficulty: "Beginner",
    equipment: "Machine, dumbbells, or step",
    instructions: [
      "Stand with feet hip-width apart.",
      "Rise onto the balls of your feet.",
      "Pause at the top and squeeze calves.",
      "Lower slowly to a full stretch."
    ],
    commonMistakes: ["Bouncing reps", "Partial range", "Rolling ankles outward"],
    recommendedSets: 4,
    recommendedReps: "12-20",
    animationType: "pulse",
    caloriesEstimate: 40
  },
  {
    name: "Bench Press",
    muscleGroup: "Chest",
    difficulty: "Intermediate",
    equipment: "Barbell, bench",
    instructions: [
      "Lie on the bench with shoulder blades squeezed.",
      "Grip the bar slightly wider than shoulder width.",
      "Lower the bar to the lower chest.",
      "Press up and back until arms are extended."
    ],
    commonMistakes: ["Flaring elbows too wide", "Bouncing the bar", "Feet moving around"],
    recommendedSets: 4,
    recommendedReps: "5-8",
    animationType: "press",
    animationMediaType: "image",
    animationSrc: "/exercise-media/chest/bench-press-guide.png",
    animationCredit: "Generated in-house with ChatGPT image tools",
    caloriesEstimate: 70
  },
  {
    name: "Push-ups",
    muscleGroup: "Chest",
    difficulty: "Beginner",
    equipment: "Bodyweight",
    instructions: [
      "Start in a plank with hands under shoulders.",
      "Lower your chest toward the floor.",
      "Keep body straight from head to heels.",
      "Push the floor away to return to plank."
    ],
    commonMistakes: ["Sagging hips", "Half reps", "Elbows flaring sharply"],
    recommendedSets: 3,
    recommendedReps: "10-25",
    animationType: "pushup",
    caloriesEstimate: 50
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    difficulty: "Intermediate",
    equipment: "Incline bench, dumbbells",
    instructions: [
      "Set the bench to a moderate incline.",
      "Start dumbbells beside the upper chest.",
      "Press up while keeping wrists stacked.",
      "Lower slowly with elbows under control."
    ],
    commonMistakes: ["Bench set too steep", "Dumbbells drifting forward", "Shrugging shoulders"],
    recommendedSets: 3,
    recommendedReps: "8-12",
    animationType: "press",
    caloriesEstimate: 65
  },
  {
    name: "Cable Fly",
    muscleGroup: "Chest",
    difficulty: "Intermediate",
    equipment: "Cable machine",
    instructions: [
      "Set pulleys around chest height.",
      "Step forward with a slight lean.",
      "Bring hands together in a wide arc.",
      "Control the stretch on the way back."
    ],
    commonMistakes: ["Turning it into a press", "Overstretching shoulders", "Rushing the eccentric"],
    recommendedSets: 3,
    recommendedReps: "12-15",
    animationType: "fly",
    caloriesEstimate: 45
  },
  {
    name: "Dumbbell Pullover",
    muscleGroup: "Chest",
    difficulty: "Advanced",
    equipment: "Bench, dumbbell",
    instructions: [
      "Lie across or along a bench with one dumbbell held above chest.",
      "Lower the dumbbell behind your head with soft elbows.",
      "Feel the chest and lats stretch.",
      "Pull back to the starting position."
    ],
    commonMistakes: ["Overarching lower back", "Bending elbows too much", "Going beyond shoulder comfort"],
    recommendedSets: 3,
    recommendedReps: "10-12",
    animationType: "arc",
    caloriesEstimate: 45
  },
  {
    name: "Pull-ups",
    muscleGroup: "Back",
    difficulty: "Advanced",
    equipment: "Pull-up bar",
    instructions: [
      "Hang from the bar with hands outside shoulder width.",
      "Pull elbows down toward your ribs.",
      "Raise your chin over the bar.",
      "Lower to a controlled full hang."
    ],
    commonMistakes: ["Kipping every rep", "Stopping short at the bottom", "Craning the neck"],
    recommendedSets: 4,
    recommendedReps: "5-10",
    animationType: "pull",
    caloriesEstimate: 80
  },
  {
    name: "Lat Pulldown",
    muscleGroup: "Back",
    difficulty: "Beginner",
    equipment: "Cable pulldown machine",
    instructions: [
      "Grip the bar wider than shoulder width.",
      "Lean back slightly with chest lifted.",
      "Pull the bar to upper chest.",
      "Return slowly until arms are extended."
    ],
    commonMistakes: ["Pulling behind the neck", "Using momentum", "Shrugging the shoulders"],
    recommendedSets: 3,
    recommendedReps: "10-12",
    animationType: "pull",
    caloriesEstimate: 60
  },
  {
    name: "Barbell Row",
    muscleGroup: "Back",
    difficulty: "Intermediate",
    equipment: "Barbell",
    instructions: [
      "Hinge forward with a neutral spine.",
      "Let the bar hang below shoulders.",
      "Row the bar toward the lower ribs.",
      "Lower under control without standing up."
    ],
    commonMistakes: ["Standing too upright", "Jerking the weight", "Rounding the back"],
    recommendedSets: 4,
    recommendedReps: "6-10",
    animationType: "row",
    caloriesEstimate: 75
  },
  {
    name: "Seated Cable Row",
    muscleGroup: "Back",
    difficulty: "Beginner",
    equipment: "Cable row machine",
    instructions: [
      "Sit tall with knees softly bent.",
      "Pull the handle toward the lower ribs.",
      "Squeeze shoulder blades together.",
      "Reach forward under control."
    ],
    commonMistakes: ["Rocking the torso", "Shrugging", "Letting the shoulders roll forward hard"],
    recommendedSets: 3,
    recommendedReps: "10-14",
    animationType: "row",
    caloriesEstimate: 55
  },
  {
    name: "Face Pull",
    muscleGroup: "Back",
    difficulty: "Beginner",
    equipment: "Cable rope",
    instructions: [
      "Set the rope around face height.",
      "Pull the rope toward your eyebrows.",
      "Keep elbows high and apart.",
      "Return slowly with control."
    ],
    commonMistakes: ["Pulling too low", "Arching the back", "Using too much weight"],
    recommendedSets: 3,
    recommendedReps: "12-20",
    animationType: "pull",
    caloriesEstimate: 35
  },
  {
    name: "Shoulder Press",
    muscleGroup: "Shoulders",
    difficulty: "Intermediate",
    equipment: "Dumbbells or barbell",
    instructions: [
      "Start with weights at shoulder height.",
      "Brace ribs down and squeeze glutes.",
      "Press overhead until arms are extended.",
      "Lower to shoulders with control."
    ],
    commonMistakes: ["Overarching the lower back", "Pressing forward", "Bouncing from the shoulders"],
    recommendedSets: 4,
    recommendedReps: "6-10",
    animationType: "overhead",
    caloriesEstimate: 65
  },
  {
    name: "Lateral Raise",
    muscleGroup: "Shoulders",
    difficulty: "Beginner",
    equipment: "Dumbbells or cables",
    instructions: [
      "Hold weights by your sides.",
      "Raise arms out until elbows reach shoulder height.",
      "Keep wrists neutral and elbows slightly bent.",
      "Lower slowly."
    ],
    commonMistakes: ["Swinging the torso", "Raising too high", "Leading with the hands instead of elbows"],
    recommendedSets: 4,
    recommendedReps: "12-20",
    animationType: "raise",
    caloriesEstimate: 35
  },
  {
    name: "Rear Delt Fly",
    muscleGroup: "Shoulders",
    difficulty: "Beginner",
    equipment: "Dumbbells or reverse pec deck",
    instructions: [
      "Hinge forward or sit on the machine.",
      "Open arms wide with soft elbows.",
      "Squeeze rear shoulders at the top.",
      "Return slowly."
    ],
    commonMistakes: ["Using traps too much", "Swinging", "Rounding the spine"],
    recommendedSets: 3,
    recommendedReps: "12-18",
    animationType: "fly",
    caloriesEstimate: 35
  },
  {
    name: "Arnold Press",
    muscleGroup: "Shoulders",
    difficulty: "Advanced",
    equipment: "Dumbbells",
    instructions: [
      "Start with dumbbells in front of shoulders, palms facing you.",
      "Rotate palms outward as you press overhead.",
      "Finish with biceps near ears.",
      "Reverse the rotation while lowering."
    ],
    commonMistakes: ["Going too heavy", "Losing wrist control", "Flaring ribs"],
    recommendedSets: 3,
    recommendedReps: "8-12",
    animationType: "overhead",
    caloriesEstimate: 60
  },
  {
    name: "Dumbbell Curl",
    muscleGroup: "Biceps",
    difficulty: "Beginner",
    equipment: "Dumbbells",
    instructions: [
      "Stand tall with dumbbells by your sides.",
      "Curl weights up without moving elbows forward.",
      "Squeeze biceps at the top.",
      "Lower slowly to full extension."
    ],
    commonMistakes: ["Swinging the hips", "Elbows drifting forward", "Dropping the weights"],
    recommendedSets: 3,
    recommendedReps: "10-12",
    animationType: "curl",
    caloriesEstimate: 35
  },
  {
    name: "Hammer Curl",
    muscleGroup: "Biceps",
    difficulty: "Beginner",
    equipment: "Dumbbells",
    instructions: [
      "Hold dumbbells with palms facing each other.",
      "Curl while keeping wrists neutral.",
      "Pause near shoulder height.",
      "Lower slowly."
    ],
    commonMistakes: ["Turning wrists upward", "Using momentum", "Shortening the bottom range"],
    recommendedSets: 3,
    recommendedReps: "10-14",
    animationType: "curl",
    caloriesEstimate: 35
  },
  {
    name: "Cable Curl",
    muscleGroup: "Biceps",
    difficulty: "Beginner",
    equipment: "Cable machine",
    instructions: [
      "Set the pulley low with a straight or EZ bar.",
      "Keep elbows pinned near your ribs.",
      "Curl the handle toward the chest.",
      "Control the cable back down."
    ],
    commonMistakes: ["Leaning back", "Letting elbows flare", "Using too much weight"],
    recommendedSets: 3,
    recommendedReps: "12-15",
    animationType: "curl",
    caloriesEstimate: 30
  },
  {
    name: "Preacher Curl",
    muscleGroup: "Biceps",
    difficulty: "Intermediate",
    equipment: "Preacher bench, EZ bar",
    instructions: [
      "Rest upper arms on the preacher pad.",
      "Lower the bar until elbows are almost straight.",
      "Curl up without lifting arms from the pad.",
      "Squeeze and repeat."
    ],
    commonMistakes: ["Bouncing at the bottom", "Lifting elbows", "Short reps"],
    recommendedSets: 3,
    recommendedReps: "8-12",
    animationType: "curl",
    caloriesEstimate: 35
  },
  {
    name: "Triceps Pushdown",
    muscleGroup: "Triceps",
    difficulty: "Beginner",
    equipment: "Cable machine, rope or bar",
    instructions: [
      "Set the cable high and hold the attachment.",
      "Pin elbows to your sides.",
      "Extend elbows until arms are straight.",
      "Return with control without moving upper arms."
    ],
    commonMistakes: ["Elbows drifting forward", "Leaning over the stack", "Partial lockout"],
    recommendedSets: 3,
    recommendedReps: "10-15",
    animationType: "pushdown",
    caloriesEstimate: 35
  },
  {
    name: "Dips",
    muscleGroup: "Triceps",
    difficulty: "Advanced",
    equipment: "Parallel bars or assisted dip machine",
    instructions: [
      "Support yourself with arms straight.",
      "Lower until elbows bend deeply.",
      "Keep shoulders controlled and chest proud.",
      "Press back to the top."
    ],
    commonMistakes: ["Shoulders shrugging", "Dropping too deep too fast", "Half reps"],
    recommendedSets: 3,
    recommendedReps: "6-12",
    animationType: "dip",
    caloriesEstimate: 60
  },
  {
    name: "Overhead Triceps Extension",
    muscleGroup: "Triceps",
    difficulty: "Intermediate",
    equipment: "Dumbbell or cable",
    instructions: [
      "Hold the weight overhead with elbows pointing forward.",
      "Lower behind the head by bending elbows.",
      "Keep upper arms mostly still.",
      "Extend back overhead."
    ],
    commonMistakes: ["Elbows flaring wide", "Arching the back", "Cutting the stretch short"],
    recommendedSets: 3,
    recommendedReps: "10-14",
    animationType: "overhead",
    caloriesEstimate: 40
  },
  {
    name: "Skull Crusher",
    muscleGroup: "Triceps",
    difficulty: "Intermediate",
    equipment: "EZ bar or dumbbells",
    instructions: [
      "Lie on a bench with weight above shoulders.",
      "Bend elbows and lower weight toward forehead.",
      "Keep upper arms angled steady.",
      "Extend elbows to return."
    ],
    commonMistakes: ["Moving shoulders too much", "Flaring elbows", "Lowering too fast"],
    recommendedSets: 3,
    recommendedReps: "8-12",
    animationType: "pushdown",
    caloriesEstimate: 40
  },
  {
    name: "Plank",
    muscleGroup: "Abs",
    difficulty: "Beginner",
    equipment: "Bodyweight",
    instructions: [
      "Set elbows under shoulders.",
      "Keep body straight from head to heels.",
      "Brace abs and squeeze glutes.",
      "Hold for the target time."
    ],
    commonMistakes: ["Hips sagging", "Holding breath", "Head dropping"],
    recommendedSets: 3,
    recommendedReps: "30-60 seconds",
    animationType: "brace",
    caloriesEstimate: 30
  },
  {
    name: "Crunches",
    muscleGroup: "Abs",
    difficulty: "Beginner",
    equipment: "Bodyweight or mat",
    instructions: [
      "Lie on your back with knees bent.",
      "Curl ribs toward hips.",
      "Pause briefly at the top.",
      "Lower shoulders back to the mat."
    ],
    commonMistakes: ["Pulling the neck", "Using momentum", "Flattening reps into sit-ups"],
    recommendedSets: 3,
    recommendedReps: "15-25",
    animationType: "crunch",
    caloriesEstimate: 35
  },
  {
    name: "Hanging Leg Raises",
    muscleGroup: "Abs",
    difficulty: "Advanced",
    equipment: "Pull-up bar or captain's chair",
    instructions: [
      "Hang with shoulders active.",
      "Lift legs while curling pelvis upward.",
      "Pause without swinging.",
      "Lower slowly to a dead stop."
    ],
    commonMistakes: ["Swinging", "Only using hip flexors", "Dropping legs fast"],
    recommendedSets: 3,
    recommendedReps: "8-15",
    animationType: "raise",
    caloriesEstimate: 50
  },
  {
    name: "Russian Twists",
    muscleGroup: "Abs",
    difficulty: "Intermediate",
    equipment: "Bodyweight, plate, or medicine ball",
    instructions: [
      "Sit with torso leaned back and core braced.",
      "Rotate ribs side to side.",
      "Tap the floor lightly beside each hip.",
      "Keep movement controlled."
    ],
    commonMistakes: ["Only moving the arms", "Rounding the back", "Racing through reps"],
    recommendedSets: 3,
    recommendedReps: "20-30 total",
    animationType: "twist",
    caloriesEstimate: 40
  },
  {
    name: "Treadmill Intervals",
    muscleGroup: "Cardio",
    difficulty: "Intermediate",
    equipment: "Treadmill",
    instructions: [
      "Warm up for five minutes.",
      "Alternate hard running with easy recovery.",
      "Keep posture tall and cadence quick.",
      "Cool down before stopping."
    ],
    commonMistakes: ["Skipping warm-up", "Starting too fast", "Holding the rails"],
    recommendedSets: 8,
    recommendedReps: "30 sec hard / 60 sec easy",
    animationType: "run",
    caloriesEstimate: 180
  },
  {
    name: "Rowing Machine",
    muscleGroup: "Cardio",
    difficulty: "Beginner",
    equipment: "Rower",
    instructions: [
      "Push with legs first.",
      "Open the hips after the leg drive.",
      "Pull handle toward lower ribs.",
      "Recover arms, body, then legs."
    ],
    commonMistakes: ["Pulling with arms first", "Rounding the back", "Rushing the recovery"],
    recommendedSets: 1,
    recommendedReps: "10-20 minutes",
    animationType: "row",
    caloriesEstimate: 160
  },
  {
    name: "Battle Ropes",
    muscleGroup: "Cardio",
    difficulty: "Intermediate",
    equipment: "Battle ropes",
    instructions: [
      "Set an athletic stance with knees bent.",
      "Brace the core and keep chest tall.",
      "Drive alternating waves through the ropes.",
      "Maintain pace for the interval."
    ],
    commonMistakes: ["Standing upright", "Only using arms", "Letting waves die early"],
    recommendedSets: 6,
    recommendedReps: "20-30 seconds",
    animationType: "wave",
    caloriesEstimate: 120
  },
  {
    name: "Burpees",
    muscleGroup: "Full Body",
    difficulty: "Intermediate",
    equipment: "Bodyweight",
    instructions: [
      "Drop hands to the floor.",
      "Jump or step feet back to plank.",
      "Return feet under hips.",
      "Stand or jump tall."
    ],
    commonMistakes: ["Sagging in plank", "Landing stiff-legged", "Losing breathing rhythm"],
    recommendedSets: 4,
    recommendedReps: "8-15",
    animationType: "burpee",
    caloriesEstimate: 110
  },
  {
    name: "Kettlebell Swing",
    muscleGroup: "Full Body",
    difficulty: "Intermediate",
    equipment: "Kettlebell",
    instructions: [
      "Hike the kettlebell between the legs.",
      "Snap hips forward powerfully.",
      "Let the bell float to chest height.",
      "Guide it back into the next hinge."
    ],
    commonMistakes: ["Squatting the swing", "Lifting with shoulders", "Overextending the lower back"],
    recommendedSets: 4,
    recommendedReps: "12-20",
    animationType: "hinge",
    caloriesEstimate: 120
  },
  {
    name: "Clean and Press",
    muscleGroup: "Full Body",
    difficulty: "Advanced",
    equipment: "Barbell or dumbbells",
    instructions: [
      "Pull the weight from the floor with a strong leg drive.",
      "Catch it at the shoulders.",
      "Brace and press overhead.",
      "Lower safely back to the start."
    ],
    commonMistakes: ["Muscling the clean", "Loose core overhead", "Poor catch position"],
    recommendedSets: 4,
    recommendedReps: "3-6",
    animationType: "overhead",
    caloriesEstimate: 130
  },
  {
    name: "Medicine Ball Slams",
    muscleGroup: "Full Body",
    difficulty: "Beginner",
    equipment: "Medicine ball",
    instructions: [
      "Raise the ball overhead.",
      "Brace and slam it to the floor.",
      "Squat to retrieve the ball.",
      "Repeat with full-body rhythm."
    ],
    commonMistakes: ["Only using arms", "Rounding to pick up", "Throwing without control"],
    recommendedSets: 4,
    recommendedReps: "10-15",
    animationType: "slam",
    caloriesEstimate: 95
  },
  {
    name: "Deadlift",
    muscleGroup: "Legs",
    difficulty: "Advanced",
    equipment: "Barbell",
    instructions: [
      "Stand with the bar over midfoot.",
      "Hinge down and grip the bar just outside your legs.",
      "Brace hard and push the floor away.",
      "Lock out with hips through, then lower under control."
    ],
    commonMistakes: ["Rounding the lower back", "Yanking the bar off the floor", "Letting the bar drift forward"],
    recommendedSets: 4,
    recommendedReps: "3-6",
    animationType: "hinge",
    animationMediaType: "video",
    animationSrc: "/exercise-media/legs/deadlift.mp4",
    caloriesEstimate: 110
  },
  {
    name: "Running Time",
    muscleGroup: "Cardio",
    difficulty: "Beginner",
    equipment: "Track, treadmill, or road",
    instructions: [
      "Warm up for five minutes.",
      "Run the selected distance at a controlled hard pace.",
      "Keep shoulders relaxed and cadence steady.",
      "Record your best time in minutes."
    ],
    commonMistakes: ["Starting too fast", "Skipping warm-up", "Holding the treadmill rails"],
    recommendedSets: 1,
    recommendedReps: "Best time",
    animationType: "run",
    animationMediaType: "video",
    animationSrc: "/exercise-media/cardio/running-time.mp4",
    caloriesEstimate: 220
  }
];

const challenges = [
  ["Most workouts this week", "Whoever logs the most workouts this week leads the weekly fight.", 150, "weekly_workouts", 1, null],
  ["Most points this week", "The weekly points king owns bragging rights.", 150, "weekly_points", 1, null],
  ["Most chest sessions", "Chest volume decides this mini-rivalry.", 150, "weekly_chest", 1, "Chest"],
  ["Most cardio sessions", "Cardio sessions count toward this weekly race.", 150, "weekly_cardio", 1, "Cardio"],
  ["No skipped day challenge", "Check in every day this week so far.", 150, "weekly_no_skip", 1, null]
];

export function getDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export function closeDatabase() {
  db?.close();
  db = undefined;
}

export function resetDatabase() {
  closeDatabase();

  if (fs.existsSync(DB_PATH)) {
    fs.rmSync(DB_PATH);
  }
}

export function initializeDatabase() {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      avatar TEXT NOT NULL,
      weight_goal TEXT NOT NULL,
      favorite_muscle_group TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'trial',
      subscription_status TEXT NOT NULL DEFAULT 'trialing',
      trial_ends_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      organization_id INTEGER NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      emailed_at TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'not_sent',
      delivery_error TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS beta_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER,
      user_id INTEGER,
      event_name TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      total_points INTEGER NOT NULL DEFAULT 0,
      weekly_points INTEGER NOT NULL DEFAULT 0,
      workouts_completed INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      equipment TEXT NOT NULL,
      instructions TEXT NOT NULL,
      common_mistakes TEXT NOT NULL,
      recommended_sets INTEGER NOT NULL,
      recommended_reps TEXT NOT NULL,
      animation_type TEXT NOT NULL,
      animation_asset_key TEXT NOT NULL DEFAULT '',
      animation_media_type TEXT,
      animation_src TEXT,
      animation_credit TEXT,
      calories_estimate INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      workout_date TEXT NOT NULL,
      notes TEXT,
      total_points INTEGER NOT NULL,
      total_calories INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 75,
      source TEXT NOT NULL DEFAULT 'daily_button',
      created_at TEXT NOT NULL,
      UNIQUE (user_id, checkin_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sets TEXT NOT NULL,
      notes TEXT,
      completed_sets INTEGER NOT NULL,
      personal_record INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      sets TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      achieved_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points INTEGER NOT NULL,
      metric TEXT NOT NULL,
      target INTEGER NOT NULL,
      muscle_group TEXT
    );

    CREATE TABLE IF NOT EXISTS user_challenges (
      user_id INTEGER NOT NULL,
      challenge_id INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, challenge_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date);
    CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);
    CREATE INDEX IF NOT EXISTS idx_user_accounts_org ON user_accounts(organization_id);
    CREATE INDEX IF NOT EXISTS idx_invites_org ON invites(organization_id);
    CREATE INDEX IF NOT EXISTS idx_beta_events_org_date ON beta_events(organization_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template ON workout_template_exercises(template_id, position);
  `);

  ensureExerciseMediaColumns(database);
  ensureSellableColumns(database);
  cleanupDuplicateCatalogRows(database);
}

function getColumnNames(database: DatabaseSync, tableName: string) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return new Set(columns.map((column) => column.name));
}

function ensureColumn(database: DatabaseSync, tableName: string, columnName: string, definition: string) {
  const columnNames = getColumnNames(database, tableName);

  if (!columnNames.has(columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

function ensureSellableColumns(database: DatabaseSync) {
  ensureColumn(database, "organizations", "stripe_customer_id", "TEXT");
  ensureColumn(database, "organizations", "stripe_subscription_id", "TEXT");
  ensureColumn(database, "organizations", "checkout_session_id", "TEXT");
  ensureColumn(database, "invites", "emailed_at", "TEXT");
  ensureColumn(database, "invites", "delivery_status", "TEXT NOT NULL DEFAULT 'not_sent'");
  ensureColumn(database, "invites", "delivery_error", "TEXT");
}

function ensureExerciseMediaColumns(database: DatabaseSync) {
  const columnNames = getColumnNames(database, "exercises");

  if (!columnNames.has("animation_asset_key")) {
    database.exec("ALTER TABLE exercises ADD COLUMN animation_asset_key TEXT NOT NULL DEFAULT '';");
  }

  if (!columnNames.has("animation_media_type")) {
    database.exec("ALTER TABLE exercises ADD COLUMN animation_media_type TEXT;");
  }

  if (!columnNames.has("animation_src")) {
    database.exec("ALTER TABLE exercises ADD COLUMN animation_src TEXT;");
  }

  if (!columnNames.has("animation_credit")) {
    database.exec("ALTER TABLE exercises ADD COLUMN animation_credit TEXT;");
  }
}

function placeholders(values: unknown[]) {
  return values.map(() => "?").join(",");
}

function cleanupDuplicateCatalogRows(database: DatabaseSync) {
  const exerciseRows = database.prepare("SELECT id, name FROM exercises ORDER BY id").all() as Array<{ id: number; name: string }>;
  const exerciseIdsByName = new Map<string, number[]>();

  for (const row of exerciseRows) {
    exerciseIdsByName.set(row.name, [...(exerciseIdsByName.get(row.name) ?? []), Number(row.id)]);
  }

  for (const ids of exerciseIdsByName.values()) {
    if (ids.length <= 1) {
      continue;
    }

    const referenceRows = database
      .prepare(
        `SELECT id,
                (SELECT COUNT(*) FROM workout_exercises WHERE exercise_id = exercises.id) +
                (SELECT COUNT(*) FROM personal_records WHERE exercise_id = exercises.id) +
                (SELECT COUNT(*) FROM workout_template_exercises WHERE exercise_id = exercises.id) AS referencesCount
         FROM exercises
         WHERE id IN (${placeholders(ids)})
         ORDER BY referencesCount DESC, id ASC`
      )
      .all(...ids) as Array<{ id: number; referencesCount: number }>;
    const keepId = Number(referenceRows[0]?.id ?? ids[0]);
    const duplicateIds = ids.filter((id) => id !== keepId);

    if (duplicateIds.length === 0) {
      continue;
    }

    database.prepare(`UPDATE workout_exercises SET exercise_id = ? WHERE exercise_id IN (${placeholders(duplicateIds)})`).run(keepId, ...duplicateIds);
    database.prepare(`UPDATE personal_records SET exercise_id = ? WHERE exercise_id IN (${placeholders(duplicateIds)})`).run(keepId, ...duplicateIds);
    database.prepare(`UPDATE workout_template_exercises SET exercise_id = ? WHERE exercise_id IN (${placeholders(duplicateIds)})`).run(keepId, ...duplicateIds);
    database.prepare(`DELETE FROM exercises WHERE id IN (${placeholders(duplicateIds)})`).run(...duplicateIds);
  }

  const challengeRows = database.prepare("SELECT id, title FROM challenges ORDER BY id").all() as Array<{ id: number; title: string }>;
  const challengeIdsByTitle = new Map<string, number[]>();

  for (const row of challengeRows) {
    challengeIdsByTitle.set(row.title, [...(challengeIdsByTitle.get(row.title) ?? []), Number(row.id)]);
  }

  for (const ids of challengeIdsByTitle.values()) {
    if (ids.length <= 1) {
      continue;
    }

    const keepId = ids[0];
    const duplicateIds = ids.slice(1);
    database.prepare(`DELETE FROM user_challenges WHERE challenge_id IN (${placeholders(duplicateIds)})`).run(...duplicateIds);
    database.prepare(`DELETE FROM challenges WHERE id IN (${placeholders(duplicateIds)})`).run(...duplicateIds);
    database.prepare("UPDATE user_challenges SET challenge_id = ? WHERE challenge_id = ?").run(keepId, keepId);
  }

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_name_unique ON exercises(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_title_unique ON challenges(title);
  `);
}

function createAnimationAssetKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function exerciseMediaSrc(exercise: ExerciseSeed) {
  const group = exercise.muscleGroup.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `/exercise-media/${group}/${createAnimationAssetKey(exercise.name)}-guide.png`;
}

function syncExerciseAnimationMetadata(database: DatabaseSync) {
  const update = database.prepare(
    `UPDATE exercises
     SET animation_asset_key = CASE
           WHEN animation_asset_key IS NULL OR animation_asset_key = '' THEN ?
           ELSE animation_asset_key
         END,
         animation_media_type = 'image',
         animation_src = ?
     WHERE name = ?`
  );

  for (const exercise of exercises) {
    update.run(createAnimationAssetKey(exercise.name), exercise.animationSrc ?? exerciseMediaSrc(exercise), exercise.name);
  }
}

function syncExerciseCatalog(database: DatabaseSync) {
  const insertExercise = database.prepare(`
    INSERT OR IGNORE INTO exercises (
      name, muscle_group, difficulty, equipment, instructions, common_mistakes,
      recommended_sets, recommended_reps, animation_type, animation_asset_key,
      animation_media_type, animation_src, animation_credit, calories_estimate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const exercise of exercises) {
    insertExercise.run(
      exercise.name,
      exercise.muscleGroup,
      exercise.difficulty,
      exercise.equipment,
      JSON.stringify(exercise.instructions),
      JSON.stringify(exercise.commonMistakes),
      exercise.recommendedSets,
      exercise.recommendedReps,
      exercise.animationType,
      createAnimationAssetKey(exercise.name),
      exercise.animationMediaType ?? "image",
      exercise.animationSrc ?? exerciseMediaSrc(exercise),
      exercise.animationCredit ?? null,
      exercise.caloriesEstimate
    );
  }

  syncExerciseAnimationMetadata(database);
}

function syncBadges(database: DatabaseSync) {
  const insertBadge = database.prepare("INSERT OR IGNORE INTO badges (title, description, icon) VALUES (?, ?, ?)");

  for (const [title, description, icon] of badges) {
    insertBadge.run(title, description, icon);
  }
}

function syncChallenges(database: DatabaseSync) {
  const insertChallenge = database.prepare(
    "INSERT OR IGNORE INTO challenges (title, description, points, metric, target, muscle_group) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const [title, description, points, metric, target, muscleGroup] of challenges) {
    insertChallenge.run(title, description, points, metric, target, muscleGroup);
  }
}

function syncUsers(database: DatabaseSync) {
  const upsertUser = database.prepare(
    `INSERT INTO users (id, username, avatar, weight_goal, favorite_muscle_group)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       weight_goal = excluded.weight_goal,
       favorite_muscle_group = excluded.favorite_muscle_group,
       avatar = CASE
         WHEN users.avatar = '' OR users.avatar = 'F' OR users.avatar = users.username THEN excluded.avatar
         ELSE users.avatar
       END`
  );
  const insertStats = database.prepare(
    "INSERT OR IGNORE INTO user_stats (user_id, total_points, weekly_points, workouts_completed, current_streak) VALUES (?, ?, ?, ?, ?)"
  );
  const insertUserChallenge = database.prepare(
    "INSERT OR IGNORE INTO user_challenges (user_id, challenge_id, progress, completed) VALUES (?, ?, ?, ?)"
  );
  const challengeRows = database.prepare("SELECT id, target FROM challenges ORDER BY id").all() as Array<{ id: number; target: number }>;

  for (const user of users) {
    upsertUser.run(user.id, user.username, user.avatar, user.weightGoal, user.favoriteMuscleGroup);
  }

  insertStats.run(1, 920, 280, 12, 4);
  insertStats.run(2, 860, 330, 11, 3);
  insertStats.run(3, 720, 210, 9, 2);

  for (const user of users) {
    const baseProgress =
      user.id === 1 ? [3, 1, 68, 720, 2] : user.id === 2 ? [4, 2, 84, 860, 1] : [2, 1, 45, 520, 1];

    for (const [index, challenge] of challengeRows.entries()) {
      const progress = baseProgress[index] ?? 0;
      insertUserChallenge.run(user.id, challenge.id, progress, progress >= Number(challenge.target) ? 1 : 0);
    }
  }
}

function syncDefaultTemplates(database: DatabaseSync) {
  const existingCount = database.prepare("SELECT COUNT(*) AS count FROM workout_templates").get() as { count: number };

  if (Number(existingCount.count) > 0) {
    return;
  }

  const exerciseRows = database.prepare("SELECT id, name, recommended_sets AS recommendedSets, recommended_reps AS recommendedReps FROM exercises").all() as Array<{
    id: number;
    name: string;
    recommendedSets: number;
    recommendedReps: string;
  }>;
  const exerciseByName = new Map(exerciseRows.map((exercise) => [exercise.name, exercise]));
  const now = new Date().toISOString();
  const templates = [
    { userId: 1, name: "Chest Day", exercises: ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Push-ups"] },
    { userId: 1, name: "Core Focus", exercises: ["Plank", "Crunches", "Hanging Leg Raises"] },
    { userId: 2, name: "Leg Strength", exercises: ["Back Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"] },
    { userId: 2, name: "Cardio Engine", exercises: ["Treadmill Intervals", "Rowing Machine", "Battle Ropes"] },
    { userId: 3, name: "Pull Day", exercises: ["Pull-ups", "Lat Pulldown", "Barbell Row", "Dumbbell Curl"] },
    { userId: 3, name: "Full Body Power", exercises: ["Deadlift", "Clean and Press", "Kettlebell Swing", "Medicine Ball Slams"] }
  ];
  const insertTemplate = database.prepare("INSERT INTO workout_templates (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)");
  const insertExercise = database.prepare(
    "INSERT INTO workout_template_exercises (template_id, exercise_id, position, sets, notes) VALUES (?, ?, ?, ?, ?)"
  );

  for (const template of templates) {
    const templateResult = insertTemplate.run(template.userId, template.name, now, now);
    const templateId = Number(templateResult.lastInsertRowid);

    template.exercises.forEach((exerciseName, index) => {
      const exercise = exerciseByName.get(exerciseName);

      if (!exercise) {
        return;
      }

      const repsMatch = exercise.recommendedReps.match(/\d+/);
      const reps = repsMatch ? Number(repsMatch[0]) : 10;
      const sets = Array.from({ length: Math.min(Math.max(Number(exercise.recommendedSets), 1), 5) }, () => ({
        weight: 0,
        reps,
        completed: false
      }));

      insertExercise.run(templateId, exercise.id, index + 1, JSON.stringify(sets), "");
    });
  }
}

export function seedDatabase() {
  const database = getDatabase();
  const userCount = database.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };

  if (userCount.count > 0) {
    syncExerciseCatalog(database);
    syncBadges(database);
    syncChallenges(database);
    syncUsers(database);
    syncDefaultTemplates(database);
    return;
  }

  const insertUser = database.prepare(
    "INSERT INTO users (id, username, avatar, weight_goal, favorite_muscle_group) VALUES (?, ?, ?, ?, ?)"
  );
  const insertStats = database.prepare(
    "INSERT INTO user_stats (user_id, total_points, weekly_points, workouts_completed, current_streak) VALUES (?, ?, ?, ?, ?)"
  );
  const insertExercise = database.prepare(`
    INSERT INTO exercises (
      name, muscle_group, difficulty, equipment, instructions, common_mistakes,
      recommended_sets, recommended_reps, animation_type, animation_asset_key,
      animation_media_type, animation_src, animation_credit, calories_estimate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBadge = database.prepare("INSERT INTO badges (title, description, icon) VALUES (?, ?, ?)");
  const insertChallenge = database.prepare(
    "INSERT INTO challenges (title, description, points, metric, target, muscle_group) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertUserChallenge = database.prepare(
    "INSERT INTO user_challenges (user_id, challenge_id, progress, completed) VALUES (?, ?, ?, ?)"
  );
  const insertUserBadge = database.prepare(
    "INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)"
  );
  const insertWorkout = database.prepare(
    "INSERT INTO workouts (user_id, workout_date, notes, total_points, total_calories) VALUES (?, ?, ?, ?, ?)"
  );
  const insertDailyCheckin = database.prepare(
    "INSERT INTO daily_checkins (user_id, checkin_date, points, source, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertWorkoutExercise = database.prepare(
    "INSERT INTO workout_exercises (workout_id, exercise_id, sets, notes, completed_sets, personal_record) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertRecord = database.prepare(
    "INSERT INTO personal_records (user_id, exercise_id, weight, reps, achieved_at) VALUES (?, ?, ?, ?, ?)"
  );

  database.exec("BEGIN TRANSACTION;");

  try {
    for (const user of users) {
      insertUser.run(user.id, user.username, user.avatar, user.weightGoal, user.favoriteMuscleGroup);
    }

    insertStats.run(1, 920, 280, 12, 4);
    insertStats.run(2, 860, 330, 11, 3);
    insertStats.run(3, 720, 210, 9, 2);

    const checkinOffsets =
      [
        [1, [-4, -3, -2, -1]],
        [2, [-3, -2, -1]],
        [3, [-2, -1]]
      ] as const;

    for (const [userId, offsets] of checkinOffsets) {
      for (const offset of offsets) {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const day = date.toISOString().slice(0, 10);
        insertDailyCheckin.run(userId, day, 75, "seed", `${day}T10:00:00.000Z`);
      }
    }

    for (const exercise of exercises) {
      insertExercise.run(
        exercise.name,
        exercise.muscleGroup,
        exercise.difficulty,
        exercise.equipment,
        JSON.stringify(exercise.instructions),
        JSON.stringify(exercise.commonMistakes),
        exercise.recommendedSets,
        exercise.recommendedReps,
        exercise.animationType,
        createAnimationAssetKey(exercise.name),
        exercise.animationMediaType ?? "image",
        exercise.animationSrc ?? exerciseMediaSrc(exercise),
        exercise.animationCredit ?? null,
        exercise.caloriesEstimate
      );
    }

    for (const [title, description, icon] of badges) {
      insertBadge.run(title, description, icon);
    }

    for (const [title, description, points, metric, target, muscleGroup] of challenges) {
      insertChallenge.run(title, description, points, metric, target, muscleGroup);
    }

    for (const user of users) {
      for (let challengeId = 1; challengeId <= challenges.length; challengeId += 1) {
        const baseProgress =
          user.id === 1 ? [3, 1, 68, 720, 2] : user.id === 2 ? [4, 2, 84, 860, 1] : [2, 1, 45, 520, 1];
        const progress = baseProgress[challengeId - 1];
        insertUserChallenge.run(user.id, challengeId, progress, progress >= Number(challenges[challengeId - 1][4]) ? 1 : 0);
      }
    }

    const earnedAt = new Date().toISOString();
    insertUserBadge.run(1, 1, earnedAt);
    insertUserBadge.run(1, 4, earnedAt);
    insertUserBadge.run(2, 1, earnedAt);
    insertUserBadge.run(2, 5, earnedAt);
    insertUserBadge.run(3, 1, earnedAt);

    const sampleWorkouts = [
      {
        userId: 1,
        dateOffset: -5,
        notes: "Heavy chest day felt solid.",
        points: 120,
        calories: 205,
        entries: [
          { exerciseId: 6, sets: [{ weight: 80, reps: 6, completed: true }, { weight: 82.5, reps: 5, completed: true }], pr: true },
          { exerciseId: 7, sets: [{ weight: 0, reps: 24, completed: true }, { weight: 0, reps: 18, completed: true }], pr: false },
          { exerciseId: 8, sets: [{ weight: 28, reps: 10, completed: true }, { weight: 28, reps: 9, completed: true }], pr: false }
        ]
      },
      {
        userId: 1,
        dateOffset: -2,
        notes: "Core and intervals.",
        points: 90,
        calories: 260,
        entries: [
          { exerciseId: 29, sets: [{ weight: 0, reps: 60, completed: true }, { weight: 0, reps: 45, completed: true }], pr: false },
          { exerciseId: 33, sets: [{ weight: 0, reps: 8, completed: true }], pr: false }
        ]
      },
      {
        userId: 2,
        dateOffset: -4,
        notes: "Leg session with good pace.",
        points: 110,
        calories: 245,
        entries: [
          { exerciseId: 1, sets: [{ weight: 105, reps: 5, completed: true }, { weight: 100, reps: 6, completed: true }], pr: true },
          { exerciseId: 3, sets: [{ weight: 20, reps: 12, completed: true }, { weight: 20, reps: 12, completed: true }], pr: false }
        ]
      },
      {
        userId: 2,
        dateOffset: -1,
        notes: "Back volume plus curls.",
        points: 100,
        calories: 190,
        entries: [
          { exerciseId: 11, sets: [{ weight: 0, reps: 8, completed: true }, { weight: 0, reps: 6, completed: true }], pr: false },
          { exerciseId: 13, sets: [{ weight: 70, reps: 8, completed: true }, { weight: 70, reps: 8, completed: true }], pr: false },
          { exerciseId: 20, sets: [{ weight: 18, reps: 12, completed: true }], pr: false }
        ]
      },
      {
        userId: 3,
        dateOffset: -3,
        notes: "Pull day with clean reps.",
        points: 105,
        calories: 215,
        entries: [
          { exerciseId: 11, sets: [{ weight: 0, reps: 7, completed: true }, { weight: 0, reps: 6, completed: true }], pr: true },
          { exerciseId: 14, sets: [{ weight: 62.5, reps: 10, completed: true }, { weight: 62.5, reps: 9, completed: true }], pr: false }
        ]
      }
    ];

    for (const workout of sampleWorkouts) {
      const date = new Date();
      date.setDate(date.getDate() + workout.dateOffset);
      const workoutResult = insertWorkout.run(
        workout.userId,
        date.toISOString(),
        workout.notes,
        workout.points,
        workout.calories
      );
      const workoutId = Number(workoutResult.lastInsertRowid);

      for (const entry of workout.entries) {
        insertWorkoutExercise.run(
          workoutId,
          entry.exerciseId,
          JSON.stringify(entry.sets),
          "",
          entry.sets.filter((set) => set.completed).length,
          entry.pr ? 1 : 0
        );

        if (entry.pr) {
          const topSet = entry.sets.reduce((best, set) => (set.weight > best.weight ? set : best), entry.sets[0]);
          insertRecord.run(workout.userId, entry.exerciseId, topSet.weight, topSet.reps, date.toISOString());
        }
      }
    }

    syncDefaultTemplates(database);

    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

export function getRanks() {
  return ranks;
}

export function getCategories() {
  return categories;
}
