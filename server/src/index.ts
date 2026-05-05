import cors from "cors";
import express from "express";
import crypto from "node:crypto";
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
const dailyCheckInPoints = 75;
const punishmentIdeas = ["buy protein shake", "100 pushups", "pay dinner", "post gym selfie", "extra leg day"];

const personalRecordTargets = [
  { key: "bench_press", label: "Bench press", exerciseName: "Bench Press", metric: "kg", sort: "desc" },
  { key: "squat", label: "Squat", exerciseName: "Back Squat", metric: "kg", sort: "desc" },
  { key: "deadlift", label: "Deadlift", exerciseName: "Deadlift", metric: "kg", sort: "desc" },
  { key: "pull_ups", label: "Pull-ups", exerciseName: "Pull-ups", metric: "reps", sort: "desc" },
  { key: "running_time", label: "Running time", exerciseName: "Running Time", metric: "min", sort: "asc" }
] as const;

initializeDatabase();
seedDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: "3mb" }));

const db = getDatabase();
const authSecret = process.env.AUTH_SECRET ?? "dev-only-change-me";
const trialDays = 14;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function signToken(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function mapOrganization(row: Row) {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    plan: String(row.plan),
    subscriptionStatus: String(row.subscriptionStatus ?? row.subscription_status),
    trialEndsAt: String(row.trialEndsAt ?? row.trial_ends_at),
    createdAt: String(row.createdAt ?? row.created_at)
  };
}

function mapAccount(row: Row) {
  return {
    id: Number(row.id),
    userId: Number(row.userId ?? row.user_id),
    organizationId: Number(row.organizationId ?? row.organization_id),
    email: String(row.email),
    role: String(row.role),
    createdAt: String(row.createdAt ?? row.created_at)
  };
}

function getAccountByEmail(email: string) {
  return db
    .prepare(
      `SELECT id, user_id AS userId, organization_id AS organizationId, email, password_hash AS passwordHash,
              password_salt AS passwordSalt, role, created_at AS createdAt
       FROM user_accounts WHERE lower(email) = lower(?)`
    )
    .get(email) as Row | undefined;
}

function getOrganizationById(organizationId: number) {
  const row = db
    .prepare(
      `SELECT id, name, slug, plan, subscription_status AS subscriptionStatus,
              trial_ends_at AS trialEndsAt, created_at AS createdAt
       FROM organizations WHERE id = ?`
    )
    .get(organizationId) as Row | undefined;

  return row ? mapOrganization(row) : null;
}

function createAuthResponse(userId: number, accountRow?: Row) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const account = accountRow ? mapAccount(accountRow) : null;
  const organization = account ? getOrganizationById(account.organizationId) : null;
  const token = signToken({
    userId,
    accountId: account?.id ?? null,
    organizationId: organization?.id ?? null,
    exp: addDays(new Date(), 14).toISOString()
  });

  return { user, account, organization, token };
}

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

function compactUser(user: ReturnType<typeof mapUser>) {
  return {
    ...user,
    avatar: user.avatar.length > 512 ? user.username.slice(0, 1).toUpperCase() : user.avatar
  };
}

