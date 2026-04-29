import type {
  Challenge,
  DashboardData,
  Exercise,
  LeaderboardEntry,
  MetaData,
  ProfileData,
  User,
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
  login: (username: string) =>
    apiRequest<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username })
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
  profile: (userId: number) => apiRequest<ProfileData>(`/api/profile/${userId}`),
  updateAvatar: (userId: number, avatar: string) =>
    apiRequest<{ user: User }>(`/api/users/${userId}/avatar`, {
      method: "PATCH",
      body: JSON.stringify({ avatar })
    })
};
