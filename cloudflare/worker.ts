export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type Row = Record<string, unknown>;
type SetEntry = {
  weight: number;
  reps: number;
  completed: boolean;
};

const categories = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Abs", "Cardio"];

const ranks = [
  { name: "Bronze", minPoints: 0, maxPoints: 499, color: "#f59e0b" },
  { name: "Silver", minPoints: 500, maxPoints: 1499, color: "#cbd5e1" },
  { name: "Gold", minPoints: 1500, maxPoints: 2999, color: "#facc15" },
  { name: "Diamond", minPoints: 3000, maxPoints: 4999, color: "#38bdf8" },
  { name: "Master", minPoints: 5000, maxPoints: 7999, color: "#fb7185" },
  { name: "Titan", minPoints: 8000, maxPoints: 999999, color: "#a78bfa" }
];

const dailyCheckInPoints = 75;
const punishmentIdeas = ["buy protein shake", "100 pushups", "pay dinner", "post gym selfie", "extra leg day"];

const personalRecordTargets = [
  { key: "bench_press", label: "Bench press", exerciseName: "Bench Press", metric: "kg", sort: "desc" },
  { key: "squat", label: "Squat", exerciseName: "Back Squat", metric: "kg", sort: "desc" },
  { key: "deadlift", label: "Deadlift", exerciseName: "Deadlift", metric: "kg", sort: "desc" },
  { key: "pull_ups", label: "Pull-ups", exerciseName: "Pull-ups", metric: "reps", sort: "desc" },
  { key: "running_time", label: "Running time", exerciseName: "Running Time", metric: "min", sort: "asc" }
] as const;

const exerciseSelect = `
  SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
         common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
         recommended_reps AS recommendedReps, animation_type AS animationType,
         animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
         animation_src AS animationSrc, animation_credit AS animationCredit,
         calories_estimate AS caloriesEstimate
  FROM exercises
`;

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      ...init?.headers
    }
  });
}

async function all<T extends Row = Row>(env: Env, sql: string, ...params: unknown[]) {
  const result = await env.DB.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

async function first<T extends Row = Row>(env: Env, sql: string, ...params: unknown[]) {
  return (await env.DB.prepare(sql).bind(...params).first<T>()) ?? undefined;
}

function jsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapExercise(row: Row) {
  const assetKey = String(row.animationAssetKey ?? "");
  const mediaSrc = row.animationSrc ? String(row.animationSrc) : null;

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
    animationAssetKey: assetKey,
    animationMediaType: row.animationMediaType ? String(row.animationMediaType) : null,
    animationSrc: mediaSrc,
    animationCredit: row.animationCredit ? String(row.animationCredit) : null,
    caloriesEstimate: Number(row.caloriesEstimate)
  };
}

type ExerciseRecord = ReturnType<typeof mapExercise>;

function mapUser(row: Row) {
  return {
    id: Number(row.id),
    username: String(row.username),
    avatar: String(row.avatar),
    weightGoal: String(row.weightGoal),
    favoriteMuscleGroup: String(row.favoriteMuscleGroup)
  };
}

function compactUser(user: ReturnType<typeof mapUser>) {
  return {
    ...user,
    avatar: user.avatar.length > 512 ? user.username.slice(0, 1).toUpperCase() : user.avatar
  };
}

