import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCategories,
  getDatabase,
  getRanks,
  initializeDatabase,
  seedDatabase
} from "./db.js";

type Row = Record<string, unknown>;
type SetEntry = {
  weight: number;
  reps: number;
  completed: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT ?? 4000);

initializeDatabase();
seedDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const db = getDatabase();

function jsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapExercise(row: Row) {
  return {
    id: Number(row.id),
    name: String(row.name),
    muscleGroup: String(row.muscleGroup),
    difficulty: String(row.difficulty),
    equipment: String(row.equipment),
    instructions: jsonParse<string[]>(row.instructions, []),
    commonMistakes: jsonParse<string[]>(row.commonMistakes, []),
    recommendedSets: Number(row.recommendedSets),
    recommendedReps: String(row.recommendedReps),
    animationType: String(row.animationType),
    animationAssetKey: String(row.animationAssetKey ?? ""),
    animationMediaType: row.animationMediaType ? String(row.animationMediaType) : null,
    animationSrc: row.animationSrc ? String(row.animationSrc) : null,
    animationCredit: row.animationCredit ? String(row.animationCredit) : null,
    caloriesEstimate: Number(row.caloriesEstimate)
  };
}

type ExerciseRecord = ReturnType<typeof mapExercise>;
type NormalizedWorkoutEntry = {
  exercise: ExerciseRecord;
  sets: SetEntry[];
  notes: string;
  personalRecord: boolean;
  completedSets: number;
  recordSet: SetEntry | null;
};

function mapUser(row: Row) {
  return {
    id: Number(row.id),
    username: String(row.username),
    avatar: String(row.avatar),
    weightGoal: String(row.weightGoal),
    favoriteMuscleGroup: String(row.favoriteMuscleGroup)
  };
}

function getRank(totalPoints: number) {
  const ranks = getRanks();
  const rank = ranks.find((item) => totalPoints >= item.minPoints && totalPoints <= item.maxPoints) ?? ranks[0];
  const nextRank = ranks.find((item) => item.minPoints > totalPoints);
  const range = rank.maxPoints - rank.minPoints + 1;
  const progress = rank.name === "Legend" ? 100 : Math.min(100, Math.round(((totalPoints - rank.minPoints) / range) * 100));

  return {
    ...rank,
    progress,
    nextRank: nextRank?.name ?? "Max Rank",
    pointsToNext: nextRank ? Math.max(0, nextRank.minPoints - totalPoints) : 0
  };
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function getUserById(userId: number) {
  const user = db
    .prepare(
      `SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup
       FROM users WHERE id = ?`
    )
    .get(userId) as Row | undefined;

  return user ? mapUser(user) : undefined;
}

function getStatsByUserId(userId: number) {
  return db
    .prepare(
      `SELECT user_id AS userId, total_points AS totalPoints, weekly_points AS weeklyPoints,
              workouts_completed AS workoutsCompleted, current_streak AS currentStreak
       FROM user_stats WHERE user_id = ?`
    )
    .get(userId) as
    | {
        userId: number;
        totalPoints: number;
        weeklyPoints: number;
        workoutsCompleted: number;
        currentStreak: number;
      }
    | undefined;
}

function getExerciseById(exerciseId: number) {
  const row = db
    .prepare(
      `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
              common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
              recommended_reps AS recommendedReps, animation_type AS animationType,
              animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
              animation_src AS animationSrc, animation_credit AS animationCredit,
              calories_estimate AS caloriesEstimate
       FROM exercises WHERE id = ?`
    )
    .get(exerciseId) as Row | undefined;

  return row ? mapExercise(row) : undefined;
}

function calculateCurrentStreak(userId: number) {
  const rows = db
    .prepare("SELECT DISTINCT substr(workout_date, 1, 10) AS day FROM workouts WHERE user_id = ? ORDER BY day DESC")
    .all(userId) as { day: string }[];

  if (rows.length === 0) {
    return 0;
  }

  let expected = new Date();
  expected.setHours(0, 0, 0, 0);
  const newest = new Date(`${rows[0].day}T00:00:00.000Z`);
  const todayKey = dateKey(expected);
  const yesterday = new Date(expected);
  yesterday.setDate(yesterday.getDate() - 1);

  if (rows[0].day !== todayKey && rows[0].day !== dateKey(yesterday)) {
    return 0;
  }

  let streak = 0;
  expected = new Date(`${rows[0].day}T00:00:00.000Z`);

  for (const row of rows) {
    if (row.day !== dateKey(expected)) {
      break;
    }

    streak += 1;
    expected.setDate(expected.getDate() - 1);
  }

  return streak;
}

function getWeeklyProgress(userId: number) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));

    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: dateKey(day),
      workouts: 0,
      points: 0,
      calories: 0
    };
  });

  const rows = db
    .prepare(
      `SELECT substr(workout_date, 1, 10) AS date, COUNT(*) AS workouts,
              SUM(total_points) AS points, SUM(total_calories) AS calories
       FROM workouts
       WHERE user_id = ? AND workout_date >= ?
       GROUP BY substr(workout_date, 1, 10)`
    )
    .all(userId, `${days[0].date}T00:00:00.000Z`) as Row[];

  for (const row of rows) {
    const target = days.find((item) => item.date === row.date);
    if (target) {
      target.workouts = Number(row.workouts ?? 0);
      target.points = Number(row.points ?? 0);
      target.calories = Number(row.calories ?? 0);
    }
  }

  return days;
}

