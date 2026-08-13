import type { Activity } from '@/data/types';
import { toKm } from './format';
import { durationToSeconds } from './analytics';

// 派生统计 (纯函数)。距离/次数口径：仅 type === 'Run'。

// 年度目标里程 (km)。纯前端约定，无后端配置。
export const ANNUAL_GOAL_KM = 1000;

const isRun = (a: Activity): boolean => a.type === 'Run';
const yearOf = (a: Activity): number => Number(a.start_date_local.slice(0, 4));

export interface OverallStats {
  totalDistanceKm: number; // 累计跑步距离
  totalRuns: number; // 跑步总次数
  thisYearKm: number; // 指定年跑步距离
  longestRunKm: number; // 最长单次跑步
}

export const overallStats = (
  activities: Activity[],
  year: number
): OverallStats => {
  const runs = activities.filter(isRun);
  const totalMeters = runs.reduce((s, a) => s + a.distance, 0);
  const yearMeters = runs
    .filter((a) => yearOf(a) === year)
    .reduce((s, a) => s + a.distance, 0);
  const longestMeters = runs.reduce((m, a) => Math.max(m, a.distance), 0);
  return {
    totalDistanceKm: toKm(totalMeters),
    totalRuns: runs.length,
    thisYearKm: toKm(yearMeters),
    longestRunKm: toKm(longestMeters),
  };
};

// 逐日跑步聚合 (某年)。key = YYYY-MM-DD。
export interface DayCell {
  date: string;
  count: number;
  distanceKm: number;
}

export const heatmapByDay = (
  activities: Activity[],
  year: number
): Map<string, DayCell> => {
  const map = new Map<string, DayCell>();
  for (const a of activities) {
    if (!isRun(a) || yearOf(a) !== year) continue;
    const date = a.start_date_local.slice(0, 10); // YYYY-MM-DD
    const prev = map.get(date);
    const km = a.distance / 1000;
    if (prev) {
      map.set(date, {
        date,
        count: prev.count + 1,
        distanceKm: Math.round((prev.distanceKm + km) * 10) / 10,
      });
    } else {
      map.set(date, { date, count: 1, distanceKm: Math.round(km * 10) / 10 });
    }
  }
  return map;
};

// 当日跑步距离 (km)→ 热力档位 0~5。阈值按数据分布定，写死便于测试。
export const heatLevel = (distanceKm: number): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (distanceKm <= 0) return 0;
  if (distanceKm < 3) return 1;
  if (distanceKm < 6) return 2;
  if (distanceKm < 10) return 3;
  if (distanceKm < 15) return 4;
  return 5;
};

// 逐年聚合 (英雄区右半三年对比用)。仅 Run。年份升序。
export interface YearStat {
  year: number;
  km: number; // 该年里程
  runs: number; // 该年次数
  avgPaceSec: number; // 平均配速 秒/km = 总时长 / 总距离 (非各次算术平均，避免距离权重失真)
  avgHr: number | null; // 平均心率 (各次均值的算术平均，无心率数据则 null)
}

export const statsByYear = (activities: Activity[]): YearStat[] => {
  // year → 累加器
  const acc = new Map<
    number,
    { meters: number; sec: number; runs: number; hrSum: number; hrN: number }
  >();
  for (const a of activities) {
    if (!isRun(a)) continue;
    const y = yearOf(a);
    const cur = acc.get(y) ?? { meters: 0, sec: 0, runs: 0, hrSum: 0, hrN: 0 };
    cur.meters += a.distance;
    cur.sec += durationToSeconds(a.moving_time);
    cur.runs += 1;
    if (a.average_heartrate != null) {
      cur.hrSum += a.average_heartrate;
      cur.hrN += 1;
    }
    acc.set(y, cur);
  }
  return [...acc.entries()]
    .map(([year, v]) => {
      const km = v.meters / 1000;
      return {
        year,
        km: toKm(v.meters),
        runs: v.runs,
        avgPaceSec: km > 0 ? Math.round(v.sec / km) : 0,
        avgHr: v.hrN > 0 ? Math.round(v.hrSum / v.hrN) : null,
      };
    })
    .sort((a, b) => a.year - b.year);
};

// 最长连续打卡。streak 为后端预计算的"连续活动序号"，取全局最大即最长连续。
export const longestStreak = (activities: Activity[]): number =>
  activities.reduce((max, a) => Math.max(max, a.streak ?? 0), 0);

// 某年活跃天数 = 有跑步记录的不同日期数 (仅 Run，与热力日历同口径)。
export const activeDays = (activities: Activity[], year: number): number =>
  heatmapByDay(activities, year).size;

// 最新月里程 (英雄区"本月"用)。月份从数据取，不依赖 Date.now()，保证可复现。
export interface MonthKm {
  month: string; // YYYY-MM，无数据则空串
  km: number;
}

export const latestMonthKm = (activities: Activity[]): MonthKm => {
  const runs = activities.filter(isRun);
  if (runs.length === 0) return { month: '', km: 0 };
  const latest = runs.reduce((m, a) => {
    const mo = a.start_date_local.slice(0, 7); // YYYY-MM
    return mo > m ? mo : m;
  }, '');
  const meters = runs
    .filter((a) => a.start_date_local.slice(0, 7) === latest)
    .reduce((s, a) => s + a.distance, 0);
  return { month: latest, km: toKm(meters) };
};

// 近 8 周跑量趋势 (首页近期状态区用)。以数据里最新一条记录所在日为锚点向前分桶，
// 不依赖 Date.now()，保证可复现。周边界 = 锚点日往前每 7 天一段 (非自然周)。
export interface WeekKm {
  weekStart: string; // YYYY-MM-DD，该周段起始日
  km: number;
}

const toDateOnly = (localDate: string): Date =>
  new Date(localDate.slice(0, 10));

export const weeklyVolume = (activities: Activity[], weeks = 8): WeekKm[] => {
  const runs = activities.filter(isRun);
  if (runs.length === 0) return [];

  const anchor = runs.reduce((m, a) => {
    const d = a.start_date_local.slice(0, 10);
    return d > m ? d : m;
  }, '');
  const anchorDate = toDateOnly(anchor);

  const buckets: WeekKm[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(anchorDate);
    start.setDate(start.getDate() - i * 7 - 6);
    const end = new Date(anchorDate);
    end.setDate(end.getDate() - i * 7);
    const meters = runs
      .filter((a) => {
        const d = toDateOnly(a.start_date_local);
        return d >= start && d <= end;
      })
      .reduce((s, a) => s + a.distance, 0);
    buckets.push({
      weekStart: start.toISOString().slice(0, 10),
      km: toKm(meters),
    });
  }
  return buckets;
};

// 本周跑量 (近 8 周趋势的最后一段，即锚点日所在的 7 天窗口)。
export const thisWeekKm = (activities: Activity[]): number => {
  const weeks = weeklyVolume(activities, 1);
  return weeks.length ? weeks[0].km : 0;
};

// 急慢性负荷比 (ACWR) = 急性负荷(近1周) / 慢性负荷(近4周周均)。
// >1.5 通常视为受伤风险升高，<0.8 视为负荷不足，理想区间 0.8~1.3。
export const acwr = (activities: Activity[]): number | null => {
  const weeks = weeklyVolume(activities, 4);
  if (weeks.length < 4) return null;
  const acute = weeks[weeks.length - 1].km;
  const chronic = weeks.reduce((s, w) => s + w.km, 0) / weeks.length;
  if (chronic === 0) return null;
  return Math.round((acute / chronic) * 100) / 100;
};
