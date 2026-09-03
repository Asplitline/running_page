import type { Activity } from '@/data/types';
import { PB_DISTANCES, durationToSeconds } from './analytics';
import { weeklyVolume } from './stats';
import { toKm } from './format';

// 「还差多少」数据层 (纯函数)。首页成就区讲未来，分析页时间轴讲过去 ——
// 时态分工是这个模块存在的理由：同一批里程碑若两处都讲"已达成"，
// 首页就只是时间轴的劣化重复 (旧 achievements.ts 的问题)。
//
// 与 lib/timeline.ts 的 goalEvents() 的关系：那边产出时间轴用的事件对象
// (要挂在轴上、带 tier 配色)，这里产出首页面板用的进度对象 (要算剩余量与
// 达成预估)。阈值表刻意各自持有 —— 时间轴的档位密度服务于"轴上疏密"，
// 首页只关心"下一个是谁"，共用会让任一侧的调整误伤另一侧。

const isRun = (a: Activity): boolean => a.type === 'Run';

// 累计里程阈值 (km)。与 timeline.MILESTONE_KM 同值但独立维护，理由见上。
const MILESTONE_KM = [100, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];

// 累计次数阈值
const COUNT_MILESTONES = [50, 100, 200, 500, 1000];

// PB 目标的取整粒度 (秒)。10 分钟一档 —— 跑者习惯以"破 50 分"计目标，
// 而非"再快 3 秒"。
const PB_TARGET_STEP = 600;

export interface DistanceGoal {
  target: number; // 目标里程 (km)
  current: number; // 当前累计 (km)
  remainKm: number; // 还差多少 km
  progressPct: number; // 进度百分比 (0-100)
  weeksToGo: number | null; // 按近 8 周节奏的预估周数，样本不足时 null
  weeklyKm: number | null; // 近 8 周周均，用于展示推算依据
}

export interface CountGoal {
  target: number;
  current: number;
  remain: number;
  progressPct: number;
}

export interface PbGoal {
  key: string;
  label: string;
  currentSeconds: number; // 当前 PB
  targetSeconds: number; // 下一个整十分钟目标
  gapSeconds: number; // 还差多少秒
}

export interface NextGoals {
  distance: DistanceGoal | null;
  count: CountGoal | null;
  pbs: PbGoal[];
}

// 下一个未达成的累计里程档。全部达成时返回 null (不编造目标)。
export const nextDistanceGoal = (
  activities: Activity[]
): DistanceGoal | null => {
  const runs = activities.filter(isRun);
  if (runs.length === 0) return null;

  const current = toKm(runs.reduce((s, a) => s + a.distance, 0));
  const target = MILESTONE_KM.find((t) => current < t);
  if (target === undefined) return null;

  const remainKm = Math.round((target - current) * 10) / 10;

  // 近 8 周周均 → 预估还需几周。周均为 0 (长期停跑) 时不给预估，
  // 否则会算出 Infinity 并渲染成 "还需 Infinity 周"。
  const weeks = weeklyVolume(activities, 8);
  const weeklyKm = weeks.length
    ? Math.round((weeks.reduce((s, w) => s + w.km, 0) / weeks.length) * 10) / 10
    : null;
  const weeksToGo =
    weeklyKm && weeklyKm > 0
      ? Math.max(1, Math.round(remainKm / weeklyKm))
      : null;

  return {
    target,
    current,
    remainKm,
    progressPct: Math.round((current / target) * 1000) / 10,
    weeksToGo,
    weeklyKm,
  };
};

// 下一个未达成的累计次数档。
export const nextCountGoal = (activities: Activity[]): CountGoal | null => {
  const current = activities.filter(isRun).length;
  if (current === 0) return null;

  const target = COUNT_MILESTONES.find((t) => current < t);
  if (target === undefined) return null;

  return {
    target,
    current,
    remain: target - current,
    progressPct: Math.round((current / target) * 1000) / 10,
  };
};

// 各距离档的「下一个整十分钟」目标。
// 已经压在整十分钟线上 (如恰好 50:00) 时跳过该档 —— 目标必须比现状快，
// 否则会出现 "还差 0 秒" 这种无意义行。
export const nextPbGoals = (activities: Activity[]): PbGoal[] => {
  const out: PbGoal[] = [];

  for (const dist of PB_DISTANCES) {
    const lo = dist.meters * (1 - dist.tolerance);
    const hi = dist.meters * (1 + dist.tolerance);
    const seconds = activities
      .filter((a) => isRun(a) && a.distance >= lo && a.distance <= hi)
      .map((a) => durationToSeconds(a.moving_time))
      .filter((s) => s > 0);
    if (seconds.length === 0) continue;

    const currentSeconds = Math.min(...seconds);
    const targetSeconds =
      Math.floor(currentSeconds / PB_TARGET_STEP) * PB_TARGET_STEP;
    if (targetSeconds <= 0 || targetSeconds >= currentSeconds) continue;

    out.push({
      key: dist.key,
      label: dist.label,
      currentSeconds,
      targetSeconds,
      gapSeconds: Math.round(currentSeconds - targetSeconds),
    });
  }

  // 差距小的排前面 —— "触手可及"是这块的卖点，最近的那个最该被看见
  return out.sort((a, b) => a.gapSeconds - b.gapSeconds);
};

export const nextGoals = (activities: Activity[]): NextGoals => ({
  distance: nextDistanceGoal(activities),
  count: nextCountGoal(activities),
  pbs: nextPbGoals(activities),
});
