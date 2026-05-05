import type {
  Challenge,
  AuthSession,
  BusinessData,
  DashboardData,
  DailyCheckInResponse,
  Exercise,
  LeaderboardEntry,
  MetaData,
  PersonalRecordBoard,
  PersonalRecordUpdateResponse,
  ProfileData,
  User,
  WeeklyChallengeSummary,
  WorkoutContext,
  WorkoutHistoryItem
} from "./types";

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "Request failed.");
  }

  return (await response.json()) as T;
}

export const api = {
  users: () => apiRequest<User[]>("/api/users"),
  login: (payload: { username?: string; email?: string; password?: string }) =>
    apiRequest<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  signup: (payload: { email: string; password: string; displayName: string; organizationName: string; inviteCode?: string }) =>
    apiRequest<AuthSession>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  meta: () => apiRequest<MetaData>("/api/meta"),
  dashboard: (userId: number) => apiRequest<DashboardData>(`/api/dashboard/${userId}`),
  exercises: (params?: { group?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.group) query.set("group", params.group);
    if (params?.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<Exercise[]>(`/api/exercises${suffix}`);
  },
  exercise: (id: number) => apiRequest<Exercise>(`/api/exercises/${id}`),
  workouts: (userId: number) => apiRequest<WorkoutHistoryItem[]>(`/api/workouts/${userId}`),
  workoutContext: (userId: number) => apiRequest<WorkoutContext>(`/api/workout-context/${userId}`),
  createWorkoutTemplate: (payload: {
    userId: number;
    name: string;
    exercises: Array<{
      exerciseId: number;
      notes: string;
      sets: Array<{ weight: number; reps: number; completed: boolean }>;
    }>;
  }) =>
    apiRequest<WorkoutContext["templates"][number]>("/api/workout-templates", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteWorkoutTemplate: (templateId: number, userId: number) =>
    apiRequest<{ ok: true }>(`/api/workout-templates/${templateId}?userId=${userId}`, {
      method: "DELETE"
    }),
  dailyCheckIn: (userId: number) =>
    apiRequest<DailyCheckInResponse>("/api/checkins/daily", {
      method: "POST",
      body: JSON.stringify({ userId })
    }),
  saveWorkout: (payload: {
    userId: number;
    notes: string;
    exercises: Array<{
      exerciseId: number;
      notes: string;
      personalRecord: boolean;
      sets: Array<{ weight: number; reps: number; completed: boolean }>;
    }>;
  }) =>
    apiRequest<{
      workoutId: number;
      totalPoints: number;
      totalCalories: number;
      personalRecordCount: number;
    }>("/api/workouts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  leaderboard: () => apiRequest<LeaderboardEntry[]>("/api/leaderboard"),
  challenges: (userId: number) => apiRequest<Challenge[]>(`/api/challenges/${userId}`),
  weeklyChallenges: () => apiRequest<WeeklyChallengeSummary>("/api/weekly-challenges"),
  personalRecordLeaderboards: () => apiRequest<PersonalRecordBoard[]>("/api/personal-records/leaderboard"),
  updatePersonalRecord: (payload: { userId: number; exerciseName: string; value: number; reps?: number }) =>
    apiRequest<PersonalRecordUpdateResponse>("/api/personal-records", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  profile: (userId: number) => apiRequest<ProfileData>(`/api/profile/${userId}`),
  updateAvatar: (userId: number, avatar: string) =>
    apiRequest<{ user: User }>(`/api/users/${userId}/avatar`, {
      method: "PATCH",
      body: JSON.stringify({ avatar })
    }),
  business: (userId: number) => apiRequest<BusinessData>(`/api/business/${userId}`),
  createInvite: (userId: number, email: string) =>
    apiRequest<BusinessData["invites"][number]>(`/api/business/${userId}/invites`, {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  startCheckout: (userId: number) =>
    apiRequest<{ mode: string; message: string; url: string | null; sessionId?: string | null }>(`/api/business/${userId}/billing/checkout`, {
      method: "POST"
    }),
  exportAccount: (userId: number) => apiRequest<unknown>(`/api/account/${userId}/export`),
  deleteAccount: (userId: number) =>
    apiRequest<{ ok: true }>(`/api/account/${userId}`, {
      method: "DELETE"
    }),
  trackBetaEvent: (payload: { userId?: number; eventName: string; metadata?: Record<string, unknown> }) =>
    apiRequest<{ ok: true }>("/api/beta-events", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
