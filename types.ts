export enum Platform {
  ANDROID = 'android',
  IOS = 'ios'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export enum SourceType {
  CASE = 'case',
  DAILY_CHALLENGE = 'dailyChallenge'
}

export enum GameplayStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export type TimeRange = 7 | 30 | 90;

export interface User {
  _id: string;
  name: string;
  email: string;
  gender: Gender;
  cumulativePoints: {
    total: number;
  };
  inTop10: boolean;
  isPremium: boolean;
  premiumExpiresAt?: string;
  premiumPlan?: string;
  platform: Platform;
  hearts: number;
  timezone: string | null;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gameplay {
  _id: string;
  userId: string;
  sourceType: SourceType;
  caseId: string | null;
  dailyChallengeId: string | null;
  status: GameplayStatus;
  startedAt: string;
  completedAt?: string;
  points: {
    total: number;
    diagnosis: number;
    tests: number;
    treatment: number;
    penalties: number;
  };
  createdAt: string;
}

export interface DailyTrendData {
  date: string;
  count: number;
}

export interface TimezoneData {
  name: string;
  value: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  premiumUsers: number;
  todaySolvedCases: number;
  conversionRate: number;
  platformSplit: { name: string; value: number }[];
  genderSplit: { name: string; value: number }[];
  joinTrend: DailyTrendData[];
  gameplayTrend: DailyTrendData[];
  quizTrend: DailyTrendData[];
  timezoneDistribution: TimezoneData[];
}

export interface GameplayDetails {
  _id: string;
  caseId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: string | null;
  score: number;
}

export interface UserDetails {
  user: {
    _id: string;
    name: string;
    email: string;
    gender: string;
    platform: string;
    isPremium: boolean;
    timezone: string | null;
    createdAt: string;
  };
  stats: {
    totalGames: number;
    completedGames: number;
    inProgressGames: number;
    totalTimeMinutes: number;
  };
  gameplays: GameplayDetails[];
}

export interface Case {
  _id: string;
  caseId: string;
  title: string;
  imageUrl: string | null;
  category: string;
  chiefComplaint: string;
}

export interface Category {
  name: string;
  count: number;
}

export interface SendNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}
