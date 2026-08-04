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
