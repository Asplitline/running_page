import type { Activity } from '@/data/types';
import { toKm } from './format';

// 派生统计 (纯函数)。距离/次数口径：仅 type === 'Run'。

const isRun = (a: Activity): boolean => a.type === 'Run';
const yearOf = (a: Activity): number => Number(a.start_date_local.slice(0, 4));

export interface OverallStats {
  totalDistanceKm: number; // 累计跑步距离
  totalRuns: number; // 跑步总次数
  thisYearKm: number; // 指定年跑步距离
  longestRunKm: number; // 最长单次跑步
}

export const overallStats = (activities: Activity[], year: number): OverallStats => {
  const runs = activities.filter(isRun);
  const totalMeters = runs.reduce((s, a) => s + a.distance, 0);
  const yearMeters = runs.filter((a) => yearOf(a) === year).reduce((s, a) => s + a.distance, 0);
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

export const heatmapByDay = (activities: Activity[], year: number): Map<string, DayCell> => {
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
