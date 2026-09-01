import type { Activity, SplitPace } from '@/data/types';
import { durationToSeconds } from './analytics';
import { toKm } from './format';

// 训练档案二级页面(日/月/年/总) 的聚合纯函数。
// 参照老前端 src/components/ActivityList/index.tsx 的聚合规则重写，
// 风格对齐本文件所在目录既有代码。

const isRun = (a: Activity): boolean => a.type === 'Run';
const yearOf = (a: Activity): number => Number(a.start_date_local.slice(0, 4));
const monthKeyOf = (a: Activity): string => a.start_date_local.slice(0, 7); // YYYY-MM

// ---- 训练档案专用 PB 算法 (与 lib/analytics.ts::personalRecords 不同源，
//      仅用于本文件的训练档案聚合，不影响分析页现有的深度分析 Tab) ----

export interface TrainingLogPersonalRecord {
  key: string;
  label: string;
  seconds: number;
  activity: Activity;
}

// 滑动窗口:从单次跑步的 split_paces 里找连续 windowSize 公里的最快配速总和(秒)。
// 对齐老前端 ActivityList/index.tsx:36-69 的 getFastestSplitWindow。
const fastestWindowInActivity = (
  splitPaces: SplitPace[] | null,
  windowSize: number
): number | null => {
  if (!splitPaces || splitPaces.length < windowSize) return null;
  const sorted = [...splitPaces].sort((a, b) => a.km - b.km);
  let best: number | null = null;
  for (let i = 0; i <= sorted.length - windowSize; i++) {
    const total = sorted
      .slice(i, i + windowSize)
      .reduce((s, p) => s + p.pace_seconds, 0);
    if (best === null || total < best) best = total;
  }
  return best;
};

// 跨全部活动求连续 windowSize 公里最快配速(1k/5k/10k 用)。
export const fastestSplitWindow = (
  activities: Activity[],
  windowSize: number
): { seconds: number; activity: Activity } | null => {
  let best: { seconds: number; activity: Activity } | null = null;
  for (const a of activities) {
    if (!isRun(a)) continue;
    const seconds = fastestWindowInActivity(a.split_paces, windowSize);
    if (seconds !== null && (best === null || seconds < best.seconds)) {
      best = { seconds, activity: a };
    }
  }
  return best;
};

// 整次距离容差匹配(半马/全马用)。非对称容差，对齐老前端 getIsMatchingRaceDistance:
// lowerBound = target*0.985, upperBound = target*1.05。targetMeters 为米。
export const matchingRaceDistance = (
  activities: Activity[],
  targetMeters: number,
  lowerRatio = 0.985,
  upperRatio = 1.05
): { seconds: number; activity: Activity } | null => {
  const lo = targetMeters * lowerRatio;
  const hi = targetMeters * upperRatio;
  let best: { seconds: number; activity: Activity } | null = null;
  for (const a of activities) {
    if (!isRun(a) || a.distance < lo || a.distance > hi) continue;
    const seconds = durationToSeconds(a.moving_time);
    if (seconds > 0 && (best === null || seconds < best.seconds)) {
      best = { seconds, activity: a };
    }
  }
  return best;
};

const TRAINING_LOG_PB_SPECS = [
  { key: '1k', label: '1km', kind: 'window' as const, windowSize: 1 },
  { key: '5k', label: '5km', kind: 'window' as const, windowSize: 5 },
  { key: '10k', label: '10km', kind: 'window' as const, windowSize: 10 },
  { key: 'half', label: '半马', kind: 'race' as const, meters: 21097.5 },
  { key: 'full', label: '全马', kind: 'race' as const, meters: 42195 },
];

// 5 档 PB(1k/5k/10k/半马/全马)，供训练档案页(日/月/年/总)专用。
export const trainingLogPersonalRecords = (
  activities: Activity[]
): TrainingLogPersonalRecord[] => {
  const out: TrainingLogPersonalRecord[] = [];
  for (const spec of TRAINING_LOG_PB_SPECS) {
    const found =
      spec.kind === 'window'
        ? fastestSplitWindow(activities, spec.windowSize)
        : matchingRaceDistance(activities, spec.meters);
    if (found) {
      out.push({
        key: spec.key,
        label: spec.label,
        seconds: found.seconds,
        activity: found.activity,
      });
    }
  }
  return out;
};

// 通用 4 项指标(月/年视图共用):总距离/平均配速/最长单次/总时长/次数。
interface PeriodMetrics {
  distanceKm: number;
  avgPaceSec: number;
  maxDistanceKm: number;
  totalSeconds: number;
  count: number;
}

const computePeriodMetrics = (runs: Activity[]): PeriodMetrics => {
  let meters = 0;
  let seconds = 0;
  let maxMeters = 0;
  for (const a of runs) {
    meters += a.distance;
    seconds += durationToSeconds(a.moving_time);
    maxMeters = Math.max(maxMeters, a.distance);
  }
  return {
    distanceKm: toKm(meters),
    avgPaceSec: meters > 0 ? Math.round(seconds / (meters / 1000)) : 0,
    maxDistanceKm: toKm(maxMeters),
    totalSeconds: seconds,
    count: runs.length,
  };
};

// ---- 日视图 ----

// 最近 N 条跑步 (倒序，最新在前)
export const dailyActivities = (
  activities: Activity[],
  limit = 20
): Activity[] =>
  [...activities]
    .filter(isRun)
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local))
    .slice(0, limit);

// ---- 月视图 ----

