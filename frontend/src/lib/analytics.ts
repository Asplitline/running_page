import type { Activity } from '@/data/types';

// 派生分析计算 (纯函数)。数值计算必须有测试兜底。

// "H:MM:SS.ffffff" → 秒
export const durationToSeconds = (raw: string): number => {
  if (!raw) return 0;
  const [hms] = raw.split('.');
  const parts = hms.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  return h * 3600 + m * 60 + s;
};

// PB 距离档定义 (米，含容差)
export const PB_DISTANCES = [
  { key: '5k', label: '5K', meters: 5000, tolerance: 0.03 },
  { key: '10k', label: '10K', meters: 10000, tolerance: 0.03 },
  { key: 'half', label: '半马', meters: 21097, tolerance: 0.03 },
  { key: 'full', label: '全马', meters: 42195, tolerance: 0.03 },
] as const;

export interface PersonalRecord {
  key: string;
  label: string;
  activity: Activity;
  seconds: number;
}

// 各距离最好成绩 (取符合距离档、用时最短的一次)
export const personalRecords = (activities: Activity[]): PersonalRecord[] => {
  const records: PersonalRecord[] = [];
  for (const dist of PB_DISTANCES) {
    const lo = dist.meters * (1 - dist.tolerance);
    const hi = dist.meters * (1 + dist.tolerance);
    const candidates = activities
      .filter((a) => a.distance >= lo && a.distance <= hi)
      .map((a) => ({ activity: a, seconds: durationToSeconds(a.moving_time) }))
      .filter((c) => c.seconds > 0);
    if (!candidates.length) continue;
    const best = candidates.reduce((a, b) => (b.seconds < a.seconds ? b : a));
    records.push({ key: dist.key, label: dist.label, activity: best.activity, seconds: best.seconds });
  }
  return records;
};

// 有氧效率:速度/心率 × 100(越高越好 —— 同心率跑得更快 = 进步)
export const aerobicEfficiency = (a: Activity): number | null => {
  if (!a.average_heartrate || !a.average_speed) return null;
  return Math.round((a.average_speed / a.average_heartrate) * 1000) / 10;
};

// 按月聚合有氧效率 (月均),用于趋势
export interface EfficiencyPoint {
  month: string; // "2024-03"
  value: number;
  count: number;
}

export const efficiencyByMonth = (activities: Activity[]): EfficiencyPoint[] => {
  const map = new Map<string, number[]>();
  for (const a of activities) {
    const eff = aerobicEfficiency(a);
    if (eff == null) continue;
    const month = a.start_date_local.slice(0, 7);
    const arr = map.get(month) ?? [];
    arr.push(eff);
    map.set(month, arr);
  }
  return [...map.entries()]
    .map(([month, vals]) => ({
      month,
      value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
      count: vals.length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};