function getWorkoutHistory(userId: number, limit = 12) {
  const workouts = db
    .prepare(
      `SELECT id, workout_date AS workoutDate, notes, total_points AS totalPoints,
              total_calories AS totalCalories
       FROM workouts
       WHERE user_id = ?
       ORDER BY workout_date DESC
       LIMIT ?`
    )
    .all(userId, limit) as Row[];

  const entriesStatement = db.prepare(
    `SELECT we.id, we.workout_id AS workoutId, we.exercise_id AS exerciseId, we.sets,
            we.notes, we.completed_sets AS completedSets, we.personal_record AS personalRecord,
            e.name, e.muscle_group AS muscleGroup
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?`
  );

  return workouts.map((workout) => ({
    id: Number(workout.id),
    workoutDate: String(workout.workoutDate),
    notes: String(workout.notes ?? ""),
    totalPoints: Number(workout.totalPoints),
    totalCalories: Number(workout.totalCalories),
    exercises: (entriesStatement.all(Number(workout.id)) as Row[]).map((entry) => ({
      id: Number(entry.id),
      exerciseId: Number(entry.exerciseId),
      name: String(entry.name),
      muscleGroup: String(entry.muscleGroup),
      sets: jsonParse<SetEntry[]>(entry.sets, []),
      notes: String(entry.notes ?? ""),
      completedSets: Number(entry.completedSets),
      personalRecord: Boolean(entry.personalRecord)
    }))
  }));
}

function awardBadge(userId: number, title: string) {
  const badge = db.prepare("SELECT id FROM badges WHERE title = ?").get(title) as { id: number } | undefined;

  if (!badge) {
    return;
  }

  db.prepare("INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)").run(
    userId,
    badge.id,
    new Date().toISOString()
  );
}

function getGroupWorkoutCount(userId: number, group: string) {
  const result = db
    .prepare(
      `SELECT COUNT(DISTINCT w.id) AS count
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ? AND e.muscle_group = ?`
    )
    .get(userId, group) as { count: number };

  return Number(result.count ?? 0);
}

