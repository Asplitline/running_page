import type { Activity } from '@/data/types';
import { durationToSeconds } from './analytics';
import { toKm } from './format';

// 时间轴事件提取 (纯函数)。从活动流里挖出"值得记一笔"的高光,
// 而不是把 262 次跑步全铺开 —— 时间轴的价值在于筛掉日常、留下节点。
//
// 与既有 lib/achievements.ts 的关系:achievements 只产出"徽章标签 + 达成日",
// 用于首页徽章行;这里要的是带完整指标、可分档上色的事件对象,两者不共用结构。

const isRun = (a: Activity): boolean => a.type === 'Run';

// ---- 突破分档 ----
// 颜色语义的唯一来源。阈值按真实数据分布定 (全马 -13.8% 独档,
// 10K 连续刷新落在 1.2%~3.2%),写死便于测试。
export type Tier = 'minor' | 'notable' | 'major' | 'first' | 'neutral';

// PB 提升百分比 → 档位。首次达成不走这里 (无旧值可比),单独记 'first'。
export const tierByGainPct = (gainPct: number): Tier => {
  if (gainPct > 5) return 'major';
  if (gainPct >= 2) return 'notable';
  return 'minor';
};

// 累计里程碑阈值 (km)。按量级递进上色:越大越靠暖端。
const MILESTONE_KM = [100, 500, 1000, 1500, 2000, 2500, 3000] as const;

// 里程碑量级 → 档位。100 起步、2000+ 顶档。
export const tierByMilestone = (km: number): Tier => {
  if (km >= 2000) return 'major';
  if (km >= 1000) return 'first';
  if (km >= 500) return 'notable';
  return 'minor';
};

// PB 距离档 (与 analytics.PB_DISTANCES 同口径但容差独立,
// 时间轴要的是"这次算不算该距离档",宽一点能多捞到比赛)
const PB_SPECS = [
  { key: '10k', label: '10K', meters: 10000, tol: 0.03 },
  { key: 'half', label: '半马', meters: 21097, tol: 0.05 },
  { key: 'full', label: '全马', meters: 42195, tol: 0.05 },
] as const;

// 比赛识别关键词。佳明把赛事名写进 activity.name,
// 这是唯一能区分"比赛"与"日常长距离"的信号。
const RACE_KEYWORDS = ['马拉松', 'arathon', '越野赛', '跑遍'];

export const isRace = (a: Activity): boolean =>
  RACE_KEYWORDS.some((k) => a.name.includes(k));

// 质量课识别。同样只能靠 name (佳明的 workout 类型没同步下来)。
const QUALITY_PATTERNS = [
  { match: '间歇', label: '间歇跑' },
  { match: '乳酸', label: '乳酸阈值' },
  { match: '阈值', label: '乳酸阈值' },
  { match: '*', label: '短距重复' },
] as const;

// ---- 事件类型 ----
export type TimelineKind =
  | 'race'
  | 'pb'
  | 'milestone'
  | 'peak'
  | 'workout'
  | 'goal';

export interface PbStep {
  seconds: number;
  date: string;
}

export interface TimelineEvent {
  key: string; // React key,全局唯一
  kind: TimelineKind;
  date: string; // YYYY-MM-DD，排序与展示用
  tier: Tier; // 决定配色
  title: string;
  runId?: number; // 有则可跳详情页
  // 各 kind 的专属载荷 (可选,渲染层按 kind 取)
  seconds?: number; // 成绩用时
  distanceKm?: number;
  paceSecPerKm?: number;
  hr?: number;
  km?: number; // 里程碑 / 月峰值的里程数
  gainSeconds?: number; // PB 相对上一次的提升 (秒)
  gainPct?: number; // 提升百分比
  prevSeconds?: number; // 上一次成绩
  steps?: PbStep[]; // PB 连续刷新的完整阶梯
  label?: string; // 距离档标签 / 质量课名
  monthRuns?: number; // 月峰值的次数
  remainKm?: number; // 目标:还差多少
  remainSeconds?: number;
  progressPct?: number; // 目标进度 0~100
  note?: string; // 补充说明 (如"同日跨过 1500km")
}

const dateOf = (a: Activity): string => a.start_date_local.slice(0, 10);

// ---- 比赛事件 ----
const raceEvents = (runs: Activity[]): TimelineEvent[] =>
  runs.filter(isRace).map((a) => ({
    key: `race-${a.run_id}`,
    kind: 'race' as const,
    date: dateOf(a),
    tier: 'first' as Tier, // 比赛本身的档位在 mergeSameDay 里可能被 PB 提升覆盖
    title: a.name.split(' - ').pop() ?? a.name,
    runId: a.run_id,
    seconds: durationToSeconds(a.moving_time),
    distanceKm: toKm(a.distance),
    paceSecPerKm: a.average_speed
      ? Math.round(1000 / a.average_speed)
      : undefined,
    hr: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
  }));

