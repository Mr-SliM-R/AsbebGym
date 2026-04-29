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

const categories = ["Legs", "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Abs", "Cardio", "Full Body"];

const ranks = [
  { name: "Bronze", minPoints: 0, maxPoints: 499, color: "#f59e0b" },
  { name: "Silver", minPoints: 500, maxPoints: 1199, color: "#cbd5e1" },
  { name: "Gold", minPoints: 1200, maxPoints: 2199, color: "#facc15" },
  { name: "Platinum", minPoints: 2200, maxPoints: 3499, color: "#67e8f9" },
  { name: "Diamond", minPoints: 3500, maxPoints: 5299, color: "#38bdf8" },
  { name: "Master", minPoints: 5300, maxPoints: 7499, color: "#fb7185" },
  { name: "Legend", minPoints: 7500, maxPoints: 999999, color: "#a78bfa" }
];

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
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
  if ((await getGroupWorkoutCount(env, userId, "Legs")) >= 2) await awardBadge(env, userId, "Leg Beast");
  if ((await getGroupWorkoutCount(env, userId, "Chest")) >= 2) await awardBadge(env, userId, "Chest Warrior");
  if ((await getGroupWorkoutCount(env, userId, "Back")) >= 2) await awardBadge(env, userId, "Back Monster");
  if ((await getGroupWorkoutCount(env, userId, "Abs")) >= 3) await awardBadge(env, userId, "Abs Machine");
  if (stats.currentStreak >= 5) await awardBadge(env, userId, "5-Day Streak");

  const records = await first<{ count: number }>(env, "SELECT COUNT(*) AS count FROM personal_records WHERE user_id = ?", userId);
  if (Number(records?.count ?? 0) > 0) await awardBadge(env, userId, "Personal Record King");
  if ((await getChallengeProgress(env, userId, "workouts")) >= 4) await awardBadge(env, userId, "Consistency Master");
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
        user: mapUser(row),
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

  const difference = current.stats.totalPoints - friend.stats.totalPoints;
  if (difference > 0) return `You are ahead by ${difference} points. Protect the lead with one clean session.`;
  if (difference < 0) return `${friend.user.username} is ahead by ${Math.abs(difference)} points. A focused workout closes the gap fast.`;
  return "You are tied. The next completed set matters.";
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

    if (!row) return json({ message: "Only Slim and Friend can log in." }, { status: 401 });
    return json({ user: mapUser(row) });
  }

  if (request.method === "GET" && path === "/api/meta") {
    return json({
      categories,
      ranks,
      pointRules: [
        { label: "Complete workout", points: 50 },
        { label: "Complete exercise", points: 10 },
        { label: "Personal record", points: 30 },
        { label: "5-day streak", points: 100 },
        { label: "Weekly challenge completed", points: 150 }
      ]
    });
  }

  const dashboardMatch = path.match(/^\/api\/dashboard\/(\d+)$/);
  if (request.method === "GET" && dashboardMatch) {
    const userId = Number(dashboardMatch[1]);
    const user = await getUserById(env, userId);
    const stats = await getStatsByUserId(env, userId);

    if (!user || !stats) return json({ message: "User not found." }, { status: 404 });

    const friendRow = await first(
      env,
      `SELECT u.id, u.username, u.avatar, u.weight_goal AS weightGoal,
              u.favorite_muscle_group AS favoriteMuscleGroup,
              s.total_points AS totalPoints, s.weekly_points AS weeklyPoints,
              s.workouts_completed AS workoutsCompleted, s.current_streak AS currentStreak
       FROM users u
       JOIN user_stats s ON s.user_id = u.id
       WHERE u.id != ?
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
      motivationalMessage: await getMotivationalMessage(env, userId),
      recentWorkouts: await getWorkoutHistory(env, userId, 3)
    });
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

  if (request.method === "POST" && path === "/api/workouts") {
    return saveWorkout(request, env);
  }

  if (request.method === "GET" && path === "/api/leaderboard") {
    return json(await getLeaderboard(env));
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
    const stats = await getStatsByUserId(env, userId);
    if (!user || !stats) return json({ message: "User not found." }, { status: 404 });

    const badges = await all(
      env,
      `SELECT b.id, b.title, b.description, b.icon, ub.earned_at AS earnedAt
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = ?
       ORDER BY ub.earned_at DESC`,
      userId
    );

    return json({
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

  const previousStats = await getStatsByUserId(env, userId);
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

  const streak = await calculateCurrentStreak(env, userId);
  await env.DB.prepare("UPDATE user_stats SET current_streak = ? WHERE user_id = ?").bind(streak, userId).run();

  if ((previousStats?.currentStreak ?? 0) < 5 && streak >= 5) {
    await env.DB.prepare(
      `UPDATE user_stats
       SET total_points = total_points + 100,
           weekly_points = weekly_points + 100
       WHERE user_id = ?`
    )
      .bind(userId)
      .run();
  }

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