function refreshBadges(userId: number) {
  const stats = getStatsByUserId(userId);

  if (!stats) {
    return;
  }

  if (stats.workoutsCompleted >= 1) awardBadge(userId, "First Workout");
  if (getGroupWorkoutCount(userId, "Legs") >= 2) awardBadge(userId, "Leg Beast");
  if (getGroupWorkoutCount(userId, "Chest") >= 2) awardBadge(userId, "Chest Warrior");
  if (getGroupWorkoutCount(userId, "Back") >= 2) awardBadge(userId, "Back Monster");
  if (getGroupWorkoutCount(userId, "Abs") >= 3) awardBadge(userId, "Abs Machine");
  if (stats.currentStreak >= 5) awardBadge(userId, "5-Day Streak");
  if (
    (db.prepare("SELECT COUNT(*) AS count FROM personal_records WHERE user_id = ?").get(userId) as { count: number })
      .count > 0
  ) {
    awardBadge(userId, "Personal Record King");
  }

  const weeklyWorkouts = getChallengeProgress(userId, "workouts");
  if (weeklyWorkouts >= 4) awardBadge(userId, "Consistency Master");
}

function getChallengeProgress(userId: number, metric: string, muscleGroup?: string | null) {
  const weekStart = startOfWeek().toISOString();

  if (metric === "workouts") {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND workout_date >= ?")
      .get(userId, weekStart) as { count: number };
    return Number(row.count ?? 0);
  }

  if (metric === "legs" || metric === "abs") {
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT w.id) AS count
         FROM workouts w
         JOIN workout_exercises we ON we.workout_id = w.id
         JOIN exercises e ON e.id = we.exercise_id
         WHERE w.user_id = ? AND w.workout_date >= ? AND e.muscle_group = ?`
      )
      .get(userId, weekStart, muscleGroup ?? (metric === "legs" ? "Legs" : "Abs")) as { count: number };
    return Number(row.count ?? 0);
  }

  if (metric === "pushups") {
    const rows = db
      .prepare(
        `SELECT we.sets
         FROM workouts w
         JOIN workout_exercises we ON we.workout_id = w.id
         JOIN exercises e ON e.id = we.exercise_id
         WHERE w.user_id = ? AND w.workout_date >= ? AND e.name = 'Push-ups'`
      )
      .all(userId, weekStart) as Row[];

    return rows.reduce((total, row) => {
      const sets = jsonParse<SetEntry[]>(row.sets, []);
      return total + sets.filter((set) => set.completed).reduce((sum, set) => sum + Number(set.reps || 0), 0);
    }, 0);
  }

  if (metric === "calories") {
    const row = db
      .prepare("SELECT SUM(total_calories) AS total FROM workouts WHERE user_id = ? AND workout_date >= ?")
      .get(userId, weekStart) as { total: number | null };
    return Number(row.total ?? 0);
  }

  return 0;
}

function refreshChallenges(userId: number) {
  const challenges = db.prepare("SELECT * FROM challenges").all() as Row[];
  let bonusPoints = 0;

  for (const challenge of challenges) {
    const progress = getChallengeProgress(userId, String(challenge.metric), challenge.muscle_group as string | null);
    const target = Number(challenge.target);
    const previous = db
      .prepare("SELECT completed FROM user_challenges WHERE user_id = ? AND challenge_id = ?")
      .get(userId, Number(challenge.id)) as { completed: number } | undefined;
    const isCompleted = progress >= target;

    db.prepare(
      `INSERT INTO user_challenges (user_id, challenge_id, progress, completed)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, challenge_id)
       DO UPDATE SET progress = excluded.progress, completed = excluded.completed`
    ).run(userId, Number(challenge.id), Math.min(progress, target), isCompleted ? 1 : 0);

    if (isCompleted && !previous?.completed) {
      bonusPoints += Number(challenge.points);
    }
  }

  if (bonusPoints > 0) {
    db.prepare(
      `UPDATE user_stats
       SET total_points = total_points + ?, weekly_points = weekly_points + ?
       WHERE user_id = ?`
    ).run(bonusPoints, bonusPoints, userId);
  }
}

function getPersonalRecords(userId: number) {
  return db
    .prepare(
      `SELECT pr.id, pr.weight, pr.reps, pr.achieved_at AS achievedAt,
              e.id AS exerciseId, e.name AS exerciseName, e.muscle_group AS muscleGroup
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = ?
       ORDER BY pr.achieved_at DESC`
    )
    .all(userId) as Row[];
}

function getMotivationalMessage(userId: number) {
  const leaderboard = getLeaderboard();
  const current = leaderboard.find((item) => item.user.id === userId);
  const friend = leaderboard.find((item) => item.user.id !== userId);

  if (!current || !friend) {
    return "Start strong today and make the board move.";
  }

  const difference = current.stats.totalPoints - friend.stats.totalPoints;

  if (difference > 0) {
    return `You are ahead by ${difference} points. Protect the lead with one clean session.`;
  }

  if (difference < 0) {
    return `${friend.user.username} is ahead by ${Math.abs(difference)} points. A focused workout closes the gap fast.`;
  }

  return "You are tied. The next completed set matters.";
}

function getSuggestedWorkout(userId: number) {
  const user = getUserById(userId);
  const group = user?.favoriteMuscleGroup ?? "Full Body";
  const rows = db
    .prepare(
      `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
              common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
              recommended_reps AS recommendedReps, animation_type AS animationType,
              animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
              animation_src AS animationSrc, animation_credit AS animationCredit,
              calories_estimate AS caloriesEstimate
       FROM exercises
       WHERE muscle_group = ?
       ORDER BY CASE difficulty
         WHEN 'Beginner' THEN 1
         WHEN 'Intermediate' THEN 2
         ELSE 3
       END, name
       LIMIT 4`
    )
    .all(group) as Row[];

  return {
    title: `${group} focus`,
    exercises: rows.map(mapExercise)
  };
}

function getLeaderboard() {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.avatar, u.weight_goal AS weightGoal,
              u.favorite_muscle_group AS favoriteMuscleGroup,
              s.total_points AS totalPoints, s.weekly_points AS weeklyPoints,
              s.workouts_completed AS workoutsCompleted, s.current_streak AS currentStreak
       FROM users u
       JOIN user_stats s ON s.user_id = u.id
       ORDER BY s.total_points DESC`
    )
    .all() as Row[];

  return rows.map((row, index) => {
    const totalPoints = Number(row.totalPoints);

    return {
      place: index + 1,
      user: mapUser(row),
      stats: {
        totalPoints,
        weeklyPoints: Number(row.weeklyPoints),
        workoutsCompleted: Number(row.workoutsCompleted),
        currentStreak: Number(row.currentStreak)
      },
      rank: getRank(totalPoints),
      personalRecords: getPersonalRecords(Number(row.id)).slice(0, 3)
    };
  });
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, app: "Gym Rival" });
});