// ---- PB 事件 ----
// 每次刷新记一条,并累积完整阶梯 (steps) 供"连续刷新"卡渲染。
const pbEvents = (runs: Activity[]): TimelineEvent[] => {
  const out: TimelineEvent[] = [];
  for (const spec of PB_SPECS) {
    const lo = spec.meters * (1 - spec.tol);
    const hi = spec.meters * (1 + spec.tol);
    const steps: PbStep[] = [];
    let best: number | null = null;
    for (const a of runs) {
      if (a.distance < lo || a.distance > hi) continue;
      const sec = durationToSeconds(a.moving_time);
      if (sec <= 0) continue;
      if (best !== null && sec >= best) continue; // 没刷新,跳过
      const prev = best;
      best = sec;
      steps.push({ seconds: sec, date: dateOf(a) });
      const gainSeconds = prev !== null ? prev - sec : undefined;
      const gainPct =
        prev !== null
          ? Math.round((gainSeconds! / prev) * 1000) / 10
          : undefined;
      out.push({
        key: `pb-${spec.key}-${a.run_id}`,
        kind: 'pb',
        date: dateOf(a),
        tier: prev === null ? 'first' : tierByGainPct(gainPct!),
        title: prev === null ? `首个${spec.label}` : `${spec.label} PB`,
        runId: a.run_id,
        label: spec.label,
        seconds: sec,
        prevSeconds: prev ?? undefined,
        gainSeconds,
        gainPct,
        distanceKm: toKm(a.distance),
        steps: [...steps],
      });
    }
  }
  return out;
};

// ---- 累计里程碑 ----
const milestoneEvents = (runs: Activity[]): TimelineEvent[] => {
  const out: TimelineEvent[] = [];
  const hit = new Set<number>();
  let cumMeters = 0;
  for (const a of runs) {
    cumMeters += a.distance;
    const cumKm = cumMeters / 1000;
    for (const t of MILESTONE_KM) {
      if (cumKm >= t && !hit.has(t)) {
        hit.add(t);
        out.push({
          key: `milestone-${t}`,
          kind: 'milestone',
          date: dateOf(a),
          tier: tierByMilestone(t),
          title: `累计 ${t}km`,
          km: t,
          runId: a.run_id,
        });
      }
    }
  }
  return out;
};

// ---- 月度峰值 ----
// 只记历史最高的那个月 —— 记多了就不是"峰值"了。
const peakMonthEvent = (runs: Activity[]): TimelineEvent | null => {
  const byMonth = new Map<string, { km: number; runs: number }>();
  for (const a of runs) {
    const m = a.start_date_local.slice(0, 7);
    const cur = byMonth.get(m) ?? { km: 0, runs: 0 };
    cur.km += a.distance / 1000;
    cur.runs += 1;
    byMonth.set(m, cur);
  }
  if (byMonth.size === 0) return null;
  const [month, v] = [...byMonth.entries()].reduce((best, cur) =>
    cur[1].km > best[1].km ? cur : best
  );
  // 峰值月的"日期"取该月最后一次跑步日,保证排序落在月内
  const lastInMonth = runs
    .filter((a) => a.start_date_local.slice(0, 7) === month)
    .reduce((m, a) => (dateOf(a) > m ? dateOf(a) : m), '');
  return {
    key: `peak-${month}`,
    kind: 'peak',
    date: lastInMonth,
    tier: 'major',
    title: `月度峰值 ${month.replace('-', '.')}`,
    km: Math.round(v.km),
    monthRuns: v.runs,
    note: `${byMonth.size} 个月里的最高单月跑量`,
  };
};

// ---- 首次质量课 ----
const workoutEvents = (runs: Activity[]): TimelineEvent[] => {
  const out: TimelineEvent[] = [];
  const seen = new Set<string>();
  for (const a of runs) {
    for (const p of QUALITY_PATTERNS) {
      if (!a.name.includes(p.match) || seen.has(p.label)) continue;
      seen.add(p.label);
      out.push({
        key: `workout-${p.label}-${a.run_id}`,
        kind: 'workout',
        date: dateOf(a),
        tier: 'neutral',
        title: a.name.split(' - ').pop() ?? p.label,
        label: p.label,
        runId: a.run_id,
        distanceKm: toKm(a.distance),
      });
    }
  }
  return out;
};