function getRank(totalPoints: number) {
  const ranks = getRanks();
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

function calculateCurrentCheckInStreak(userId: number) {
  const rows = db
    .prepare("SELECT checkin_date AS day FROM daily_checkins WHERE user_id = ? ORDER BY checkin_date DESC")
    .all(userId) as { day: string }[];

  if (rows.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (rows[0].day !== dateKey(today) && rows[0].day !== dateKey(yesterday)) {
    return 0;
  }

  let streak = 0;
  const expected = new Date(`${rows[0].day}T00:00:00.000Z`);

  for (const row of rows) {
    if (row.day !== dateKey(expected)) {
      break;
    }

    streak += 1;
    expected.setUTCDate(expected.getUTCDate() - 1);
  }

  return streak;
}

function refreshCurrentStreak(userId: number) {
  const streak = calculateCurrentCheckInStreak(userId);
  db.prepare("UPDATE user_stats SET current_streak = ? WHERE user_id = ?").run(streak, userId);
  return streak;
}

function getTodayCheckIn(userId: number) {
  const today = dateKey(new Date());
  const row = db
    .prepare("SELECT id, points, created_at AS createdAt FROM daily_checkins WHERE user_id = ? AND checkin_date = ?")
    .get(userId, today) as { id: number; points: number; createdAt: string } | undefined;

  return {
    completed: Boolean(row),
    date: today,
    points: Number(row?.points ?? dailyCheckInPoints),
    createdAt: row?.createdAt ?? null
  };
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

function getOrganizationIdForUser(userId: number) {
  const accountRow = db.prepare("SELECT organization_id AS organizationId FROM user_accounts WHERE user_id = ?").get(userId) as Row | undefined;
  return accountRow ? Number(accountRow.organizationId) : null;
}

function getScopedUserIds(userId: number) {
  const organizationId = getOrganizationIdForUser(userId);

  if (!organizationId) {
    const rows = db.prepare("SELECT id FROM users ORDER BY id").all() as Array<{ id: number }>;
    return rows.map((row) => Number(row.id));
  }

  const rows = db.prepare("SELECT user_id AS userId FROM user_accounts WHERE organization_id = ?").all(organizationId) as Array<{ userId: number }>;
  return rows.map((row) => Number(row.userId));
}

function recordBetaEvent(userId: number | null, eventName: string, metadata: Record<string, unknown> = {}) {
  const organizationId = userId ? getOrganizationIdForUser(userId) : null;

  db.prepare("INSERT INTO beta_events (organization_id, user_id, event_name, metadata, created_at) VALUES (?, ?, ?, ?, ?)").run(
    organizationId,
    userId,
    eventName,
    JSON.stringify(metadata),
    new Date().toISOString()
  );
}

function getWorkoutTemplates(userId: number) {
  const templates = db
    .prepare(
      `SELECT id, user_id AS userId, name, created_at AS createdAt, updated_at AS updatedAt
       FROM workout_templates
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC`
    )
    .all(userId) as Row[];
  const entriesStatement = db.prepare(
    `SELECT wte.id, wte.exercise_id AS exerciseId, wte.position, wte.sets, wte.notes,
            e.name, e.muscle_group AS muscleGroup
     FROM workout_template_exercises wte
     JOIN exercises e ON e.id = wte.exercise_id
     WHERE wte.template_id = ?
     ORDER BY wte.position`
  );

  return templates.map((template) => ({
    id: Number(template.id),
    userId: Number(template.userId),
    name: String(template.name),
    createdAt: String(template.createdAt),
    updatedAt: String(template.updatedAt),
    exercises: (entriesStatement.all(Number(template.id)) as Row[]).map((entry) => ({
      id: Number(entry.id),
      exerciseId: Number(entry.exerciseId),
      name: String(entry.name),
      muscleGroup: String(entry.muscleGroup),
      sets: jsonParse<SetEntry[]>(entry.sets, []),
      notes: String(entry.notes ?? "")
    }))
  }));
}

function getWorkoutTemplateById(templateId: number) {
  const row = db
    .prepare("SELECT user_id AS userId FROM workout_templates WHERE id = ?")
    .get(templateId) as { userId: number } | undefined;

  if (!row) {
    return null;
  }

  return getWorkoutTemplates(Number(row.userId)).find((template) => template.id === templateId) ?? null;
}

function getLastExercisePerformances(userId: number) {
  const rows = db
    .prepare(
      `SELECT we.exercise_id AS exerciseId, we.sets, we.notes, we.completed_sets AS completedSets,
              w.id AS workoutId, w.workout_date AS workoutDate,
              e.name, e.muscle_group AS muscleGroup
       FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ?
       ORDER BY w.workout_date DESC, we.id DESC`
    )
    .all(userId) as Row[];
  const seen = new Set<number>();

  return rows.flatMap((row) => {
    const exerciseId = Number(row.exerciseId);

    if (seen.has(exerciseId)) {
      return [];
    }

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

function getProgressCharts(userId: number) {
  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - (7 - index) * 7);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);

    return {
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      start,
      end,
      volume: 0,
      workouts: new Set<number>()
    };
  });
  const startDate = weeks[0].start.toISOString();
  const rows = db
    .prepare(
      `SELECT w.id AS workoutId, w.workout_date AS workoutDate, we.sets, e.muscle_group AS muscleGroup
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id
       WHERE w.user_id = ? AND w.workout_date >= ?`
    )
    .all(userId, startDate) as Row[];
  const muscleSets = new Map<string, number>();

  for (const row of rows) {
    const workoutDate = new Date(String(row.workoutDate));
    const targetWeek = weeks.find((week) => workoutDate >= week.start && workoutDate < week.end);
    const sets = jsonParse<SetEntry[]>(row.sets, []).filter((set) => set.completed);
    const volume = sets.reduce((sum, set) => sum + (Number(set.weight) > 0 ? Number(set.weight) * Number(set.reps) : Number(set.reps)), 0);

    if (targetWeek) {
      targetWeek.volume += volume;
      targetWeek.workouts.add(Number(row.workoutId));
    }

    muscleSets.set(String(row.muscleGroup), (muscleSets.get(String(row.muscleGroup)) ?? 0) + sets.length);
  }

  const prRows = db
    .prepare(
      `SELECT pr.exercise_id AS exerciseId, pr.weight, pr.reps, pr.achieved_at AS achievedAt,
              e.name AS exerciseName, e.muscle_group AS muscleGroup
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = ?
       ORDER BY pr.achieved_at DESC
       LIMIT 10`
    )
    .all(userId) as Row[];

  return {
    volumeByWeek: weeks.map((week) => ({
      label: week.label,
      volume: Math.round(week.volume),
      workouts: week.workouts.size
    })),
    muscleBalance: Array.from(muscleSets.entries())
      .map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
      .sort((left, right) => right.sets - left.sets),
    personalRecordTrend: prRows.map((row) => {
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

function getActivityFeed(userId: number, limit = 20) {
  const scopedIds = getScopedUserIds(userId);
  const placeholders = scopedIds.map(() => "?").join(",");

  if (!placeholders) {
    return [];
  }

  const userSelect = `u.id, u.username, u.avatar, u.weight_goal AS weightGoal, u.favorite_muscle_group AS favoriteMuscleGroup`;
  const workoutRows = db
    .prepare(
      `SELECT 'workout' AS type, w.id, w.workout_date AS createdAt, w.total_points AS totalPoints,
              w.total_calories AS totalCalories, ${userSelect}
       FROM workouts w
       JOIN users u ON u.id = w.user_id
       WHERE w.user_id IN (${placeholders})
       ORDER BY w.workout_date DESC
       LIMIT ?`
    )
    .all(...scopedIds, limit) as Row[];
  const recordRows = db
    .prepare(
      `SELECT 'personal_record' AS type, pr.id, pr.achieved_at AS createdAt, pr.weight, pr.reps,
              e.name AS exerciseName, ${userSelect}
       FROM personal_records pr
       JOIN users u ON u.id = pr.user_id
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id IN (${placeholders})
       ORDER BY pr.achieved_at DESC
       LIMIT ?`
    )
    .all(...scopedIds, limit) as Row[];
  const badgeRows = db
    .prepare(
      `SELECT 'badge' AS type, b.id, ub.earned_at AS createdAt, b.title AS badgeTitle, ${userSelect}
       FROM user_badges ub
       JOIN users u ON u.id = ub.user_id
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id IN (${placeholders})
       ORDER BY ub.earned_at DESC
       LIMIT ?`
    )
    .all(...scopedIds, limit) as Row[];
  const checkinRows = db
    .prepare(
      `SELECT 'checkin' AS type, dc.id, dc.created_at AS createdAt, dc.points, dc.source, ${userSelect}
       FROM daily_checkins dc
       JOIN users u ON u.id = dc.user_id
       WHERE dc.user_id IN (${placeholders})
       ORDER BY dc.created_at DESC
       LIMIT ?`
    )
    .all(...scopedIds, limit) as Row[];

  return [...workoutRows, ...recordRows, ...badgeRows, ...checkinRows]
    .map((row) => {
      const user = compactUser(mapUser(row));
      const type = String(row.type);
      let title = `${user.username} moved`;
      let description = "";

      if (type === "workout") {
        title = `${user.username} completed a workout`;
        description = `+${Number(row.totalPoints)} pts - ${Number(row.totalCalories)} cal`;
      } else if (type === "personal_record") {
        const weight = Number(row.weight);
        title = `${user.username} hit a personal record`;
        description = `${String(row.exerciseName)} - ${weight > 0 ? `${weight}kg x ${Number(row.reps)}` : `${Number(row.reps)} reps`}`;
      } else if (type === "badge") {
        title = `${user.username} unlocked a badge`;
        description = String(row.badgeTitle);
      } else if (type === "checkin") {
        title = `${user.username} checked in`;
        description = Number(row.points) > 0 ? `+${Number(row.points)} pts` : "Workout logged";
      }

      return {
        id: `${type}-${Number(row.id)}-${String(row.createdAt)}`,
        type,
        title,
        description,
        user,
        createdAt: String(row.createdAt)
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

function getBusinessMetrics(organizationId: number) {
  const weekStart = startOfWeek().toISOString();
  const members = db.prepare("SELECT COUNT(*) AS count FROM user_accounts WHERE organization_id = ?").get(organizationId) as { count: number };
  const activeMembers = db
    .prepare(
      `SELECT COUNT(DISTINCT w.user_id) AS count
       FROM workouts w
       JOIN user_accounts ua ON ua.user_id = w.user_id
       WHERE ua.organization_id = ? AND w.workout_date >= ?`
    )
    .get(organizationId, weekStart) as { count: number };
  const workouts = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM workouts w
       JOIN user_accounts ua ON ua.user_id = w.user_id
       WHERE ua.organization_id = ? AND w.workout_date >= ?`
    )
    .get(organizationId, weekStart) as { count: number };
  const invites = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN accepted_at IS NOT NULL THEN 1 ELSE 0 END) AS accepted,
              SUM(CASE WHEN delivery_status = 'queued' THEN 1 ELSE 0 END) AS emailed
       FROM invites
       WHERE organization_id = ?`
    )
    .get(organizationId) as { total: number; accepted: number | null; emailed: number | null };
  const clientErrors = db
    .prepare("SELECT COUNT(*) AS count FROM beta_events WHERE organization_id = ? AND event_name IN ('client_error', 'api_error')")
    .get(organizationId) as { count: number };

  const memberCount = Number(members.count ?? 0);
  const activeCount = Number(activeMembers.count ?? 0);
  const workoutCount = Number(workouts.count ?? 0);
  const inviteCount = Number(invites.total ?? 0);
  const acceptedInvites = Number(invites.accepted ?? 0);

  return {
    memberCount,
    activeMembersThisWeek: activeCount,
    workoutsThisWeek: workoutCount,
    workoutsPerActiveMember: activeCount > 0 ? Number((workoutCount / activeCount).toFixed(1)) : 0,
    weeklyActiveRate: memberCount > 0 ? Math.round((activeCount / memberCount) * 100) : 0,
    inviteCount,
    acceptedInvites,
    emailedInvites: Number(invites.emailed ?? 0),
    inviteConversionRate: inviteCount > 0 ? Math.round((acceptedInvites / inviteCount) * 100) : 0,
    clientErrors: Number(clientErrors.count ?? 0)
  };
}

async function sendInviteEmail({
  email,
  inviteLink,
  organizationName
}: {
  email: string;
  inviteLink: string;
  organizationName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      deliveryStatus: "setup-required",
      emailedAt: null,
      deliveryError: "Set RESEND_API_KEY and EMAIL_FROM to send invite emails."
    };
  }

  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `You're invited to ${organizationName} on Gym Rival`,
        html: `<p>You were invited to join <strong>${organizationName}</strong> on Gym Rival.</p><p><a href="${inviteLink}">Accept the invite</a></p>`,
        text: `You were invited to join ${organizationName} on Gym Rival. Accept the invite: ${inviteLink}`
      })
    });

    if (!result.ok) {
      const errorText = await result.text();
      return {
        deliveryStatus: "failed",
        emailedAt: null,
        deliveryError: errorText.slice(0, 500)
      };
    }

    return {
      deliveryStatus: "queued",
      emailedAt: new Date().toISOString(),
      deliveryError: null
    };
  } catch (error) {
    return {
      deliveryStatus: "failed",
      emailedAt: null,
      deliveryError: error instanceof Error ? error.message : "Invite email failed."
    };
  }
}

async function createStripeCheckoutSession({
  organizationId,
  origin
}: {
  organizationId: number;
  origin: string;
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    return {
      mode: "setup-required",
      message: "Stripe checkout needs STRIPE_SECRET_KEY and STRIPE_PRICE_ID before live billing can start.",
      url: null,
      sessionId: null
    };
  }

  const organizationRow = db
    .prepare("SELECT stripe_customer_id AS stripeCustomerId FROM organizations WHERE id = ?")
    .get(organizationId) as { stripeCustomerId: string | null } | undefined;
  const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${origin}/business?checkout=success`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${origin}/business?checkout=cancelled`;
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(organizationId),
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[organization_id]": String(organizationId)
  });

  if (organizationRow?.stripeCustomerId) {
    body.set("customer", organizationRow.stripeCustomerId);
  }

  const result = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await result.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };

  if (!result.ok || !payload.url || !payload.id) {
    return {
      mode: "stripe-error",
      message: payload.error?.message ?? "Stripe Checkout could not be started.",
      url: null,
      sessionId: null
    };
  }

  db.prepare("UPDATE organizations SET checkout_session_id = ? WHERE id = ?").run(payload.id, organizationId);

  return {
    mode: "stripe-checkout",
    message: "Stripe Checkout session created.",
    url: payload.url,
    sessionId: payload.id
  };
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
  if (stats.currentStreak >= 7) awardBadge(userId, "7-Day Streak");
  if (stats.currentStreak >= 30) awardBadge(userId, "30-Day Streak");
  if (getGroupWorkoutCount(userId, "Chest") >= 3) awardBadge(userId, "Chest Warrior");
  if (getGroupWorkoutCount(userId, "Legs") >= 2) awardBadge(userId, "Leg Day Survivor");
  if (getGroupWorkoutCount(userId, "Cardio") >= 3) awardBadge(userId, "Cardio Machine");
  if (stats.totalPoints >= 1000) awardBadge(userId, "1000 Points");
  if (stats.totalPoints >= 5000) awardBadge(userId, "5000 Points");
}

