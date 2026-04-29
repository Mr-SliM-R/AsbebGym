export type User = {
  id: number;
  username: string;
  avatar: string;
  weightGoal: string;
  favoriteMuscleGroup: string;
};

export type Rank = {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  progress: number;
  nextRank: string;
  pointsToNext: number;
};

export type UserStats = {
  userId: number;
  totalPoints: number;
  weeklyPoints: number;
  workoutsCompleted: number;
  currentStreak: number;
};

export type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | string;
  equipment: string;
  instructions: string[];
  commonMistakes: string[];
  recommendedSets: number;
  recommendedReps: string;
  animationType: string;
  animationAssetKey: string;
  animationMediaType: "image" | "gif" | "video" | "lottie" | "three" | null;
  animationSrc: string | null;
  animationCredit: string | null;
  caloriesEstimate: number;
};

export type SetEntry = {
  weight: number;
  reps: number;
  completed: boolean;
};

export type WorkoutExercise = {
  id: number;
  exerciseId: number;
  name: string;
  muscleGroup: string;
  sets: SetEntry[];
  notes: string;
  completedSets: number;
  personalRecord: boolean;
};

export type WorkoutHistoryItem = {
  id: number;
  workoutDate: string;
  notes: string;
  totalPoints: number;
  totalCalories: number;
  exercises: WorkoutExercise[];
};

export type WeeklyProgress = {
  day: string;
  date: string;
  workouts: number;
  points: number;
  calories: number;
};

export type DashboardData = {
  user: User;
  stats: UserStats;
  rank: Rank;
  todayWorkout: {
    title: string;
    exercises: Exercise[];
  };
  weeklyProgress: WeeklyProgress[];
  friendComparison: {
    user: User;
    stats: UserStats;
    rank: Rank;
  } | null;
  motivationalMessage: string;
  recentWorkouts: WorkoutHistoryItem[];
};

export type Challenge = {
  id: number;
  title: string;
  description: string;
  points: number;
  metric: string;
  target: number;
  muscleGroup: string | null;
  progress: number;
  completed: boolean;
};

export type Badge = {
  id: number;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
};

export type PersonalRecord = {
  id: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  weight: number;
  reps: number;
  achievedAt: string;
};

export type LeaderboardEntry = {
  place: number;
  user: User;
  stats: UserStats;
  rank: Rank;
  personalRecords: PersonalRecord[];
};

export type ProfileData = {
  user: User;
  stats: UserStats;
  rank: Rank;
  badges: Badge[];
  workoutHistory: WorkoutHistoryItem[];
  personalRecords: PersonalRecord[];
};

export type MetaData = {
  categories: string[];
  ranks: Array<{
    name: string;
    minPoints: number;
    maxPoints: number;
    color: string;
  }>;
  pointRules: Array<{
    label: string;
    points: number;
  }>;
};