// ---- 未来目标 ----
// 下一个未达成的里程碑 + 下一个整十分钟 10K 目标。
export const goalEvents = (runs: Activity[]): TimelineEvent[] => {
  const out: TimelineEvent[] = [];
  const totalKm = runs.reduce((s, a) => s + a.distance, 0) / 1000;
  const nextMilestone = MILESTONE_KM.find((t) => totalKm < t);
  if (nextMilestone) {
    out.push({
      key: `goal-milestone-${nextMilestone}`,
      kind: 'goal',
      date: '9999-12-31', // 排到最后
      tier: 'neutral',
      title: `累计 ${nextMilestone}km`,
      km: nextMilestone,
      remainKm: Math.round((nextMilestone - totalKm) * 10) / 10,
      progressPct: Math.round((totalKm / nextMilestone) * 100),
    });
  }
  // 10K 下一个整十分钟目标 (如当前 52:00 → 目标 50:00)
  const spec = PB_SPECS[0];
  const lo = spec.meters * (1 - spec.tol);
  const hi = spec.meters * (1 + spec.tol);
  const best10k = runs
    .filter((a) => a.distance >= lo && a.distance <= hi)
    .map((a) => durationToSeconds(a.moving_time))
    .filter((s) => s > 0)
    .reduce((m: number | null, s) => (m === null || s < m ? s : m), null);
  if (best10k !== null) {
    // 向下取到最近的整十分钟
    const target = Math.floor(best10k / 600) * 600;
    if (target > 0 && target < best10k) {
      out.push({
        key: `goal-10k-${target}`,
        kind: 'goal',
        date: '9999-12-31',
        tier: 'neutral',
        title: `10K 破 ${target / 60} 分`,
        label: '10K',
        seconds: target,
        remainSeconds: best10k - target,
        progressPct: Math.round((target / best10k) * 100),
      });
    }
  }
  return out;
};

// 同日的比赛 + PB 合并成一条 (世遗马那天既是比赛又是全马 PB,
// 拆两条会让时间轴出现重复节点)。比赛卡为主体,吸收 PB 的提升数据与档位。
const mergeSameDay = (events: TimelineEvent[]): TimelineEvent[] => {
  const races = events.filter((e) => e.kind === 'race');
  const absorbed = new Set<string>();
  const merged = races.map((race) => {
    const pb = events.find(
      (e) => e.kind === 'pb' && e.date === race.date && e.runId === race.runId
    );
    if (!pb) return race;
    absorbed.add(pb.key);
    return {
      ...race,
      tier: pb.tier, // 档位由 PB 提升幅度决定 —— 颜色要反映突破量级
      label: pb.label,
      prevSeconds: pb.prevSeconds,
      gainSeconds: pb.gainSeconds,
      gainPct: pb.gainPct,
      steps: pb.steps,
    };
  });
  return [
    ...merged,
    ...events.filter((e) => e.kind !== 'race' && !absorbed.has(e.key)),
  ];
};

// 时间轴总入口。返回按日期升序的高光事件 (未来目标排在最后)。
export const timelineEvents = (activities: Activity[]): TimelineEvent[] => {
  const runs = [...activities]
    .filter(isRun)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local));
  if (runs.length === 0) return [];

  const peak = peakMonthEvent(runs);
  const raw = [
    ...raceEvents(runs),
    ...pbEvents(runs),
    ...milestoneEvents(runs),
    ...workoutEvents(runs),
    ...(peak ? [peak] : []),
  ];
  return [...mergeSameDay(raw), ...goalEvents(runs)].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
};

// 按年分组 (渲染层要年份带 + 该年汇总)。未来目标归入 'goal' 组。
export interface TimelineYearGroup {
  year: string; // '2024' | 'goal'
  events: TimelineEvent[];
  runs: number; // 该年跑步次数
  km: number; // 该年里程
}

export const timelineByYear = (activities: Activity[]): TimelineYearGroup[] => {
  const events = timelineEvents(activities);
  const runs = activities.filter(isRun);
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const y = e.kind === 'goal' ? 'goal' : e.date.slice(0, 4);
    groups.set(y, [...(groups.get(y) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([year, list]) => {
      const yearRuns = runs.filter(
        (a) => a.start_date_local.slice(0, 4) === year
      );
      return {
        year,
        events: list,
        runs: yearRuns.length,
        km: toKm(yearRuns.reduce((s, a) => s + a.distance, 0)),
      };
    })
    .sort((a, b) => {
      if (a.year === 'goal') return 1;
      if (b.year === 'goal') return -1;
      return a.year.localeCompare(b.year);
    });
};