function getChallengeProgress(userId: number, metric: string, muscleGroup?: string | null) {
  const weekStart = startOfWeek().toISOString();

  if (metric.startsWith("weekly_")) {
    return getWeeklyMetric(userId, metric);
  }

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

function getBadgesForUser(userId: number) {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.description, b.icon, ub.earned_at AS earnedAt
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
       ORDER BY b.id`
    )
    .all(userId) as Row[];

  return rows.map((badge) => ({
    id: Number(badge.id),
    title: String(badge.title),
    description: String(badge.description),
    icon: String(badge.icon),
    earnedAt: badge.earnedAt ? String(badge.earnedAt) : null,
    unlocked: Boolean(badge.earnedAt)
  }));
}

function getExerciseByName(name: string) {
  const row = db
    .prepare(
      `SELECT id, name, muscle_group AS muscleGroup, difficulty, equipment, instructions,
              common_mistakes AS commonMistakes, recommended_sets AS recommendedSets,
              recommended_reps AS recommendedReps, animation_type AS animationType,
              animation_asset_key AS animationAssetKey, animation_media_type AS animationMediaType,
              animation_src AS animationSrc, animation_credit AS animationCredit,
              calories_estimate AS caloriesEstimate
       FROM exercises WHERE lower(name) = lower(?)`
    )
    .get(name) as Row | undefined;

  return row ? mapExercise(row) : undefined;
}

function getPersonalRecordBoards() {
  const users = (
    db
      .prepare("SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id")
      .all() as Row[]
  ).map((row) => compactUser(mapUser(row)));

  return personalRecordTargets.map((target) => {
    const exercise = getExerciseByName(target.exerciseName);
    const records = users.map((user) => {
      const record = exercise
        ? (db
            .prepare(
              `SELECT id, weight, reps, achieved_at AS achievedAt
               FROM personal_records
               WHERE user_id = ? AND exercise_id = ?
               ORDER BY ${target.key === "running_time" ? "weight ASC" : target.key === "pull_ups" ? "reps DESC" : "weight DESC"}, achieved_at DESC
               LIMIT 1`
            )
            .get(user.id, exercise.id) as Row | undefined)
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
    });
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
  });
}

function getWeeklyMetric(userId: number, metric: string) {
  const weekStart = startOfWeek().toISOString();

  if (metric === "weekly_workouts") {
    const workoutRow = db
      .prepare("SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND workout_date >= ?")
      .get(userId, weekStart) as { count: number };
    const checkinRow = db
      .prepare("SELECT COUNT(*) AS count FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?")
      .get(userId, weekStart.slice(0, 10)) as { count: number };
    return Number(workoutRow.count ?? 0) + Number(checkinRow.count ?? 0);
  }

  if (metric === "weekly_points") {
    const workoutRow = db
      .prepare("SELECT SUM(total_points) AS total FROM workouts WHERE user_id = ? AND workout_date >= ?")
      .get(userId, weekStart) as { total: number | null };
    const checkinRow = db
      .prepare("SELECT SUM(points) AS total FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?")
      .get(userId, weekStart.slice(0, 10)) as { total: number | null };
    return Number(workoutRow.total ?? 0) + Number(checkinRow.total ?? 0);
  }

  if (metric === "weekly_chest" || metric === "weekly_cardio") {
    const group = metric === "weekly_chest" ? "Chest" : "Cardio";
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT w.id) AS count
         FROM workouts w
         JOIN workout_exercises we ON we.workout_id = w.id
         JOIN exercises e ON e.id = we.exercise_id
         WHERE w.user_id = ? AND w.workout_date >= ? AND e.muscle_group = ?`
      )
      .get(userId, weekStart, group) as { count: number };
    return Number(row.count ?? 0);
  }

  if (metric === "weekly_no_skip") {
    const row = db
      .prepare("SELECT COUNT(DISTINCT checkin_date) AS count FROM daily_checkins WHERE user_id = ? AND checkin_date >= ?")
      .get(userId, weekStart.slice(0, 10)) as { count: number };
    return Number(row.count ?? 0);
  }

  return 0;
}