// 当月训练节奏:最长连跑天数与最长休息间隔。
// 输入为 monthlyLog 产出的 dailyChartValues(day 连续、km=0 表示当天没跑)。
export const streakStats = (
  days: { day: number; km: number }[]
): { longestRun: number; longestGap: number } => {
  let longestRun = 0;
  let longestGap = 0;
  let curRun = 0;
  let curGap = 0;

  for (const d of days) {
    if (d.km > 0) {
      curRun += 1;
      curGap = 0;
      longestRun = Math.max(longestRun, curRun);
    } else {
      curGap += 1;
      curRun = 0;
      longestGap = Math.max(longestGap, curGap);
    }
  }
  return { longestRun, longestGap };
};

export interface MonthLog extends PeriodMetrics {
  month: string; // "2024-03"
  dailyChartValues: { day: number; km: number }[]; // 当月每日里程(day=1~当月天数)
  prevMonthKm: number | null; // 上一相邻月里程,供跨月对比;最早一月为 null
  firstWeekday: number; // 当月 1 号是周几(0=周一 ... 6=周日),日历网格首格偏移用
}

const daysInMonth = (year: number, month1to12: number): number =>
  new Date(year, month1to12, 0).getDate();

// 最近 N 个月的月度汇总 (按数据里最新月份倒推，不依赖 Date.now())
export const monthlyLog = (activities: Activity[], months = 12): MonthLog[] => {
  const runs = activities.filter(isRun);
  if (runs.length === 0) return [];

  const monthKeys = [...new Set(runs.map(monthKeyOf))].sort().reverse();
  const targetMonths = monthKeys.slice(0, months);

  return targetMonths
    .map((month) => {
      const [y, m] = month.split('-').map(Number);
      const dim = daysInMonth(y, m);
      const dailyMap = new Map<number, number>();
      for (let d = 1; d <= dim; d++) dailyMap.set(d, 0);

      const monthRuns = runs.filter((a) => monthKeyOf(a) === month);
      for (const a of monthRuns) {
        const day = Number(a.start_date_local.slice(8, 10));
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + a.distance / 1000);
      }

      // getDay() 0=周日,这里转成 0=周一 ... 6=周日,与日历网格列序一致
      const jsWeekday = new Date(y, m - 1, 1).getDay();

      return {
        month,
        ...computePeriodMetrics(monthRuns),
        dailyChartValues: [...dailyMap.entries()].map(([day, km]) => ({
          day,
          km: Math.round(km * 10) / 10,
        })),
        prevMonthKm: null as number | null,
        firstWeekday: (jsWeekday + 6) % 7,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month)) // 时间升序，供图表从左到右展示
    .map((m, i, all) => ({
      ...m,
      prevMonthKm: i === 0 ? null : all[i - 1].distanceKm,
    }));
};

// ---- 年视图 ----

export interface YearLog extends PeriodMetrics {
  year: number;
  monthlyChartValues: { month: number; km: number }[]; // month=1~12
  personalRecords: TrainingLogPersonalRecord[]; // 该年内各距离档最好成绩
}

export const yearlyLog = (activities: Activity[]): YearLog[] => {
  const runs = activities.filter(isRun);
  const years = [...new Set(runs.map(yearOf))].sort((a, b) => a - b);

  return years.map((year) => {
    const yearRuns = runs.filter((a) => yearOf(a) === year);
    const monthlyMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) monthlyMap.set(m, 0);
    for (const a of yearRuns) {
      const month = Number(a.start_date_local.slice(5, 7));
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + a.distance / 1000);
    }
    return {
      year,
      ...computePeriodMetrics(yearRuns),
      monthlyChartValues: [...monthlyMap.entries()].map(([month, km]) => ({
        month,
        km: Math.round(km * 10) / 10,
      })),
      personalRecords: trainingLogPersonalRecords(yearRuns),
    };
  });
};

// ---- 总(Lifetime)视图 ----

export interface LifetimeLog extends PeriodMetrics {
  yearlyTrend: { year: number; km: number }[];
  personalRecords: TrainingLogPersonalRecord[]; // 生涯 PB
  milestoneText: string; // 里程碑文案(对齐老前端 getLifetimeMilestoneText)
  peakYearText: string; // 峰值年份说明文案
  peakYear: { year: number; km: number } | null; // 历年里程最高的一年
}

// 生涯累计里程碑阈值(km)。对齐老前端 LifetimePeriodCard.tsx 的单阈值二元判断。
const LIFETIME_MILESTONE_KM = 2000;

const milestoneText = (totalKm: number): string => {
  const rounded = Math.floor(totalKm);
  return rounded >= LIFETIME_MILESTONE_KM
    ? `已突破 ${LIFETIME_MILESTONE_KM} km 里程碑`
    : `累计 ${rounded} km，继续冲刺`;
};

const peakYearText = (peakYear: { year: number; km: number } | null): string =>
  peakYear ? `${peakYear.year} 是你的跑量峰值年` : '继续积累你的年度峰值';

export const lifetimeLog = (activities: Activity[]): LifetimeLog => {
  const runs = activities.filter(isRun);
  const metrics = computePeriodMetrics(runs);
  const years = yearlyLog(activities);
  const yearlyTrend = years.map((y) => ({ year: y.year, km: y.distanceKm }));
  const peakYear = yearlyTrend.length
    ? yearlyTrend.reduce((a, b) => (b.km > a.km ? b : a))
    : null;

  return {
    ...metrics,
    yearlyTrend,
    personalRecords: trainingLogPersonalRecords(runs),
    milestoneText: milestoneText(metrics.distanceKm),
    peakYearText: peakYearText(peakYear),
    peakYear,
  };
};
