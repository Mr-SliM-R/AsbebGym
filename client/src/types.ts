export type User = {
  id: number;
  username: string;
  avatar: string;
  weightGoal: string;
  favoriteMuscleGroup: string;
};

export type Organization = {
  id: number;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt: string;
  createdAt: string;
};

export type Account = {
  id: number;
  userId: number;
  organizationId: number;
  email: string;
  role: string;
  createdAt: string;
};

export type AuthSession = {
  user: User;
  account: Account | null;
  organization: Organization | null;
  token: string;
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

export type WorkoutTemplateExercise = {
  id: number;
  exerciseId: number;
  name: string;
  muscleGroup: string;
  sets: SetEntry[];
  notes: string;
};

export type WorkoutTemplate = {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutTemplateExercise[];
};

export type LastExercisePerformance = {
  exerciseId: number;
  workoutId: number;
  workoutDate: string;
  name: string;
  muscleGroup: string;
  sets: SetEntry[];
  notes: string;
  completedSets: number;
};

export type WorkoutContext = {
  templates: WorkoutTemplate[];
  lastPerformances: LastExercisePerformance[];
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
  todayCheckIn: DailyCheckInStatus;
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
  leaderboard: LeaderboardEntry[];
  weeklyChallenges: WeeklyChallengeSummary;
  badges: Badge[];
  personalRecordBoards: PersonalRecordBoard[];
  monthlyLoser: MonthlyLoser;
  progressCharts: ProgressCharts;
  activityFeed: ActivityFeedItem[];
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
  earnedAt: string | null;
  unlocked: boolean;
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

export type DailyCheckInStatus = {
  completed: boolean;
  date: string;
  points: number;
  createdAt: string | null;
};

export type DailyCheckInResponse = {
  alreadyCheckedIn: boolean;
  pointsAdded?: number;
  todayCheckIn: DailyCheckInStatus;
  stats: UserStats;
  rank: Rank;
  message: string;
};

export type WeeklyChallengeEntry = {
  place: number;
  user: User;
  value: number;
  target: number;
  completed: boolean;
  label: string;
};

export type WeeklyChallenge = {
  id: number;
  title: string;
  description: string;
  points: number;
  metric: string;
  target: number;
  muscleGroup: string | null;
  leaderboard: WeeklyChallengeEntry[];
};

export type WeeklyChallengeSummary = {
  weekStart: string;
  generatedAt: string;
  challenges: WeeklyChallenge[];
};

export type PersonalRecordBoardEntry = {
  place: number | null;
  user: User;
  record: PersonalRecord | null;
  value: number | null;
  displayValue: string;
};

export type PersonalRecordBoard = {
  key: string;
  label: string;
  exerciseId: number | null;
  exerciseName: string;
  metric: string;
  sort: "asc" | "desc" | string;
  records: PersonalRecordBoardEntry[];
};

export type MonthlyLoser = {
  user: User;
  points: number;
  status: string;
  punishments: string[];
};

export type ProgressCharts = {
  volumeByWeek: Array<{
    label: string;
    volume: number;
    workouts: number;
  }>;
  muscleBalance: Array<{
    muscleGroup: string;
    sets: number;
  }>;
  personalRecordTrend: Array<{
    exerciseId: number;
    exerciseName: string;
    muscleGroup: string;
    value: number;
    label: string;
    achievedAt: string;
  }>;
};

export type ActivityFeedItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  user: User;
  createdAt: string;
};

export type PersonalRecordUpdateResponse = {
  message: string;
  record: Omit<PersonalRecord, "id">;
  leaderboards: PersonalRecordBoard[];
};

export type BusinessData = {
  account: Account | null;
  organization: Organization | null;
  members: Array<{
    accountId: number;
    email: string;
    role: string;
    createdAt: string;
    user: User;
  }>;
  invites: Array<{
    id: number;
    email: string;
    code: string;
    role: string;
    expiresAt: string;
    acceptedAt: string | null;
    emailedAt: string | null;
    deliveryStatus: string;
    deliveryError: string | null;
    createdAt: string;
    inviteLink: string;
  }>;
  billing: {
    plan: string;
    status: string;
    trialEndsAt: string;
    checkoutReady: boolean;
  } | null;
  beta: {
    waitlistGroupsTarget: number;
    events: Array<{ eventName: string; count: number }>;
    suggestedPilotCriteria: string[];
  };
  admin: {
    memberCount: number;
    activeMembersThisWeek: number;
    workoutsThisWeek: number;
    workoutsPerActiveMember: number;
    weeklyActiveRate: number;
    inviteCount: number;
    acceptedInvites: number;
    emailedInvites: number;
    inviteConversionRate: number;
    clientErrors: number;
  } | null;
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