function getWeeklyChallenges() {
  const users = (
    db
      .prepare("SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id")
      .all() as Row[]
  ).map((row) => compactUser(mapUser(row)));
  const challengeRows = db
    .prepare("SELECT id, title, description, points, metric, target, muscle_group AS muscleGroup FROM challenges WHERE metric LIKE 'weekly_%' ORDER BY id")
    .all() as Row[];
  const elapsedDays = daysElapsedThisWeek();

  return {
    weekStart: dateKey(startOfWeek()),
    generatedAt: new Date().toISOString(),
    challenges: challengeRows.map((challenge) => {
      const metric = String(challenge.metric);
      const leaderboard = users.map((user) => {
        const value = getWeeklyMetric(user.id, metric);
        const target = metric === "weekly_no_skip" ? elapsedDays : Number(challenge.target);

        return {
          user,
          value,
          target,
          completed: metric === "weekly_no_skip" ? value >= elapsedDays : value >= target,
          label: metric === "weekly_points" ? `${value} pts` : metric === "weekly_no_skip" ? `${value}/${elapsedDays} days` : `${value}`
        };
      });
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
  };
}

function getMonthlyLoser() {
  const monthStart = startOfMonth();
  const nextMonth = startOfNextMonth();
  const users = (
    db
      .prepare("SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup FROM users ORDER BY id")
      .all() as Row[]
  ).map((row) => compactUser(mapUser(row)));
  const rows = users.map((user) => {
    const workoutRow = db
      .prepare("SELECT SUM(total_points) AS total FROM workouts WHERE user_id = ? AND workout_date >= ? AND workout_date < ?")
      .get(user.id, monthStart.toISOString(), nextMonth.toISOString()) as { total: number | null };
    const checkinRow = db
      .prepare("SELECT SUM(points) AS total FROM daily_checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date < ?")
      .get(user.id, dateKey(monthStart), dateKey(nextMonth)) as { total: number | null };

    return {
      user,
      points: Number(workoutRow.total ?? 0) + Number(checkinRow.total ?? 0)
    };
  });
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

function getMotivationalMessage(userId: number) {
  const leaderboard = getLeaderboard();
  const current = leaderboard.find((item) => item.user.id === userId);
  const friend = leaderboard.find((item) => item.user.id !== userId);

  if (!current || !friend) {
    return "Start strong today and make the board move.";
  }

  const streak = Number(current.stats.currentStreak);
  if (streak >= 7) {
    return buildRivalMessage("dashboard", current.user.username, { place: current.place, streak });
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
      user: compactUser(mapUser(row)),
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
  response.json({
    ok: true,
    app: "Gym Rival",
    monitoring: "beta_events",
    integrations: {
      inviteEmail: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      stripeCheckout: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
      authSecretConfigured: authSecret !== "dev-only-change-me"
    }
  });
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
  const email = String(request.body?.email ?? "").trim();
  const password = String(request.body?.password ?? "");
  const username = String(request.body?.username ?? "").trim();

  if (email || password) {
    const accountRow = getAccountByEmail(email);

    if (!accountRow || !password || !verifyPassword(password, String(accountRow.passwordSalt), String(accountRow.passwordHash))) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    response.json(createAuthResponse(Number(accountRow.userId), accountRow));
    return;
  }

  const row = db
    .prepare(
      `SELECT id, username, avatar, weight_goal AS weightGoal, favorite_muscle_group AS favoriteMuscleGroup
       FROM users WHERE lower(username) = lower(?)`
    )
    .get(username) as Row | undefined;

  if (!row) {
    response.status(401).json({ message: "Choose a demo user or sign up with email." });
    return;
  }

  response.json(createAuthResponse(Number(row.id)));
});

app.post("/api/auth/signup", (request, response) => {
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "");
  const displayName = String(request.body?.displayName ?? "").trim();
  const organizationName = String(request.body?.organizationName ?? "").trim();
  const inviteCode = String(request.body?.inviteCode ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  if (password.length < 8) {
    response.status(400).json({ message: "Password must be at least 8 characters." });
    return;
  }

  if (!displayName || (!organizationName && !inviteCode)) {
    response.status(400).json({ message: "Display name and group name are required." });
    return;
  }

  if (getAccountByEmail(email)) {
    response.status(409).json({ message: "An account already exists for this email." });
    return;
  }

  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);
  const inviteRow = inviteCode
    ? (db
        .prepare(
          `SELECT i.id, i.organization_id AS organizationId, i.email, i.role, i.expires_at AS expiresAt, i.accepted_at AS acceptedAt,
                  o.name AS organizationName
           FROM invites i
           JOIN organizations o ON o.id = i.organization_id
           WHERE i.code = ?`
        )
        .get(inviteCode) as Row | undefined)
    : undefined;

  if (inviteCode) {
    if (!inviteRow || inviteRow.acceptedAt || new Date(String(inviteRow.expiresAt)).getTime() < Date.now()) {
      response.status(400).json({ message: "Invite link is invalid or expired." });
      return;
    }

    if (String(inviteRow.email).toLowerCase() !== email) {
      response.status(400).json({ message: "Use the email address that received this invite." });
      return;
    }
  }

  db.exec("BEGIN TRANSACTION;");

  try {
    let organizationId = inviteRow ? Number(inviteRow.organizationId) : 0;
    let accountRole = inviteRow ? String(inviteRow.role) : "owner";

    if (!organizationId) {
      const orgSlugBase = slugify(organizationName) || "gym";
      const orgSlug = `${orgSlugBase}-${crypto.randomBytes(3).toString("hex")}`;
      const orgResult = db
        .prepare(
          `INSERT INTO organizations (name, slug, plan, subscription_status, trial_ends_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(organizationName, orgSlug, "trial", "trialing", addDays(new Date(), trialDays).toISOString(), now);
      organizationId = Number(orgResult.lastInsertRowid);
      accountRole = "owner";
    }

    const userResult = db
      .prepare("INSERT INTO users (username, avatar, weight_goal, favorite_muscle_group) VALUES (?, ?, ?, ?)")
      .run(displayName, displayName.slice(0, 1).toUpperCase(), "Build consistency", "Chest");
    const userId = Number(userResult.lastInsertRowid);

    db.prepare("INSERT INTO user_stats (user_id, total_points, weekly_points, workouts_completed, current_streak) VALUES (?, 0, 0, 0, 0)").run(
      userId
    );
    const accountResult = db
      .prepare(
        `INSERT INTO user_accounts (user_id, organization_id, email, password_hash, password_salt, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, organizationId, email, hash, salt, accountRole, now);

    if (inviteRow) {
      db.prepare("UPDATE invites SET accepted_at = ? WHERE id = ?").run(now, Number(inviteRow.id));
    }

    db.prepare("INSERT INTO beta_events (organization_id, user_id, event_name, metadata, created_at) VALUES (?, ?, ?, ?, ?)").run(
      organizationId,
      userId,
      inviteRow ? "invite_signup" : "signup",
      JSON.stringify({ source: "web", inviteCode: inviteRow ? inviteCode : null }),
      now
    );

    db.exec("COMMIT;");
    const accountRow = db
      .prepare(
        `SELECT id, user_id AS userId, organization_id AS organizationId, email, password_hash AS passwordHash,
                password_salt AS passwordSalt, role, created_at AS createdAt
         FROM user_accounts WHERE id = ?`
      )
      .get(Number(accountResult.lastInsertRowid)) as Row;
    response.status(201).json(createAuthResponse(userId, accountRow));
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
});

app.get("/api/business/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  const accountRow = db
    .prepare(
      `SELECT id, user_id AS userId, organization_id AS organizationId, email, role, created_at AS createdAt
       FROM user_accounts WHERE user_id = ?`
    )
    .get(userId) as Row | undefined;

  const organization = accountRow ? getOrganizationById(Number(accountRow.organizationId)) : null;
  const organizationId = organization?.id ?? null;
  const invites = organizationId
    ? (db
        .prepare(
          `SELECT id, email, code, role, expires_at AS expiresAt, accepted_at AS acceptedAt, created_at AS createdAt
           , emailed_at AS emailedAt, delivery_status AS deliveryStatus, delivery_error AS deliveryError
           FROM invites WHERE organization_id = ? ORDER BY created_at DESC LIMIT 20`
        )
        .all(organizationId) as Row[])
    : [];
  const members = organizationId
    ? (db
        .prepare(
          `SELECT ua.id AS accountId, ua.email, ua.role, ua.created_at AS createdAt,
                  u.id, u.username, u.avatar, u.weight_goal AS weightGoal, u.favorite_muscle_group AS favoriteMuscleGroup
           FROM user_accounts ua
           JOIN users u ON u.id = ua.user_id
           WHERE ua.organization_id = ?
           ORDER BY ua.created_at`
        )
        .all(organizationId) as Row[])
    : [];
  const eventRows = organizationId
    ? (db
        .prepare(
          `SELECT event_name AS eventName, COUNT(*) AS count
           FROM beta_events
           WHERE organization_id = ?
           GROUP BY event_name
           ORDER BY count DESC`
        )
        .all(organizationId) as Row[])
    : [];

  response.json({
    account: accountRow ? mapAccount(accountRow) : null,
    organization,
    members: members.map((row) => ({
      accountId: Number(row.accountId),
      email: String(row.email),
      role: String(row.role),
      createdAt: String(row.createdAt),
      user: mapUser(row)
    })),
    invites: invites.map((row) => ({
      id: Number(row.id),
      email: String(row.email),
      code: String(row.code),
      role: String(row.role),
      expiresAt: String(row.expiresAt),
      acceptedAt: row.acceptedAt ? String(row.acceptedAt) : null,
      createdAt: String(row.createdAt),
      emailedAt: row.emailedAt ? String(row.emailedAt) : null,
      deliveryStatus: String(row.deliveryStatus ?? "not_sent"),
      deliveryError: row.deliveryError ? String(row.deliveryError) : null,
      inviteLink: `/login?invite=${row.code}`
    })),
    billing: organization
      ? {
          plan: organization.plan,
          status: organization.subscriptionStatus,
          trialEndsAt: organization.trialEndsAt,
          checkoutReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
        }
      : null,
    beta: {
      waitlistGroupsTarget: 5,
      events: eventRows.map((row) => ({ eventName: String(row.eventName), count: Number(row.count) })),
      suggestedPilotCriteria: ["3-5 active groups", "60% weekly active members", "2+ workouts per user per week", "clear willingness to pay"]
    },
    admin: organizationId ? getBusinessMetrics(organizationId) : null
  });
});

app.post("/api/business/:userId/invites", async (request, response) => {
  const userId = Number(request.params.userId);
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const accountRow = db.prepare("SELECT organization_id AS organizationId, role FROM user_accounts WHERE user_id = ?").get(userId) as
    | Row
    | undefined;

  if (!accountRow || !["owner", "admin"].includes(String(accountRow.role))) {
    response.status(403).json({ message: "Only group admins can create invites." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ message: "Enter a valid invite email." });
    return;
  }

  const code = crypto.randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = addDays(new Date(), 14).toISOString();
  const organization = getOrganizationById(Number(accountRow.organizationId));
  const origin = `${request.protocol}://${request.get("host")}`;
  const inviteLink = `${process.env.PUBLIC_APP_URL ?? origin}/login?invite=${code}`;
  const delivery = await sendInviteEmail({
    email,
    inviteLink,
    organizationName: organization?.name ?? "Gym Rival"
  });
  const result = db
    .prepare(
      `INSERT INTO invites (organization_id, email, code, role, expires_at, emailed_at, delivery_status, delivery_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(accountRow.organizationId),
      email,
      code,
      "member",
      expiresAt,
      delivery.emailedAt,
      delivery.deliveryStatus,
      delivery.deliveryError,
      now
    );

  recordBetaEvent(userId, "invite_created", { email, deliveryStatus: delivery.deliveryStatus });

  response.status(201).json({
    id: Number(result.lastInsertRowid),
    email,
    code,
    role: "member",
    expiresAt,
    acceptedAt: null,
    emailedAt: delivery.emailedAt,
    deliveryStatus: delivery.deliveryStatus,
    deliveryError: delivery.deliveryError,
    createdAt: now,
    inviteLink: `/login?invite=${code}`
  });
});

app.post("/api/business/:userId/billing/checkout", async (request, response) => {
  const userId = Number(request.params.userId);
  const accountRow = db.prepare("SELECT organization_id AS organizationId, role FROM user_accounts WHERE user_id = ?").get(userId) as Row | undefined;

  if (!accountRow) {
    response.status(400).json({ message: "Create an account before starting billing." });
    return;
  }

  if (!["owner", "admin"].includes(String(accountRow.role))) {
    response.status(403).json({ message: "Only group admins can manage billing." });
    return;
  }

  const origin = `${request.protocol}://${request.get("host")}`;
  const result = await createStripeCheckoutSession({
    organizationId: Number(accountRow.organizationId),
    origin
  });

  recordBetaEvent(userId, "checkout_started", { mode: result.mode });
  response.json(result);
});

app.get("/api/account/:userId/export", (request, response) => {
  const userId = Number(request.params.userId);
  const user = getUserById(userId);

  if (!user) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  response.json({
    exportedAt: new Date().toISOString(),
    user,
    profile: {
      stats: getStatsByUserId(userId),
      workouts: getWorkoutHistory(userId, 100),
      templates: getWorkoutTemplates(userId),
      progressCharts: getProgressCharts(userId),
      badges: getBadgesForUser(userId),
      personalRecords: getPersonalRecords(userId)
    }
  });
});

app.delete("/api/account/:userId", (request, response) => {
  const userId = Number(request.params.userId);

  if (!getUserById(userId)) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  response.json({ ok: true });
});

app.post("/api/beta-events", (request, response) => {
  const userId = Number(request.body?.userId ?? 0) || null;
  const eventName = String(request.body?.eventName ?? "").trim();
  const metadata = request.body?.metadata && typeof request.body.metadata === "object" ? request.body.metadata : {};

  if (!eventName) {
    response.status(400).json({ message: "Event name is required." });
    return;
  }

  const accountRow = userId ? (db.prepare("SELECT organization_id AS organizationId FROM user_accounts WHERE user_id = ?").get(userId) as Row | undefined) : null;
  db.prepare("INSERT INTO beta_events (organization_id, user_id, event_name, metadata, created_at) VALUES (?, ?, ?, ?, ?)").run(
    accountRow ? Number(accountRow.organizationId) : null,
    userId,
    eventName,
    JSON.stringify(metadata),
    new Date().toISOString()
  );
  response.status(201).json({ ok: true });
});

app.patch("/api/users/:userId/avatar", (request, response) => {
  const userId = Number(request.params.userId);
  const avatar = String(request.body?.avatar ?? "").trim();

  if (!getUserById(userId)) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  if (!avatar || avatar.length > 2_200_000 || !/^(data:image\/|https?:\/\/|\/|[A-Za-z0-9]{1,3}$)/i.test(avatar)) {
    response.status(400).json({ message: "Invalid profile picture." });
    return;
  }

  db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, userId);
  response.json({ user: getUserById(userId) });
});

app.get("/api/meta", (_request, response) => {
  response.json({
    categories: getCategories(),
    ranks: getRanks(),
    pointRules: [
      { label: "Daily workout check-in", points: dailyCheckInPoints },
      { label: "Complete workout", points: 50 },
      { label: "Complete exercise", points: 10 },
      { label: "Personal record", points: 30 },
      { label: "7-day streak badge", points: 0 },
      { label: "Weekly challenge completed", points: 150 }
    ]
  });
});

app.get("/api/dashboard/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  const user = getUserById(userId);

  if (!user) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  refreshCurrentStreak(userId);
  refreshBadges(userId);
  const stats = getStatsByUserId(userId);

  if (!stats) {
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
       ORDER BY s.total_points DESC
       LIMIT 1`
    )
    .get(userId) as Row | undefined;

  response.json({
    user: compactUser(user),
    stats,
    rank: getRank(stats.totalPoints),
    todayWorkout: getSuggestedWorkout(userId),
    weeklyProgress: getWeeklyProgress(userId),
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
    motivationalMessage: getMotivationalMessage(userId),
    recentWorkouts: getWorkoutHistory(userId, 3),
    todayCheckIn: getTodayCheckIn(userId),
    leaderboard: getLeaderboard(),
    weeklyChallenges: getWeeklyChallenges(),
    badges: getBadgesForUser(userId),
    personalRecordBoards: getPersonalRecordBoards(),
    monthlyLoser: getMonthlyLoser(),
    progressCharts: getProgressCharts(userId),
    activityFeed: getActivityFeed(userId, 12)
  });
});

app.get("/api/dashboard-summary/:userId", (request, response) => {
  response.redirect(307, `/api/dashboard/${request.params.userId}`);
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

app.get("/api/workout-context/:userId", (request, response) => {
  const userId = Number(request.params.userId);

  if (!getUserById(userId)) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  response.json({
    templates: getWorkoutTemplates(userId),
    lastPerformances: getLastExercisePerformances(userId)
  });
});

app.post("/api/workout-templates", (request, response) => {
  const userId = Number(request.body?.userId);
  const name = String(request.body?.name ?? "").trim();
  const entries = (Array.isArray(request.body?.exercises) ? request.body.exercises : []) as Row[];

  if (!getUserById(userId)) {
    response.status(400).json({ message: "Invalid user." });
    return;
  }

  if (!name) {
    response.status(400).json({ message: "Template name is required." });
    return;
  }

  const normalizedEntries = entries.flatMap((entry, index) => {
    const exercise = getExerciseById(Number(entry.exerciseId));
    const sets = Array.isArray(entry.sets)
      ? (entry.sets as Row[]).map((set) => ({
          weight: Number(set.weight || 0),
          reps: Number(set.reps || 0),
          completed: false
        }))
      : [];

    return exercise
      ? [
          {
            exerciseId: exercise.id,
            position: index + 1,
            notes: String(entry.notes ?? ""),
            sets:
              sets.length > 0
                ? sets
                : Array.from({ length: Math.min(Math.max(exercise.recommendedSets, 1), 5) }, () => ({
                    weight: 0,
                    reps: Number(exercise.recommendedReps.match(/\d+/)?.[0] ?? 10),
                    completed: false
                  }))
          }
        ]
      : [];
  });

  if (normalizedEntries.length === 0) {
    response.status(400).json({ message: "Add at least one exercise to save a template." });
    return;
  }

  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION;");

  try {
    const templateResult = db
      .prepare("INSERT INTO workout_templates (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(userId, name.slice(0, 80), now, now);
    const templateId = Number(templateResult.lastInsertRowid);
    const insertEntry = db.prepare(
      "INSERT INTO workout_template_exercises (template_id, exercise_id, position, sets, notes) VALUES (?, ?, ?, ?, ?)"
    );

    for (const entry of normalizedEntries) {
      insertEntry.run(templateId, entry.exerciseId, entry.position, JSON.stringify(entry.sets), entry.notes);
    }

    db.exec("COMMIT;");
    recordBetaEvent(userId, "template_created", { templateId, exerciseCount: normalizedEntries.length });
    response.status(201).json(getWorkoutTemplateById(templateId));
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
});

app.delete("/api/workout-templates/:templateId", (request, response) => {
  const templateId = Number(request.params.templateId);
  const userId = Number(request.query.userId ?? 0);
  const row = db.prepare("SELECT user_id AS userId FROM workout_templates WHERE id = ?").get(templateId) as { userId: number } | undefined;

  if (!row) {
    response.status(404).json({ message: "Template not found." });
    return;
  }

  if (Number(row.userId) !== userId) {
    response.status(403).json({ message: "You can only delete your own templates." });
    return;
  }

  db.prepare("DELETE FROM workout_templates WHERE id = ?").run(templateId);
  recordBetaEvent(userId, "template_deleted", { templateId });
  response.json({ ok: true });
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

    db.prepare(
      "INSERT OR IGNORE INTO daily_checkins (user_id, checkin_date, points, source, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, dateKey(now), 0, "saved_workout", now);

    refreshCurrentStreak(userId);

    refreshChallenges(userId);
    refreshBadges(userId);

    db.exec("COMMIT;");
    recordBetaEvent(userId, "workout_saved", {
      workoutId,
      exerciseCount: completedEntries.length,
      totalPoints,
      personalRecordCount
    });

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

app.post("/api/checkins/daily", (request, response) => {
  const userId = Number(request.body?.userId);
  const user = getUserById(userId);

  if (!user) {
    response.status(400).json({ message: "Invalid user." });
    return;
  }

  const today = dateKey(new Date());
  const existing = db
    .prepare("SELECT id FROM daily_checkins WHERE user_id = ? AND checkin_date = ?")
    .get(userId, today) as { id: number } | undefined;

  if (existing) {
    const streak = refreshCurrentStreak(userId);
    const stats = getStatsByUserId(userId);
    response.json({
      alreadyCheckedIn: true,
      todayCheckIn: getTodayCheckIn(userId),
      stats,
      rank: getRank(stats?.totalPoints ?? 0),
      message: buildRivalMessage("duplicate-checkin", user.username, { streak })
    });
    return;
  }

  db.prepare(
    "INSERT INTO daily_checkins (user_id, checkin_date, points, source, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, today, dailyCheckInPoints, "daily_button", new Date().toISOString());
  db.prepare(
    `UPDATE user_stats
     SET total_points = total_points + ?,
         weekly_points = weekly_points + ?,
         workouts_completed = workouts_completed + 1
     WHERE user_id = ?`
  ).run(dailyCheckInPoints, dailyCheckInPoints, userId);

  const streak = refreshCurrentStreak(userId);
  refreshBadges(userId);
  const stats = getStatsByUserId(userId);
  recordBetaEvent(userId, "daily_checkin", { streak });

  response.status(201).json({
    alreadyCheckedIn: false,
    pointsAdded: dailyCheckInPoints,
    todayCheckIn: getTodayCheckIn(userId),
    stats,
    rank: getRank(stats?.totalPoints ?? 0),
    message: buildRivalMessage("daily-checkin", user.username, { streak })
  });
});

app.get("/api/leaderboard", (_request, response) => {
  const users = db.prepare("SELECT id FROM users").all() as Array<{ id: number }>;
  users.forEach((user) => refreshCurrentStreak(Number(user.id)));
  response.json(getLeaderboard());
});

app.get("/api/weekly-challenges", (_request, response) => {
  response.json(getWeeklyChallenges());
});

app.get("/api/personal-records/leaderboard", (_request, response) => {
  response.json(getPersonalRecordBoards());
});

app.patch("/api/personal-records", (request, response) => {
  const userId = Number(request.body?.userId);
  const value = Number(request.body?.value);
  const reps = Number(request.body?.reps ?? 1);
  const user = getUserById(userId);

  if (!user) {
    response.status(400).json({ message: "Invalid user." });
    return;
  }

  if (!Number.isFinite(value) || value <= 0) {
    response.status(400).json({ message: "Record value must be greater than zero." });
    return;
  }

  const exercise = request.body?.exerciseId
    ? getExerciseById(Number(request.body.exerciseId))
    : getExerciseByName(String(request.body?.exerciseName ?? ""));

  if (!exercise) {
    response.status(404).json({ message: "Exercise not found." });
    return;
  }

  const target = personalRecordTargets.find((item) => item.exerciseName === exercise.name);
  const recordWeight = target?.key === "pull_ups" ? 0 : value;
  const recordReps = target?.key === "pull_ups" ? Math.round(value) : Math.max(1, Math.round(reps));
  const now = new Date().toISOString();

  db.prepare("DELETE FROM personal_records WHERE user_id = ? AND exercise_id = ?").run(userId, exercise.id);
  db.prepare("INSERT INTO personal_records (user_id, exercise_id, weight, reps, achieved_at) VALUES (?, ?, ?, ?, ?)").run(
    userId,
    exercise.id,
    recordWeight,
    recordReps,
    now
  );

  refreshBadges(userId);
  recordBetaEvent(userId, "personal_record", { exerciseId: exercise.id, value: recordWeight, reps: recordReps });

  response.json({
    message: buildRivalMessage("record", user.username),
    record: {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weight: recordWeight,
      reps: recordReps,
      achievedAt: now
    },
    leaderboards: getPersonalRecordBoards()
  });
});

app.get("/api/badges/:userId", (request, response) => {
  const userId = Number(request.params.userId);
  refreshCurrentStreak(userId);
  refreshBadges(userId);
  response.json(getBadgesForUser(userId));
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
  refreshCurrentStreak(userId);
  refreshBadges(userId);
  const stats = getStatsByUserId(userId);

  if (!user || !stats) {
    response.status(404).json({ message: "User not found." });
    return;
  }

  response.json({
    user,
    stats,
    rank: getRank(stats.totalPoints),
    badges: getBadgesForUser(userId),
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

app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  try {
    recordBetaEvent(null, "api_error", {
      path: request.path,
      message: error instanceof Error ? error.message : "Unknown API error."
    });
  } catch {
    // Keep the error handler from throwing while reporting telemetry.
  }
  response.status(500).json({ message: "Something went wrong in Gym Rival API." });
});

app.listen(PORT, () => {
  console.log(`Gym Rival API running on http://localhost:${PORT}`);
});
