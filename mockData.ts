import { User, Gameplay, Gender, Platform, SourceType, GameplayStatus, AnalyticsSummary, DailyTrendData, TimezoneData } from './types';

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
  "Europe/Paris",
  "America/Los_Angeles",
  "Asia/Singapore"
];

// Generate a large pool of data once
const generateBaseData = () => {
  const users: User[] = Array.from({ length: 1500 }).map((_, i) => {
    const joinDate = new Date();
    // Distribute joins over the last 120 days to ensure we have enough for 90d range
    joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 120));
    
    return {
      _id: `user_${i}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      gender: Math.random() > 0.4 ? Gender.MALE : Gender.FEMALE,
      cumulativePoints: { total: Math.floor(Math.random() * 5000) },
      inTop10: i < 10,
      isPremium: Math.random() > 0.8,
      premiumPlan: Math.random() > 0.7 ? 'Yearly' : 'Monthly',
      platform: Math.random() > 0.5 ? Platform.ANDROID : Platform.IOS,
      hearts: Math.floor(Math.random() * 5),
      timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)],
      referralCode: `REF${1000 + i}`,
      createdAt: joinDate.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const gameplays: Gameplay[] = Array.from({ length: 4000 }).map((_, i) => {
    const user = users[Math.floor(Math.random() * users.length)];
    const isCompleted = Math.random() > 0.2;
    const playDate = new Date();
    playDate.setDate(playDate.getDate() - Math.floor(Math.random() * 120));
    
    return {
      _id: `gp_${i}`,
      userId: user._id,
      sourceType: Math.random() > 0.3 ? SourceType.CASE : SourceType.DAILY_CHALLENGE,
      caseId: `case_${Math.floor(Math.random() * 20)}`,
      dailyChallengeId: null,
      status: isCompleted ? GameplayStatus.COMPLETED : GameplayStatus.IN_PROGRESS,
      startedAt: playDate.toISOString(),
      completedAt: isCompleted ? new Date(playDate.getTime() + 600000).toISOString() : undefined,
      points: {
        total: 0, diagnosis: 0, tests: 0, treatment: 0, penalties: 0
      },
      createdAt: playDate.toISOString(),
    };
  });

  return { users, gameplays };
};

const baseData = generateBaseData();

export const getAnalyticsSummary = (days: number): AnalyticsSummary => {
  const { users, gameplays } = baseData;
  const today = new Date().toISOString().split('T')[0];
  
  const joinTrend: DailyTrendData[] = [];
  const gameplayTrend: DailyTrendData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const joinedCount = users.filter(u => u.createdAt.startsWith(dateStr)).length;
    joinTrend.push({ date: dateStr, count: joinedCount });
    
    const playedCount = gameplays.filter(gp => gp.startedAt.startsWith(dateStr)).length;
    gameplayTrend.push({ date: dateStr, count: playedCount });
  }

  // Timezone Distribution for all users
  const tzMap = new Map<string, number>();
  users.forEach(u => {
    const tz = u.timezone || "Unknown";
    tzMap.set(tz, (tzMap.get(tz) || 0) + 1);
  });
  const timezoneDistribution: TimezoneData[] = Array.from(tzMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const todaySolvedCases = gameplays.filter(gp => 
    gp.status === GameplayStatus.COMPLETED && 
    gp.completedAt?.startsWith(today)
  ).length;

  return {
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.isPremium).length,
    todaySolvedCases,
    conversionRate: parseFloat(((users.filter(u => u.isPremium).length / users.length) * 100).toFixed(1)),
    platformSplit: [
      { name: 'Android', value: users.filter(u => u.platform === Platform.ANDROID).length },
      { name: 'iOS', value: users.filter(u => u.platform === Platform.IOS).length },
    ],
    genderSplit: [
      { name: 'Male', value: users.filter(u => u.gender === Gender.MALE).length },
      { name: 'Female', value: users.filter(u => u.gender === Gender.FEMALE).length },
    ],
    joinTrend,
    gameplayTrend,
    timezoneDistribution
  };
};

export const mockData = {
  ...baseData,
  getSummary: getAnalyticsSummary
};