app.get("/api/users", (_request, response) => {
  const rows = db
    .prepare(
      "SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users"
    )
    .all() as Row[];

  response.json(rows.map(mapUser));
});

app.post("/api/auth/login", (request, response) => {
  const username = String(request.body?.username ?? "").trim();
  const row = db
    .prepare(
      `SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup
       FROM users WHERE lower(username) = lower(?)`
    )
    .get(username) as Row | undefined;

  if (!row) {
    response.status(401).json({ message: "Only Slim and Friend can log in." });
    return;
  }

  response.json({ user: mapUser(row) });
});

app.get("/api/meta", (_request, response) => {
  response.json({
    categories: getCategories(),
    ranks: getRanks(),
    pointRules: [
      { label: "Complete workout", points: 50 },
      { label: "Complete exercise", points: 10 },
      { label: "Personal record", points: 30 },
      { label: "5-day streak", points: 100 },
      { label: "Weekly challenge completed", points: 150 }
    ]
  });
});

app.get("/api/dashboard/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  const user = getUserById(userId);
  const stats = getStatsByUserId(userId);

  if (!user || !stats) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  const friendRow = db
    .prepare(
      `SELECT u.id, u.username, u.avatar, u.weight_goal AS weightGoal,
              u.favorite_muscle_group AS favoriteMuscleGroup,
              s.total_points AS totalPoints, s.weekly_points AS weeklyPoints,
              s.workouts_completed AS workoutsCompleted, s.current_streak AS currentStreak
       FROM users u
       JOIN user_stats s ON s.user_id = u.id
       WHERE u.id != ?
       LIMIT 1`
    )
    .get(userId) as Row | undefined;

  response.json({
    user,
    stats,
    rank: getRank(stats.totalPoints),
    todayWorkout: getSuggestedWorkout(userId),
    weeklyProgress: getWeeklyProgress(userId),
    friendComparison: friendRow
      ? {
          user: mapUser(friendRow),
          stats: {
            totalPoints: Number(friendRow.totalPoints),
            weeklyPoints: Number(friendRow.weeklyPoints),
            workoutsCompleted: Number(friendRow.workoutsCompleted),
            currentStreak: Number(friendRow.currentStreak)
          },
          rank: getRank(Number(friendRow.totalPoints))
        }
      : null,
    motivationalMessage: getMotivationalMessage(userId),
    recentWorkouts: getWorkoutHistory(userId, 3)
  });
});