function getRank(totalPoints: number) {
  const rank = ranks.find((item) => totalPoints >= item.minPoints && totalPoints <= item.maxPoints) ?? ranks[0];
  const nextRank = ranks.find((item) => item.minPoints > totalPoints);
  const range = rank.maxPoints - rank.minPoints + 1;
  const progress = rank.name === "Titan" ? 100 : Math.min(100, Math.round(((totalPoints - rank.minPoints) / range) * 100));

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

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function daysElapsedThisWeek(date = new Date()) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function formatRecordValue(value: number, metric: string) {
  if (metric === "kg") return `${value}kg`;
  if (metric === "min") return `${value} min`;
  return `${value} ${metric}`;
}

function buildRivalMessage(event: "dashboard" | "daily-checkin" | "duplicate-checkin" | "record", userName: string, context?: { place?: number; streak?: number }) {
  if (event === "daily-checkin") return `${userName} trained today. The pressure is on.`;
  if (event === "duplicate-checkin") return `${userName} already checked in today. No double dipping.`;
  if (event === "record") return `${userName} raised the bar. Somebody answer that PR.`;
  if (context?.streak && context.streak >= 7) return "New streak unlocked. Respect.";
  if (context?.place === 1) return `${userName} is climbing the leaderboard.`;
  if (userName === "Adel") return "Adel skipped leg day again. Chicken legs detected.";
  return "The board is tight. One workout can change the mood.";
}

async function getUserById(env: Env, userId: number) {
  const row = await first(
    env,
    `SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup
     FROM users WHERE id = ?`,
    userId
  );
  return row ? mapUser(row) : undefined;
}

async function getStatsByUserId(env: Env, userId: number) {
  return first<{
    userId: number;
    totalPoints: number;
    weeklyPoints: number;
    workoutsCompleted: number;
    currentStreak: number;
  }>(
    env,
    `SELECT user_id AS userId, total_points AS totalPoints, weekly_points AS weeklyPoints,
            workouts_completed AS workoutsCompleted, current_streak AS currentStreak
     FROM user_stats WHERE user_id = ?`,
    userId
  );
}

async function getExerciseById(env: Env, exerciseId: number) {
  const row = await first(env, `${exerciseSelect} WHERE id = ?`, exerciseId);
  return row ? mapExercise(row) : undefined;
}

async function calculateCurrentStreak(env: Env, userId: number) {
  const rows = await all<{ day: string }>(
    env,
    "SELECT DISTINCT substr(workout_date, 1, 10) AS day FROM workouts WHERE user_id = ? ORDER BY day DESC",
    userId
  );

  if (rows.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (rows[0].day !== dateKey(today) && rows[0].day !== dateKey(yesterday)) return 0;

  let streak = 0;
  const expected = new Date(`${rows[0].day}T00:00:00.000Z`);

  for (const row of rows) {
    if (row.day !== dateKey(expected)) break;
    streak += 1;
    expected.setDate(expected.getDate() - 1);
  }

  return streak;
}

async function calculateCurrentCheckInStreak(env: Env, userId: number) {
  const rows = await all<{ day: string }>(
    env,
    "SELECT checkin_date AS day FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC",
    userId
  );

  if (rows.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (rows[0].day !== dateKey(today) && rows[0].day !== dateKey(yesterday)) return 0;

  let streak = 0;
  const expected = new Date(`${rows[0].day}T00:00:00.000Z`);

  for (const row of rows) {
    if (row.day !== dateKey(expected)) break;
    streak += 1;
    expected.setUTCDate(expected.getUTCDate() - 1);
  }

  return streak;
}

async function refreshCurrentStreak(env: Env, userId: number) {
  const streak = await calculateCurrentCheckInStreak(env, userId);
  await env.DB.prepare("UPDATE user_stats SET current_streak = ? WHERE user_id = ?").bind(streak, userId).run();
  return streak;
}

async function getTodayCheckIn(env: Env, userId: number) {
  const today = dateKey(new Date());
  const row = await first<{ id: number; points: number; createdAt: string }>(
    env,
    "SELECT id, points, created_at AS createdAt FROM daily_checkins WHERE user_id = ? AND checkin_date = ?",
    userId,
    today
  );

  return {
    completed: Boolean(row),
    date: today,
    points: Number(row?.points ?? dailyCheckInPoints),
    createdAt: row?.createdAt ? String(row.createdAt) : null
  };
}

async function getWeeklyProgress(env: Env, userId: number) {
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

  const rows = await all(
    env,
    `SELECT substr(workout_date, 1, 10) AS date, COUNT(*) AS workouts,
            SUM(total_points) AS points, SUM(total_calories) AS calories
     FROM workouts
     WHERE user_id = ? AND workout_date >= ?
     GROUP BY substr(workout_date, 1, 10)`,
    userId,
    `${days[0].date}T00:00:00.000Z`
  );

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

async function getWorkoutHistory(env: Env, userId: number, limit = 12) {
  const workouts = await all(
    env,
    `SELECT id, workout_date AS workoutDate, notes, total_points AS totalPoints,
            total_calories AS totalCalories
     FROM workouts
     WHERE user_id = ?
     ORDER BY workout_date DESC
     LIMIT ?`,
    userId,
    limit
  );

  return Promise.all(
    workouts.map(async (workout) => {
      const entries = await all(
        env,
        `SELECT we.id, we.workout_id AS workoutId, we.exercise_id AS exerciseId, we.sets,
                we.notes, we.completed_sets AS completedSets, we.personal_record AS personalRecord,
                e.name, e.muscle_group AS muscleGroup
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = ?`,
        Number(workout.id)
      );

      return {
        id: Number(workout.id),
        workoutDate: String(workout.workoutDate),
        notes: String(workout.notes ?? ""),
        totalPoints: Number(workout.totalPoints),
        totalCalories: Number(workout.totalCalories),
        exercises: entries.map((entry) => ({
          id: Number(entry.id),
          exerciseId: Number(entry.exerciseId),
          name: String(entry.name),
          muscleGroup: String(entry.muscleGroup),
          sets: jsonParse<SetEntry[]>(entry.sets, []),
          notes: String(entry.notes ?? ""),
          completedSets: Number(entry.completedSets),
          personalRecord: Boolean(entry.personalRecord)
        }))
      };
    })
  );
}

async function getWorkoutTemplates(env: Env, userId: number) {
  const templates = await all(
    env,
    `SELECT id, user_id AS userId, name, created_at AS createdAt, updated_at AS updatedAt
     FROM workout_templates
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC`,
    userId
  );

  return Promise.all(
    templates.map(async (template) => {
      const entries = await all(
        env,
        `SELECT wte.id, wte.exercise_id AS exerciseId, wte.position, wte.sets, wte.notes,
                e.name, e.muscle_group AS muscleGroup
         FROM workout_template_exercises wte
         JOIN exercises e ON e.id = wte.exercise_id
         WHERE wte.template_id = ?
         ORDER BY wte.position`,
        Number(template.id)
      );

      return {
        id: Number(template.id),
        userId: Number(template.userId),
        name: String(template.name),
        createdAt: String(template.createdAt),
        updatedAt: String(template.updatedAt),
        exercises: entries.map((entry) => ({
          id: Number(entry.id),
          exerciseId: Number(entry.exerciseId),
          name: String(entry.name),
          muscleGroup: String(entry.muscleGroup),
          sets: jsonParse<SetEntry[]>(entry.sets, []),
          notes: String(entry.notes ?? "")
        }))
      };
    })
  );
}

async function getWorkoutTemplateById(env: Env, templateId: number) {
  const row = await first<{ userId: number }>(env, "SELECT user_id AS userId FROM workout_templates WHERE id = ?", templateId);
  if (!row) return null;
  return (await getWorkoutTemplates(env, Number(row.userId))).find((template) => template.id === templateId) ?? null;
}

async function getLastExercisePerformances(env: Env, userId: number) {
  const rows = await all(
    env,
    `SELECT we.exercise_id AS exerciseId, we.sets, we.notes, we.completed_sets AS completedSets,
            w.id AS workoutId, w.workout_date AS workoutDate,
            e.name, e.muscle_group AS muscleGroup
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     JOIN exercises e ON e.id = we.exercise_id
     WHERE w.user_id = ?
     ORDER BY w.workout_date DESC, we.id DESC`,
    userId
  );
  const seen = new Set<number>();

  return rows.flatMap((row) => {
    const exerciseId = Number(row.exerciseId);
    if (seen.has(exerciseId)) return [];
    seen.add(exerciseId);

    return [
      {
        exerciseId,
        workoutId: Number(row.workoutId),
        workoutDate: String(row.workoutDate),
        name: String(row.name),
        muscleGroup: String(row.muscleGroup),
        sets: jsonParse<SetEntry[]>(row.sets, []),
        notes: String(row.notes ?? ""),
        completedSets: Number(row.completedSets)
      }
    ];
  });
}

async function getProgressCharts(env: Env, userId: number) {
  const weeklyProgress = await getWeeklyProgress(env, userId);
  const muscleRows = await all(
    env,
    `SELECT e.muscle_group AS muscleGroup, SUM(we.completed_sets) AS sets
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     JOIN exercises e ON e.id = we.exercise_id
     WHERE w.user_id = ?
     GROUP BY e.muscle_group
     ORDER BY sets DESC`,
    userId
  );
  const recordRows = await all(
    env,
    `SELECT pr.exercise_id AS exerciseId, pr.weight, pr.reps, pr.achieved_at AS achievedAt,
            e.name AS exerciseName, e.muscle_group AS muscleGroup
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     WHERE pr.user_id = ?
     ORDER BY pr.achieved_at DESC
     LIMIT 10`,
    userId
  );

  return {
    volumeByWeek: weeklyProgress.map((week) => ({
      label: week.day,
      volume: Number(week.points),
      workouts: Number(week.workouts)
    })),
    muscleBalance: muscleRows.map((row) => ({
      muscleGroup: String(row.muscleGroup),
      sets: Number(row.sets ?? 0)
    })),
    personalRecordTrend: recordRows.map((row) => {
      const weight = Number(row.weight);
      const reps = Number(row.reps);
      return {
        exerciseId: Number(row.exerciseId),
        exerciseName: String(row.exerciseName),
        muscleGroup: String(row.muscleGroup),
        value: weight > 0 ? weight : reps,
        label: weight > 0 ? `${weight}kg x ${reps}` : `${reps} reps`,
        achievedAt: String(row.achievedAt)
      };
    })
  };
}

async function getActivityFeed(env: Env, userId: number, limit = 12) {
  const rows = await all(
    env,
    `SELECT w.id, w.workout_date AS createdAt, w.total_points AS totalPoints, w.total_calories AS totalCalories,
            u.id AS userId, u.username, u.avatar, u.weight_goal AS weightGoal, u.favorite_muscle_group AS favoriteMuscleGroup
     FROM workouts w
     JOIN users u ON u.id = w.user_id
     ORDER BY w.workout_date DESC
     LIMIT ?`,
    limit
  );

  return rows.map((row) => {
    const user = compactUser(mapUser({
      id: row.userId,
      username: row.username,
      avatar: row.avatar,
      weightGoal: row.weightGoal,
      favoriteMuscleGroup: row.favoriteMuscleGroup
    }));

    return {
      id: `workout-${Number(row.id)}-${String(row.createdAt)}`,
      type: "workout",
      title: `${user.username} completed a workout`,
      description: `+${Number(row.totalPoints)} pts - ${Number(row.totalCalories)} cal`,
      user: compactUser(user),
      createdAt: String(row.createdAt)
    };
  });
}

async function awardBadge(env: Env, userId: number, title: string) {
  const badge = await first<{ id: number }>(env, "SELECT id FROM badges WHERE title = ?", title);
  if (!badge) return;

  await env.DB.prepare("INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)")
    .bind(userId, badge.id, new Date().toISOString())
    .run();
}

async function getGroupWorkoutCount(env: Env, userId: number, group: string) {
  const result = await first<{ count: number }>(
    env,
    `SELECT COUNT(DISTINCT w.id) AS count
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id
     JOIN exercises e ON e.id = we.exercise_id
     WHERE w.user_id = ? AND e.muscle_group = ?`,
    userId,
    group
  );

  return Number(result?.count ?? 0);
}

async function getChallengeProgress(env: Env, userId: number, metric: string, muscleGroup?: string | null) {
  const weekStart = startOfWeek().toISOString();

  if (metric.startsWith("weekly_")) {
    return getWeeklyMetric(env, userId, metric);
  }

  if (metric === "workouts") {
    const row = await first<{ count: number }>(
      env,
      "SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND workout_date >= ?",
      userId,
      weekStart
    );
    return Number(row?.count ?? 0);
  }

  if (metric === "legs" || metric === "abs") {
    const row = await first<{ count: number }>(
      env,
      `SELECT COUNT(DISTINCT w.id) AS count
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ? AND w.workout_date >= ? AND e.muscle_group = ?`,
      userId,
      weekStart,
      muscleGroup ?? (metric === "legs" ? "Legs" : "Abs")
    );
    return Number(row?.count ?? 0);
  }

  if (metric === "pushups") {
    const rows = await all(
      env,
      `SELECT we.sets
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ? AND w.workout_date >= ? AND e.name = 'Push-ups'`,
      userId,
      weekStart
    );

    return rows.reduce((total, row) => {
      const sets = jsonParse<SetEntry[]>(row.sets, []);
      return total + sets.filter((set) => set.completed).reduce((sum, set) => sum + Number(set.reps || 0), 0);
    }, 0);
  }

  if (metric === "calories") {
    const row = await first<{ total: number | null }>(
      env,
      "SELECT SUM(total_calories) AS total FROM workouts WHERE user_id = ? AND workout_date >= ?",
      userId,
      weekStart
    );
    return Number(row?.total ?? 0);
  }

  return 0;
}

async function refreshChallenges(env: Env, userId: number) {
  const challenges = await all(env, "SELECT * FROM challenges");
  let bonusPoints = 0;

  for (const challenge of challenges) {
    const progress = await getChallengeProgress(env, userId, String(challenge.metric), challenge.muscle_group as string | null);
    const target = Number(challenge.target);
    const previous = await first<{ completed: number }>(
      env,
      "SELECT completed FROM user_challenges WHERE user_id = ? AND challenge_id = ?",
      userId,
      Number(challenge.id)
    );
    const isCompleted = progress >= target;

    await env.DB.prepare(
      `INSERT INTO user_challenges (user_id, challenge_id, progress, completed)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, challenge_id)
       DO UPDATE SET progress = excluded.progress, completed = excluded.completed`
    )
      .bind(userId, Number(challenge.id), Math.min(progress, target), isCompleted ? 1 : 0)
      .run();

    if (isCompleted && !previous?.completed) {
      bonusPoints += Number(challenge.points);
    }
  }

  if (bonusPoints > 0) {
    await env.DB.prepare(
      `UPDATE user_stats
       SET total_points = total_points + ?, weekly_points = weekly_points + ?
       WHERE user_id = ?`
    )
      .bind(bonusPoints, bonusPoints, userId)
      .run();
  }
}

async function refreshBadges(env: Env, userId: number) {
  const stats = await getStatsByUserId(env, userId);
  if (!stats) return;

  if (stats.workoutsCompleted >= 1) await awardBadge(env, userId, "First Workout");
  if (stats.currentStreak >= 7) await awardBadge(env, userId, "7-Day Streak");
  if (stats.currentStreak >= 30) await awardBadge(env, userId, "30-Day Streak");
  if ((await getGroupWorkoutCount(env, userId, "Chest")) >= 3) await awardBadge(env, userId, "Chest Warrior");
  if ((await getGroupWorkoutCount(env, userId, "Legs")) >= 2) await awardBadge(env, userId, "Leg Day Survivor");
  if ((await getGroupWorkoutCount(env, userId, "Cardio")) >= 3) await awardBadge(env, userId, "Cardio Machine");
  if (stats.totalPoints >= 1000) await awardBadge(env, userId, "1000 Points");
  if (stats.totalPoints >= 5000) await awardBadge(env, userId, "5000 Points");
}

async function getPersonalRecords(env: Env, userId: number) {
  return all(
    env,
    `SELECT pr.id, pr.weight, pr.reps, pr.achieved_at AS achievedAt,
            e.id AS exerciseId, e.name AS exerciseName, e.muscle_group AS muscleGroup
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     WHERE pr.user_id = ?
     ORDER BY pr.achieved_at DESC`,
    userId
  );
}

async function getBadgesForUser(env: Env, userId: number) {
  const rows = await all(
    env,
    `SELECT b.id, b.title, b.description, b.icon, ub.earned_at AS earnedAt
     FROM badges b
     LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
     ORDER BY b.id`,
    userId
  );

  return rows.map((badge) => ({
    id: Number(badge.id),
    title: String(badge.title),
    description: String(badge.description),
    icon: String(badge.icon),
    earnedAt: badge.earnedAt ? String(badge.earnedAt) : null,
    unlocked: Boolean(badge.earnedAt)
  }));
}

async function getExerciseByName(env: Env, name: string) {
  const row = await first(env, `${exerciseSelect} WHERE lower(name) = lower(?)`, name);
  return row ? mapExercise(row) : undefined;
}

async function getPersonalRecordBoards(env: Env) {
  const users = (await all(
    env,
    "SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id"
  )).map((row) => compactUser(mapUser(row)));

  return Promise.all(
    personalRecordTargets.map(async (target) => {
      const exercise = await getExerciseByName(env, target.exerciseName);
      const records = await Promise.all(
        users.map(async (user) => {
          const record = exercise
            ? await first(
                env,
                `SELECT id, weight, reps, achieved_at AS achievedAt
                 FROM personal_records
                 WHERE user_id = ? AND exercise_id = ?
                 ORDER BY ${target.key === "running_time" ? "weight ASC" : target.key === "pull_ups" ? "reps DESC" : "weight DESC"}, achieved_at DESC
                 LIMIT 1`,
                user.id,
                exercise.id
              )
            : undefined;
          const value = record ? (target.key === "pull_ups" ? Number(record.reps) : Number(record.weight)) : null;

          return {
            user,
            record: record
              ? {
                  id: Number(record.id),
                  exerciseId: exercise?.id ?? 0,
                  exerciseName: exercise?.name ?? target.exerciseName,
                  muscleGroup: exercise?.muscleGroup ?? "",
                  weight: Number(record.weight),
                  reps: Number(record.reps),
                  achievedAt: String(record.achievedAt)
                }
              : null,
            value,
            displayValue: value === null ? "No record" : formatRecordValue(value, target.metric)
          };
        })
      );
      const sortedRecords = records.sort((a, b) => {
        if (a.value === null && b.value === null) return a.user.id - b.user.id;
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return target.sort === "asc" ? a.value - b.value : b.value - a.value;
      });

      return {
        key: target.key,
        label: target.label,
        exerciseId: exercise?.id ?? null,
        exerciseName: exercise?.name ?? target.exerciseName,
        metric: target.metric,
        sort: target.sort,
        records: sortedRecords.map((record, index) => ({ ...record, place: record.value === null ? null : index + 1 }))
      };
    })
  );
}

async function getWeeklyMetric(env: Env, userId: number, metric: string) {
  const weekStart = startOfWeek().toISOString();

  if (metric === "weekly_workouts") {
    const workoutRow = await first<{ count: number }>(
      env,
      "SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND workout_date >= ?",
      userId,
      weekStart
    );
    const checkinRow = await first<{ count: number }>(
      env,
      "SELECT COUNT(*) AS count FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?",
      userId,
      weekStart.slice(0, 10)
    );
    return Number(workoutRow?.count ?? 0) + Number(checkinRow?.count ?? 0);
  }

  if (metric === "weekly_points") {
    const workoutRow = await first<{ total: number | null }>(
      env,
      "SELECT SUM(total_points) AS total FROM workouts WHERE user_id = ? AND workout_date >= ?",
      userId,
      weekStart
    );
    const checkinRow = await first<{ total: number | null }>(
      env,
      "SELECT SUM(points) AS total FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?",
      userId,
      weekStart.slice(0, 10)
    );
    return Number(workoutRow?.total ?? 0) + Number(checkinRow?.total ?? 0);
  }

  if (metric === "weekly_chest" || metric === "weekly_cardio") {
    const group = metric === "weekly_chest" ? "Chest" : "Cardio";
    const row = await first<{ count: number }>(
      env,
      `SELECT COUNT(DISTINCT w.id) AS count
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ? AND w.workout_date >= ? AND e.muscle_group = ?`,
      userId,
      weekStart,
      group
    );
    return Number(row?.count ?? 0);
  }

  if (metric === "weekly_no_skip") {
    const row = await first<{ count: number }>(
      env,
      "SELECT COUNT(DISTINCT checkin_date) AS count FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?",
      userId,
      weekStart.slice(0, 10)
    );
    return Number(row?.count ?? 0);
  }

  return 0;
}

async function getWeeklyChallenges(env: Env) {
  const users = (await all(
    env,
    "SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id"
  )).map((row) => compactUser(mapUser(row)));
  const challengeRows = await all(
    env,
    "SELECT id, title, description, points, metric, target, muscle_group AS muscleGroup FROM challenges WHERE metric LIKE 'weekly_%' ORDER BY id"
  );
  const elapsedDays = daysElapsedThisWeek();

  return {
    weekStart: dateKey(startOfWeek()),
    generatedAt: new Date().toISOString(),
    challenges: await Promise.all(
      challengeRows.map(async (challenge) => {
        const metric = String(challenge.metric);
        const leaderboard = await Promise.all(
          users.map(async (user) => {
            const value = await getWeeklyMetric(env, user.id, metric);
            const target = metric === "weekly_no_skip" ? elapsedDays : Number(challenge.target);

            return {
              user,
              value,
              target,
              completed: metric === "weekly_no_skip" ? value >= elapsedDays : value >= target,
              label: metric === "weekly_points" ? `${value} pts` : metric === "weekly_no_skip" ? `${value}/${elapsedDays} days` : `${value}`
            };
          })
        );

        const sorted = leaderboard.sort((a, b) => b.value - a.value || a.user.id - b.user.id);

        return {
          id: Number(challenge.id),
          title: String(challenge.title),
          description: String(challenge.description),
          points: Number(challenge.points),
          metric,
          target: metric === "weekly_no_skip" ? elapsedDays : Number(challenge.target),
          muscleGroup: challenge.muscleGroup ? String(challenge.muscleGroup) : null,
          leaderboard: sorted.map((entry, index) => ({ ...entry, place: index + 1 }))
        };
      })
    )
  };
}

async function getMonthlyLoser(env: Env) {
  const monthStart = startOfMonth();
  const nextMonth = startOfNextMonth();
  const users = (await all(
    env,
    "SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id"
  )).map((row) => compactUser(mapUser(row)));
  const rows = await Promise.all(
    users.map(async (user) => {
      const workoutRow = await first<{ total: number | null }>(
        env,
        "SELECT SUM(total_points) AS total FROM workouts WHERE user_id = ? AND workout_date >= ? AND workout_date < ?",
        user.id,
        monthStart.toISOString(),
        nextMonth.toISOString()
      );
      const checkinRow = await first<{ total: number | null }>(
        env,
        "SELECT SUM(points) AS total FROM daily_checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date < ?",
        user.id,
        dateKey(monthStart),
        dateKey(nextMonth)
      );

      return {
        user,
        points: Number(workoutRow?.total ?? 0) + Number(checkinRow?.total ?? 0)
      };
    })
  );
  const loser = rows.sort((a, b) => a.points - b.points || a.user.id - b.user.id)[0];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    user: loser.user,
    points: loser.points,
    status: today.getUTCMonth() !== tomorrow.getUTCMonth() ? "Monthly loser" : "Current lowest",
    punishments: punishmentIdeas
  };
}

async function getSuggestedWorkout(env: Env, userId: number) {
  const user = await getUserById(env, userId);
  const group = user?.favoriteMuscleGroup ?? "Full Body";
  const rows = await all(
    env,
    `${exerciseSelect}
     WHERE muscle_group = ?
     ORDER BY CASE difficulty
       WHEN 'Beginner' THEN 1
       WHEN 'Intermediate' THEN 2
       ELSE 3
     END, name
     LIMIT 4`,
    group
  );

  return { title: `${group} focus`, exercises: rows.map(mapExercise) };
}

async function getLeaderboard(env: Env) {
  const rows = await all(
    env,
    `SELECT u.id, u.username, u.avatar, u.weight_goal AS weightGoal,
            u.favorite_muscle_group AS favoriteMuscleGroup,
            s.total_points AS totalPoints, s.weekly_points AS weeklyPoints,
            s.workouts_completed AS workoutsCompleted, s.current_streak AS currentStreak
     FROM users u
     JOIN user_stats s ON s.user_id = u.id
     ORDER BY s.total_points DESC`
  );

  return Promise.all(
    rows.map(async (row, index) => {
      const totalPoints = Number(row.totalPoints);
      return {
        place: index + 1,
        user: compactUser(mapUser(row)),
        stats: {
          totalPoints,
          weeklyPoints: Number(row.weeklyPoints),
          workoutsCompleted: Number(row.workoutsCompleted),
          currentStreak: Number(row.currentStreak)
        },
        rank: getRank(totalPoints),
        personalRecords: (await getPersonalRecords(env, Number(row.id))).slice(0, 3)
      };
    })
  );
}

async function getMotivationalMessage(env: Env, userId: number) {
  const leaderboard = await getLeaderboard(env);
  const current = leaderboard.find((item) => item.user.id === userId);
  const friend = leaderboard.find((item) => item.user.id !== userId);

  if (!current || !friend) return "Start strong today and make the board move.";
  const streak = Number(current.stats.currentStreak);

  if (streak >= 7) return buildRivalMessage("dashboard", current.user.username, { place: current.place, streak });

  const difference = current.stats.totalPoints - friend.stats.totalPoints;
  if (difference > 0) return `You are ahead by ${difference} points. Protect the lead with one clean session.`;
  if (difference < 0) return `${friend.user.username} is ahead by ${Math.abs(difference)} points. A focused workout closes the gap fast.`;
  return "You are tied. The next completed set matters.";
}

async function handleDailyCheckIn(request: Request, env: Env) {
  const body = (await request.json().catch(() => ({}))) as { userId?: number };
  const userId = Number(body.userId);
  const user = await getUserById(env, userId);

  if (!user) return json({ message: "Invalid user." }, { status: 400 });

  const today = dateKey(new Date());
  const existing = await first<{ id: number }>(
    env,
    "SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?",
    userId,
    today
  );

  if (existing) {
    const streak = await refreshCurrentStreak(env, userId);
    const stats = await getStatsByUserId(env, userId);
    return json({
      alreadyCheckedIn: true,
      todayCheckIn: await getTodayCheckIn(env, userId),
      stats,
      rank: getRank(stats?.totalPoints ?? 0),
      message: buildRivalMessage("duplicate-checkin", user.username, { streak })
    });
  }

  await env.DB.prepare(
    "INSERT INTO daily_checkins (user_id, checkin_date, points, source, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, today, dailyCheckInPoints, "daily_button", new Date().toISOString())
    .run();

  await env.DB.prepare(
    `UPDATE user_stats
     SET total_points = total_points + ?,
         weekly_points = weekly_points + ?,
         workouts_completed = workouts_completed + 1
     WHERE user_id = ?`
  )
    .bind(dailyCheckInPoints, dailyCheckInPoints, userId)
    .run();

  const streak = await refreshCurrentStreak(env, userId);
  await refreshBadges(env, userId);
  const stats = await getStatsByUserId(env, userId);

  return json(
    {
      alreadyCheckedIn: false,
      pointsAdded: dailyCheckInPoints,
      todayCheckIn: await getTodayCheckIn(env, userId),
      stats,
      rank: getRank(stats?.totalPoints ?? 0),
      message: buildRivalMessage("daily-checkin", user.username, { streak })
    },
    { status: 201 }
  );
}

async function handlePersonalRecordUpdate(request: Request, env: Env) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: number;
    exerciseId?: number;
    exerciseName?: string;
    value?: number;
    reps?: number;
  };
  const userId = Number(body.userId);
  const value = Number(body.value);
  const reps = Number(body.reps ?? 1);
  const user = await getUserById(env, userId);

  if (!user) return json({ message: "Invalid user." }, { status: 400 });
  if (!Number.isFinite(value) || value <= 0) return json({ message: "Record value must be greater than zero." }, { status: 400 });

  const exercise = body.exerciseId
    ? await getExerciseById(env, Number(body.exerciseId))
    : await getExerciseByName(env, String(body.exerciseName ?? ""));

  if (!exercise) return json({ message: "Exercise not found." }, { status: 404 });

  const target = personalRecordTargets.find((item) => item.exerciseName === exercise.name);
  const recordWeight = target?.key === "pull_ups" ? 0 : value;
  const recordReps = target?.key === "pull_ups" ? Math.round(value) : Math.max(1, Math.round(reps));
  const now = new Date().toISOString();

  await env.DB.prepare("DELETE FROM personal_records WHERE user_id = ? AND exercise_id = ?").bind(userId, exercise.id).run();
  await env.DB.prepare("INSERT INTO personal_records (user_id, exercise_id, weight, reps, achieved_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, exercise.id, recordWeight, recordReps, now)
    .run();

  await refreshBadges(env, userId);

  return json({
    message: buildRivalMessage("record", user.username),
    record: {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weight: recordWeight,
      reps: recordReps,
      achievedAt: now
    },
    leaderboards: await getPersonalRecordBoards(env)
  });
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (request.method === "OPTIONS") return json({ ok: true });

  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true, app: "Gym Rival", runtime: "cloudflare-workers" });
  }

  if (request.method === "GET" && path === "/api/users") {
    const rows = await all(
      env,
      "SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users"
    );
    return json(rows.map(mapUser));
  }

  if (request.method === "POST" && path === "/api/auth/login") {
    const body = (await request.json().catch(() => ({}))) as { username?: string };
    const username = String(body.username ?? "").trim();
    const row = await first(
      env,
      `SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup
       FROM users WHERE lower(username) = lower(?)`,
      username
    );

    if (!row) return json({ message: "Only Slim, Adel, and Saber can log in." }, { status: 401 });
    return json({ user: mapUser(row) });
  }

  const avatarMatch = path.match(/^\/api\/users\/(\d+)\/avatar$/);
  if (request.method === "PATCH" && avatarMatch) {
    const userId = Number(avatarMatch[1]);
    const body = (await request.json().catch(() => ({}))) as { avatar?: string };
    const avatar = String(body.avatar ?? "").trim();
    const user = await getUserById(env, userId);

    if (!user) return json({ message: "User not found." }, { status: 404 });

    if (!avatar || avatar.length > 2_200_000 || !/^(data:image\/|https?:\/\/|\/|[A-Za-z0-9]{1,3}$)/i.test(avatar)) {
      return json({ message: "Invalid profile picture." }, { status: 400 });
    }

    await env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(avatar, userId).run();
    return json({ user: await getUserById(env, userId) });
  }

  if (request.method === "GET" && path === "/api/meta") {
    return json({
      categories,
      ranks,
      pointRules: [
        { label: "Daily workout check-in", points: dailyCheckInPoints },
        { label: "Complete workout", points: 50 },
        { label: "Complete exercise", points: 10 },
        { label: "Personal record", points: 30 },
        { label: "7-day streak badge", points: 0 },
        { label: "Weekly challenge completed", points: 150 }
      ]
    });
  }

  const dashboardMatch = path.match(/^\/api\/dashboard\/(\d+)$/);
  if (request.method === "GET" && dashboardMatch) {
    const userId = Number(dashboardMatch[1]);
    const user = await getUserById(env, userId);

    if (!user) return json({ message: "User not found." }, { status: 404 });

    await refreshCurrentStreak(env, userId);
    await refreshBadges(env, userId);
    const stats = await getStatsByUserId(env, userId);

    if (!stats) return json({ message: "User not found." }, { status: 404 });

    const friendRow = await first(
      env,
      `SELECT u.id, u.username, u.avatar, u.weight_goal AS weightGoal,
              u.favorite_muscle_group AS favoriteMuscleGroup,
              s.total_points AS totalPoints, s.weekly_points AS weeklyPoints,
              s.workouts_completed AS workoutsCompleted, s.current_streak AS currentStreak
       FROM users u
       JOIN user_stats s ON s.user_id = u.id
       WHERE u.id != ?
       ORDER BY s.total_points DESC
       LIMIT 1`,
      userId
    );

    return json({
      user,
      stats,
      rank: getRank(stats.totalPoints),
      todayWorkout: await getSuggestedWorkout(env, userId),
      weeklyProgress: await getWeeklyProgress(env, userId),
      friendComparison: friendRow
        ? {
            user: compactUser(mapUser(friendRow)),
            stats: {
              totalPoints: Number(friendRow.totalPoints),
              weeklyPoints: Number(friendRow.weeklyPoints),
              workoutsCompleted: Number(friendRow.workoutsCompleted),
              currentStreak: Number(friendRow.currentStreak)
            },
            rank: getRank(Number(friendRow.totalPoints))
          }
        : null,
      motivationalMessage: await getMotivationalMessage(env, userId),
      recentWorkouts: await getWorkoutHistory(env, userId, 3),
      todayCheckIn: await getTodayCheckIn(env, userId),
      leaderboard: await getLeaderboard(env),
      weeklyChallenges: await getWeeklyChallenges(env),
      badges: await getBadgesForUser(env, userId),
      personalRecordBoards: await getPersonalRecordBoards(env),
      monthlyLoser: await getMonthlyLoser(env),
      progressCharts: await getProgressCharts(env, userId),
      activityFeed: await getActivityFeed(env, userId, 12)
    });
  }

  const dashboardSummaryMatch = path.match(/^\/api\/dashboard-summary\/(\d+)$/);
  if (request.method === "GET" && dashboardSummaryMatch) {
    const summaryUrl = new URL(request.url);
    summaryUrl.pathname = `/api/dashboard/${dashboardSummaryMatch[1]}`;
    return handleApi(new Request(summaryUrl, request), env, summaryUrl);
  }

  if (request.method === "GET" && path === "/api/exercises") {
    const group = url.searchParams.get("group") || undefined;
    const search = url.searchParams.get("search");
    let rows: Row[];

    if (group && search) {
      rows = await all(env, `${exerciseSelect} WHERE muscle_group = ? AND name LIKE ? ORDER BY muscle_group, name`, group, `%${search}%`);
    } else if (group) {
      rows = await all(env, `${exerciseSelect} WHERE muscle_group = ? ORDER BY name`, group);
    } else if (search) {
      rows = await all(env, `${exerciseSelect} WHERE name LIKE ? OR muscle_group LIKE ? ORDER BY muscle_group, name`, `%${search}%`, `%${search}%`);
    } else {
      rows = await all(env, `${exerciseSelect} ORDER BY muscle_group, name`);
    }

    return json(rows.map(mapExercise));
  }

  const exerciseMatch = path.match(/^\/api\/exercises\/(\d+)$/);
  if (request.method === "GET" && exerciseMatch) {
    const exercise = await getExerciseById(env, Number(exerciseMatch[1]));
    if (!exercise) return json({ message: "Exercise not found." }, { status: 404 });
    return json(exercise);
  }

  const workoutsMatch = path.match(/^\/api\/workouts\/(\d+)$/);
  if (request.method === "GET" && workoutsMatch) {
    return json(await getWorkoutHistory(env, Number(workoutsMatch[1]), 50));
  }

  const workoutContextMatch = path.match(/^\/api\/workout-context\/(\d+)$/);
  if (request.method === "GET" && workoutContextMatch) {
    const userId = Number(workoutContextMatch[1]);
    const user = await getUserById(env, userId);
    if (!user) return json({ message: "User not found." }, { status: 404 });

    return json({
      templates: await getWorkoutTemplates(env, userId),
      lastPerformances: await getLastExercisePerformances(env, userId)
    });
  }

  if (request.method === "POST" && path === "/api/workout-templates") {
    const body = (await request.json().catch(() => ({}))) as {
      userId?: number;
      name?: string;
      exercises?: Array<{ exerciseId?: number; sets?: Array<Partial<SetEntry>>; notes?: string }>;
    };
    const userId = Number(body.userId);
    const user = await getUserById(env, userId);
    const name = String(body.name ?? "").trim();

    if (!user) return json({ message: "Invalid user." }, { status: 400 });
    if (!name) return json({ message: "Template name is required." }, { status: 400 });

    const entries = body.exercises ?? [];
    if (entries.length === 0) return json({ message: "Add at least one exercise to save a template." }, { status: 400 });

    const now = new Date().toISOString();
    const templateResult = await env.DB.prepare("INSERT INTO workout_templates (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .bind(userId, name.slice(0, 80), now, now)
      .run();
    const templateId = Number(templateResult.meta.last_row_id);

    for (const [index, entry] of entries.entries()) {
      const exercise = await getExerciseById(env, Number(entry.exerciseId));
      if (!exercise) continue;
      const sets = Array.isArray(entry.sets)
        ? entry.sets.map((set) => ({ weight: Number(set.weight || 0), reps: Number(set.reps || 0), completed: false }))
        : [];

      await env.DB.prepare("INSERT INTO workout_template_exercises (template_id, exercise_id, position, sets, notes) VALUES (?, ?, ?, ?, ?)")
        .bind(templateId, exercise.id, index + 1, JSON.stringify(sets), String(entry.notes ?? ""))
        .run();
    }

    return json(await getWorkoutTemplateById(env, templateId), { status: 201 });
  }

  const templateDeleteMatch = path.match(/^\/api\/workout-templates\/(\d+)$/);
  if (request.method === "DELETE" && templateDeleteMatch) {
    const templateId = Number(templateDeleteMatch[1]);
    const userId = Number(url.searchParams.get("userId") ?? 0);
    const row = await first<{ userId: number }>(env, "SELECT user_id AS userId FROM workout_templates WHERE id = ?", templateId);

    if (!row) return json({ message: "Template not found." }, { status: 404 });
    if (Number(row.userId) !== userId) return json({ message: "You can only delete your own templates." }, { status: 403 });

    await env.DB.prepare("DELETE FROM workout_templates WHERE id = ?").bind(templateId).run();
    return json({ ok: true });
  }

  if (request.method === "POST" && path === "/api/workouts") {
    return saveWorkout(request, env);
  }

  if (request.method === "POST" && path === "/api/checkins/daily") {
    return handleDailyCheckIn(request, env);
  }

  if (request.method === "GET" && path === "/api/leaderboard") {
    const users = await all<{ id: number }>(env, "SELECT id FROM users");
    await Promise.all(users.map((user) => refreshCurrentStreak(env, Number(user.id))));
    return json(await getLeaderboard(env));
  }

  if (request.method === "GET" && path === "/api/weekly-challenges") {
    return json(await getWeeklyChallenges(env));
  }

  if (request.method === "GET" && path === "/api/personal-records/leaderboard") {
    return json(await getPersonalRecordBoards(env));
  }

  if (request.method === "PATCH" && path === "/api/personal-records") {
    return handlePersonalRecordUpdate(request, env);
  }

  const badgesMatch = path.match(/^\/api\/badges\/(\d+)$/);
  if (request.method === "GET" && badgesMatch) {
    const userId = Number(badgesMatch[1]);
    await refreshCurrentStreak(env, userId);
    await refreshBadges(env, userId);
    return json(await getBadgesForUser(env, userId));
  }

  const challengesMatch = path.match(/^\/api\/challenges\/(\d+)$/);
  if (request.method === "GET" && challengesMatch) {
    const userId = Number(challengesMatch[1]);
    await refreshChallenges(env, userId);
    const rows = await all(
      env,
      `SELECT c.id, c.title, c.description, c.points, c.metric, c.target, c.muscle_group AS muscleGroup,
              uc.progress, uc.completed
       FROM challenges c
       JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = ?
       ORDER BY c.id`,
      userId
    );

    return json(
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
  }

  const profileMatch = path.match(/^\/api\/profile\/(\d+)$/);
  if (request.method === "GET" && profileMatch) {
    const userId = Number(profileMatch[1]);
    const user = await getUserById(env, userId);
    await refreshCurrentStreak(env, userId);
    await refreshBadges(env, userId);
    const stats = await getStatsByUserId(env, userId);
    if (!user || !stats) return json({ message: "User not found." }, { status: 404 });

    return json({
      user,
      stats,
      rank: getRank(stats.totalPoints),
      badges: await getBadgesForUser(env, userId),
      workoutHistory: await getWorkoutHistory(env, userId, 20),
      personalRecords: (await getPersonalRecords(env, userId)).map((record) => ({
        id: Number(record.id),
        exerciseId: Number(record.exerciseId),
        exerciseName: String(record.exerciseName),
        muscleGroup: String(record.muscleGroup),
        weight: Number(record.weight),
        reps: Number(record.reps),
        achievedAt: String(record.achievedAt)
      }))
    });
  }

  return json({ message: "Route not found." }, { status: 404 });
}

async function saveWorkout(request: Request, env: Env) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: number;
    notes?: string;
    exercises?: Array<{
      exerciseId?: number;
      notes?: string;
      personalRecord?: boolean;
      sets?: Array<Partial<SetEntry>>;
    }>;
  };
  const userId = Number(body.userId);
  const notes = String(body.notes ?? "");
  const user = await getUserById(env, userId);

  if (!user) return json({ message: "Invalid user." }, { status: 400 });

  const normalizedEntries: Array<{
    exercise: ExerciseRecord;
    sets: SetEntry[];
    notes: string;
    personalRecord: boolean;
    completedSets: number;
    recordSet: SetEntry | null;
  }> = [];

  for (const entry of body.exercises ?? []) {
    const exercise = await getExerciseById(env, Number(entry.exerciseId));
    if (!exercise) continue;

    const sets = Array.isArray(entry.sets)
      ? entry.sets.map((set) => ({
          weight: Number(set.weight || 0),
          reps: Number(set.reps || 0),
          completed: Boolean(set.completed)
        }))
      : [];

    normalizedEntries.push({
      exercise,
      sets,
      notes: String(entry.notes ?? ""),
      personalRecord: Boolean(entry.personalRecord),
      completedSets: sets.filter((set) => set.completed).length,
      recordSet: null
    });
  }

  const completedEntries = normalizedEntries.filter((entry) => entry.completedSets > 0);
  if (completedEntries.length === 0) return json({ message: "Complete at least one set before saving." }, { status: 400 });

  let personalRecordCount = 0;
  const now = new Date().toISOString();

  for (const entry of completedEntries) {
    const topSet = entry.sets
      .filter((set) => set.completed)
      .reduce<SetEntry | null>((best, set) => (!best || set.weight > best.weight ? set : best), null);
    const existing = await first<{ weight: number | null }>(
      env,
      "SELECT MAX(weight) AS weight FROM personal_records WHERE user_id = ? AND exercise_id = ?",
      userId,
      entry.exercise.id
    );
    const isRecord = Boolean(entry.personalRecord || (topSet && topSet.weight > Number(existing?.weight ?? 0)));

    if (isRecord && topSet) {
      personalRecordCount += 1;
      entry.recordSet = topSet;
    }

    entry.personalRecord = isRecord;
  }

  const totalCalories = completedEntries.reduce((sum, entry) => sum + entry.exercise.caloriesEstimate, 0);
  const totalPoints = 50 + completedEntries.length * 10 + personalRecordCount * 30;

  const workoutResult = await env.DB.prepare(
    "INSERT INTO workouts (user_id, workout_date, notes, total_points, total_calories) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, now, notes, totalPoints, totalCalories)
    .run();
  const workoutId = Number(workoutResult.meta.last_row_id);

  for (const entry of completedEntries) {
    await env.DB.prepare(
      "INSERT INTO workout_exercises (workout_id, exercise_id, sets, notes, completed_sets, personal_record) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(workoutId, entry.exercise.id, JSON.stringify(entry.sets), entry.notes, entry.completedSets, entry.personalRecord ? 1 : 0)
      .run();

    if (entry.personalRecord && entry.recordSet) {
      await env.DB.prepare("INSERT INTO personal_records (user_id, exercise_id, weight, reps, achieved_at) VALUES (?, ?, ?, ?, ?)")
        .bind(userId, entry.exercise.id, entry.recordSet.weight, entry.recordSet.reps, now)
        .run();
    }
  }

  await env.DB.prepare(
    `UPDATE user_stats
     SET total_points = total_points + ?,
         weekly_points = weekly_points + ?,
         workouts_completed = workouts_completed + 1
     WHERE user_id = ?`
  )
    .bind(totalPoints, totalPoints, userId)
    .run();

  await env.DB.prepare(
    "INSERT OR IGNORE INTO daily_checkins (user_id, checkin_date, points, source, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, dateKey(now), 0, "saved_workout", now)
    .run();

  await refreshCurrentStreak(env, userId);

  await refreshChallenges(env, userId);
  await refreshBadges(env, userId);

  const stats = await getStatsByUserId(env, userId);

  return json(
    {
      workoutId,
      totalPoints,
      totalCalories,
      personalRecordCount,
      stats,
      rank: getRank(stats?.totalPoints ?? 0)
    },
    { status: 201 }
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ message: "Something went wrong in Gym Rival Cloudflare API." }, { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
