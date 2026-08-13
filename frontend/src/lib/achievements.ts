import type { Activity } from '@/data/types';
import { PB_DISTANCES } from './analytics';

// 成就徽章 (纯函数)。两类：里程碑(累计里程/次数阈值) + 距离档首次达成(首马/首个半马等)。
// 只展示"已解锁"的成就，按达成时间倒序 (最新解锁的在前)。

const isRun = (a: Activity): boolean => a.type === 'Run';

export interface Achievement {
  key: string;
  label: string;
  achievedDate: string; // start_date_local，用于排序
}

// 累计里程阈值 (km)
const DISTANCE_MILESTONES_KM = [100, 500, 1000, 2000, 3000];
// 累计次数阈值
const COUNT_MILESTONES = [50, 100, 200, 500];

// 里程碑成就:按活动时间顺序累加，跨过阈值那一刻记为达成。
const milestoneAchievements = (activities: Activity[]): Achievement[] => {
  const runs = [...activities]
    .filter(isRun)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local));

  const out: Achievement[] = [];
  let cumMeters = 0;
  let cumCount = 0;
  const hitDistance = new Set<number>();
  const hitCount = new Set<number>();

  for (const a of runs) {
    cumMeters += a.distance;
    cumCount += 1;
    const cumKm = cumMeters / 1000;

    for (const threshold of DISTANCE_MILESTONES_KM) {
      if (cumKm >= threshold && !hitDistance.has(threshold)) {
        hitDistance.add(threshold);
        out.push({
          key: `distance-${threshold}`,
          label: `累计 ${threshold}km`,
          achievedDate: a.start_date_local,
        });
      }
    }
    for (const threshold of COUNT_MILESTONES) {
      if (cumCount >= threshold && !hitCount.has(threshold)) {
        hitCount.add(threshold);
        out.push({
          key: `count-${threshold}`,
          label: `累计 ${threshold} 次`,
          achievedDate: a.start_date_local,
        });
      }
    }
  }
  return out;
};

// 距离档首次达成 (首马/首个半马/首个10K/首个5K)。
// 复用 PB_DISTANCES 的容差定义，取每档最早一次 (而非 PB 最快一次)。
const firstAchievements = (activities: Activity[]): Achievement[] => {
  const out: Achievement[] = [];
  for (const dist of PB_DISTANCES) {
    const lo = dist.meters * (1 - dist.tolerance);
    const hi = dist.meters * (1 + dist.tolerance);
    const candidates = activities.filter(
      (a) => isRun(a) && a.distance >= lo && a.distance <= hi
    );
    if (!candidates.length) continue;
    const earliest = candidates.reduce((a, b) =>
      b.start_date_local < a.start_date_local ? b : a
    );
    out.push({
      key: `first-${dist.key}`,
      label: `首个${dist.label}`,
      achievedDate: earliest.start_date_local,
    });
  }
  return out;
};

export const achievements = (activities: Activity[]): Achievement[] =>
  [...milestoneAchievements(activities), ...firstAchievements(activities)].sort(
    (a, b) => b.achievedDate.localeCompare(a.achievedDate)
  );