app.get("/api/exercises", (request, response) => {
  const group = request.query.group ? String(request.query.group) : undefined;
  const search = request.query.search ? `%${String(request.query.search)}%` : undefined;

  let rows: Row[];

  if (group && search) {
    rows = db
      .prepare(
        `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
                common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
                recommended_reps AS recommendedReps, animation_type AS animationType,
                animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
                animation_src AS animationSrc, animation_credit AS animationCredit,
                calories_estimate AS caloriesEstimate
         FROM exercises
         WHERE muscle_group = ? AND name LIKE ?
         ORDER BY muscle_group, name`
      )
      .all(group, search) as Row[];
  } else if (group) {
    rows = db
      .prepare(
        `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
                common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
                recommended_reps AS recommendedReps, animation_type AS animationType,
                animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
                animation_src AS animationSrc, animation_credit AS animationCredit,
                calories_estimate AS caloriesEstimate
         FROM exercises
         WHERE muscle_group = ?
         ORDER BY name`
      )
      .all(group) as Row[];
  } else if (search) {
    rows = db
      .prepare(
        `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
                common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
                recommended_reps AS recommendedReps, animation_type AS animationType,
                animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
                animation_src AS animationSrc, animation_credit AS animationCredit,
                calories_estimate AS caloriesEstimate
         FROM exercises
         WHERE name LIKE ? OR muscle_group LIKE ?
         ORDER BY muscle_group, name`
      )
      .all(search, search) as Row[];
  } else {
    rows = db
      .prepare(
        `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
                common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
                recommended_reps AS recommendedReps, animation_type AS animationType,
                animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
                animation_src AS animationSrc, animation_credit AS animationCredit,
                calories_estimate AS caloriesEstimate
         FROM exercises
         ORDER BY muscle_group, name`
      )
      .all() as Row[];
  }

  response.json(rows.map(mapExercise));
});

app.get("/api/exercises/:id", (request, response) => {
  const exercise = getExerciseById(Number(request.params.id));

  if (!exercise) {
    response.status(404).json({ message: "Exercise not found." });
    return;
  }

  response.json(exercise);
});

app.get("/api/workouts/:userId", (request, response) => {
  response.json(getWorkoutHistory(Number(request.params.userId), 50));
});

