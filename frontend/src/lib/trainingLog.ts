import type { Activity } from '@/data/types';
import { durationToSeconds, personalRecords, PB_DISTANCES } from './analytics';
import { toKm } from './format';
import type { PersonalRecord } from './analytics';

// 训练档案二级页面(日/月/年/总) 的聚合纯函数。
// 参照老前端 ActivityList 的聚合规则重写，风格对齐本文件所在目录既有代码。

const isRun = (a: Activity): boolean => a.type === 'Run';
const yearOf = (a: Activity): number => Number(a.start_date_local.slice(0, 4));
const monthKeyOf = (a: Activity): string => a.start_date_local.slice(0, 7); // YYYY-MM

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

export interface MonthLog {
  month: string; // "2024-03"
  distanceKm: number;
  avgPaceSec: number; // 秒/km，加权(总时长/总距离)
  maxDistanceKm: number; // 当月最长单次
  totalSeconds: number;
  dailyChartValues: { day: number; km: number }[]; // 当月每日里程(day=1~当月天数)
}

const daysInMonth = (year: number, month1to12: number): number =>
  new Date(year, month1to12, 0).getDate();

// 最近 N 个月的月度汇总 (按数据里最新月份倒推，不依赖 Date.now())
export const monthlyLog = (activities: Activity[], months = 6): MonthLog[] => {
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

      let meters = 0;
      let seconds = 0;
      let maxMeters = 0;
      const monthRuns = runs.filter((a) => monthKeyOf(a) === month);
      for (const a of monthRuns) {
        meters += a.distance;
        seconds += durationToSeconds(a.moving_time);
        maxMeters = Math.max(maxMeters, a.distance);
        const day = Number(a.start_date_local.slice(8, 10));
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + a.distance / 1000);
      }

      return {
        month,
        distanceKm: toKm(meters),
        avgPaceSec: meters > 0 ? Math.round(seconds / (meters / 1000)) : 0,
        maxDistanceKm: toKm(maxMeters),
        totalSeconds: seconds,
        dailyChartValues: [...dailyMap.entries()].map(([day, km]) => ({
          day,
          km: Math.round(km * 10) / 10,
        })),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month)); // 时间升序，供图表从左到右展示
};

// ---- 年视图 ----

export interface YearLog {
  year: number;
  distanceKm: number;
  monthlyChartValues: { month: number; km: number }[]; // month=1~12
  personalRecords: PersonalRecord[]; // 该年内各距离档最好成绩
}

export const yearlyLog = (activities: Activity[]): YearLog[] => {
  const runs = activities.filter(isRun);
  const years = [...new Set(runs.map(yearOf))].sort((a, b) => a - b);

  return years.map((year) => {
    const yearRuns = runs.filter((a) => yearOf(a) === year);
    const monthlyMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) monthlyMap.set(m, 0);
    let meters = 0;
    for (const a of yearRuns) {
      meters += a.distance;
      const month = Number(a.start_date_local.slice(5, 7));
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + a.distance / 1000);
    }
    return {
      year,
      distanceKm: toKm(meters),
      monthlyChartValues: [...monthlyMap.entries()].map(([month, km]) => ({
        month,
        km: Math.round(km * 10) / 10,
      })),
      personalRecords: personalRecords(yearRuns),
    };
  });
};

// ---- 总(Lifetime)视图 ----

export interface LifetimeLog {
  totalKm: number;
  totalRuns: number;
  yearlyTrend: { year: number; km: number }[];
  personalRecords: PersonalRecord[]; // 生涯 PB
  milestoneText: string | null; // 里程碑文案，数据太少时为 null
}

const MILESTONE_THRESHOLDS_KM = [500, 1000, 2000, 3000, 5000];

// 生涯累计里程碑文案：取已跨过的最大阈值
const milestoneText = (totalKm: number): string | null => {
  const passed = MILESTONE_THRESHOLDS_KM.filter((t) => totalKm >= t);
  if (!passed.length) return null;
  const latest = Math.max(...passed);
  return `已累计跑过 ${latest}km`;
};

export const lifetimeLog = (activities: Activity[]): LifetimeLog => {
  const runs = activities.filter(isRun);
  const totalMeters = runs.reduce((s, a) => s + a.distance, 0);
  const totalKm = toKm(totalMeters);
  const years = yearlyLog(activities);

  return {
    totalKm,
    totalRuns: runs.length,
    yearlyTrend: years.map((y) => ({ year: y.year, km: y.distanceKm })),
    personalRecords: personalRecords(runs),
    milestoneText: milestoneText(totalKm),
  };
};

// 供组件复用，避免重复 import PB_DISTANCES
export { PB_DISTANCES };