app.post("/api/workouts", (request, response) => {
  const userId = Number(request.body?.userId);
  const notes = String(request.body?.notes ?? "");
  const entries = (Array.isArray(request.body?.exercises) ? request.body.exercises : []) as Row[];

  if (!getUserById(userId)) {
    response.status(400).json({ message: "Invalid user." });
    return;
  }

  const normalizedEntries: NormalizedWorkoutEntry[] = entries.flatMap((entry) => {
      const exercise = getExerciseById(Number(entry.exerciseId));
      const sets = Array.isArray(entry.sets)
        ? (entry.sets as Row[]).map((set) => ({
            weight: Number(set.weight || 0),
            reps: Number(set.reps || 0),
            completed: Boolean(set.completed)
          }))
        : [];

      return exercise
        ? [
            {
              exercise,
              sets,
              notes: String(entry.notes ?? ""),
              personalRecord: Boolean(entry.personalRecord),
              completedSets: sets.filter((set) => set.completed).length,
              recordSet: null
            }
          ]
        : [];
    });

  const completedEntries = normalizedEntries.filter((entry) => entry.completedSets > 0);
  const previousStats = getStatsByUserId(userId);

  if (completedEntries.length === 0) {
    response.status(400).json({ message: "Complete at least one set before saving." });
    return;
  }

  let personalRecordCount = 0;
  const now = new Date().toISOString();
  const insertWorkout = db.prepare(
    "INSERT INTO workouts (user_id, workout_date, notes, total_points, total_calories) VALUES (?, ?, ?, ?, ?)"
  );
  const insertWorkoutExercise = db.prepare(
    "INSERT INTO workout_exercises (workout_id, exercise_id, sets, notes, completed_sets, personal_record) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertRecord = db.prepare(
    "INSERT INTO personal_records (user_id, exercise_id, weight, reps, achieved_at) VALUES (?, ?, ?, ?, ?)"
  );

  for (const entry of completedEntries) {
    const topSet = entry.sets
      .filter((set) => set.completed)
      .reduce<SetEntry | null>((best, set) => (!best || set.weight > best.weight ? set : best), null);
    const existing = db
      .prepare("SELECT MAX(weight) AS weight FROM personal_records WHERE user_id = ? AND exercise_id = ?")
      .get(userId, entry.exercise.id) as { weight: number | null };
    const isRecord = Boolean(entry.personalRecord || (topSet && topSet.weight > Number(existing.weight ?? 0)));

    if (isRecord && topSet) {
      personalRecordCount += 1;
      entry.recordSet = topSet;
    }

    entry.personalRecord = isRecord;
  }

  const totalCalories = completedEntries.reduce((sum, entry) => sum + entry.exercise.caloriesEstimate, 0);
  const totalPoints = 50 + completedEntries.length * 10 + personalRecordCount * 30;

  db.exec("BEGIN TRANSACTION;");

  try {
    const workoutResult = insertWorkout.run(userId, now, notes, totalPoints, totalCalories);
    const workoutId = Number(workoutResult.lastInsertRowid);

    for (const entry of completedEntries) {
      insertWorkoutExercise.run(
        workoutId,
        entry.exercise.id,
        JSON.stringify(entry.sets),
        entry.notes,
        entry.completedSets,
        entry.personalRecord ? 1 : 0
      );

      if (entry.personalRecord && entry.recordSet) {
        insertRecord.run(userId, entry.exercise.id, entry.recordSet.weight, entry.recordSet.reps, now);
      }
    }

    db.prepare(
      `UPDATE user_stats
       SET total_points = total_points + ?,
           weekly_points = weekly_points + ?,
           workouts_completed = workouts_completed + 1
       WHERE user_id = ?`
    ).run(totalPoints, totalPoints, userId);

    const streak = calculateCurrentStreak(userId);
    db.prepare("UPDATE user_stats SET current_streak = ? WHERE user_id = ?").run(streak, userId);

    if ((previousStats?.currentStreak ?? 0) < 5 && streak >= 5) {
      db.prepare(
        `UPDATE user_stats
         SET total_points = total_points + 100,
             weekly_points = weekly_points + 100
         WHERE user_id = ?`
      ).run(userId);
    }

    refreshChallenges(userId);
    refreshBadges(userId);

    db.exec("COMMIT;");

    response.status(201).json({
      workoutId,
      totalPoints,
      totalCalories,
      personalRecordCount,
      stats: getStatsByUserId(userId),
      rank: getRank(getStatsByUserId(userId)?.totalPoints ?? 0)
    });
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
});

app.get("/api/leaderboard", (_request, response) => {
  response.json(getLeaderboard());
});

app.get("/api/challenges/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  refreshChallenges(userId);

  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.description, c.points, c.metric, c.target, c.muscle_group AS muscleGroup,
              uc.progress, uc.completed
       FROM challenges c
       JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = ?
       ORDER BY c.id`
    )
    .all(userId) as Row[];

  response.json(
    rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      description: String(row.description),
      points: Number(row.points),
      metric: String(row.metric),
      target: Number(row.target),
      muscleGroup: row.muscleGroup ? String(row.muscleGroup) : null,
      progress: Number(row.progress),
      completed: Boolean(row.completed)
    }))
  );
});

app.patch("/api/challenges/:userId/:challengeId", (request, response) => {
  const userId = Number(request.params.userId);
  const challengeId = Number(request.params.challengeId);
  const progress = Number(request.body?.progress ?? 0);
  const challenge = db.prepare("SELECT target, points FROM challenges WHERE id = ?").get(challengeId) as
    | { target: number; points: number }
    | undefined;
  const previous = db
    .prepare("SELECT completed FROM user_challenges WHERE user_id = ? AND challenge_id = ?")
    .get(userId, challengeId) as { completed: number } | undefined;

  if (!challenge) {
    response.status(404).json({ message: "Challenge not found." });
    return;
  }

  const completed = progress >= challenge.target;

  db.prepare(
    `INSERT INTO user_challenges (user_id, challenge_id, progress, completed)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, challenge_id)
     DO UPDATE SET progress = excluded.progress, completed = excluded.completed`
  ).run(userId, challengeId, Math.min(progress, challenge.target), completed ? 1 : 0);

  if (completed && !previous?.completed) {
    db.prepare(
      "UPDATE user_stats SET total_points = total_points + ?, weekly_points = weekly_points + ? WHERE user_id = ?"
    ).run(challenge.points, challenge.points, userId);
  }

  response.json({ ok: true });
});

app.get("/api/profile/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  const user = getUserById(userId);
  const stats = getStatsByUserId(userId);

  if (!user || !stats) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  const badges = db
    .prepare(
      `SELECT b.id, b.title, b.description, b.icon, ub.earned_at AS earnedAt
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = ?
       ORDER BY ub.earned_at DESC`
    )
    .all(userId) as Row[];

  response.json({
    user,
    stats,
    rank: getRank(stats.totalPoints),
    badges: badges.map((badge) => ({
      id: Number(badge.id),
      title: String(badge.title),
      description: String(badge.description),
      icon: String(badge.icon),
      earnedAt: String(badge.earnedAt)
    })),
    workoutHistory: getWorkoutHistory(userId, 20),
    personalRecords: getPersonalRecords(userId).map((record) => ({
      id: Number(record.id),
      exerciseId: Number(record.exerciseId),
      exerciseName: String(record.exerciseName),
      muscleGroup: String(record.muscleGroup),
      weight: Number(record.weight),
      reps: Number(record.reps),
      achievedAt: String(record.achievedAt)
    }))
  });
});

const clientDistPath = path.resolve(__dirname, "../../client/dist");

if (process.env.NODE_ENV === "production" || process.env.SERVE_CLIENT === "true") {
  app.use(express.static(clientDistPath));
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ message: "Something went wrong in Gym Rival API." });
});

app.listen(PORT, () => {
  console.log(`Gym Rival API running on http://localhost:${PORT}`);
});
