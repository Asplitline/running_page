import type { Activity } from '@/data/types';
import { durationToSeconds } from './analytics';
import { splitRunName } from './recentRuns';

// 首页"最近跑步"区块的取数与判读 (纯函数)。
//
// 这块从"20 条流水列表"改成"最近一次 + 同类型对比 + 节律"三段：
// 20 条同构记录本身不承载信息，真正被读的只有最新那条。
// 这里负责把最新一次拆出来，并算出可验证的对比差值。

const isRun = (a: Activity): boolean => a.type === 'Run';

// 按开始时间倒序取最新一次跑步。活动流未必有序，不能直接取 [0]。
export const latestRun = (activities: Activity[]): Activity | null => {
  const runs = activities.filter(isRun);
  if (!runs.length) return null;
  return runs.reduce((newest, a) =>
    a.start_date_local > newest.start_date_local ? a : newest
  );
};

// 每公里配速 (秒)。split_paces 缺失时返回空数组，调用方据此隐藏分段图。
export const splitSeconds = (a: Activity): number[] =>
  (a.split_paces ?? [])
    .map((s) => s.pace_seconds)
    .filter((n): n is number => typeof n === 'number' && n > 0);

// 配速 (秒/km)。优先用 moving_time/distance,它比 average_speed 少一次浮点往返;
// 时长缺失时回退 average_speed。
export const paceSeconds = (a: Activity): number | null => {
  const sec = durationToSeconds(a.moving_time);
  if (sec > 0 && a.distance > 0) return Math.round(sec / (a.distance / 1000));
  if (a.average_speed) return Math.round(1000 / a.average_speed);
  return null;
};

// 加权配速：总时长 ÷ 总距离。
// 各次配速直接算术平均会让 1km 快跑与 20km 慢跑等权，得出与体感不符的数字。
export const weightedPace = (activities: Activity[]): number | null => {
  let meters = 0;
  let seconds = 0;
  for (const a of activities) {
    const p = paceSeconds(a);
    if (p == null || !a.distance) continue;
    meters += a.distance;
    seconds += (a.distance / 1000) * p;
  }
  if (!meters) return null;
  return Math.round(seconds / (meters / 1000));
};

// ---- 同类型对比 ----
// 参照系取"同一课表类型的历史",而非全体：拿乳酸阈值跑去比长距离慢跑没有意义。
// 样本不足 2 次时不给对比 (1 次样本的均值就是它自己，差值无解释力)。

export const MIN_PEER_SAMPLE = 2;

export interface PeerComparison {
  workout: string; // 课表类型名
  sample: number; // 参与对比的历史次数
  peerPace: number; // 历史加权均配 (秒/km)
  peerHr: number | null; // 历史平均心率
  paceDelta: number; // 正 = 本次更快 (秒)
  hrDelta: number | null; // 正 = 本次心率更低 (次)
}

// 参照窗口 (天)。只跟"近期的自己"比。
//
// 不设窗口的话，同类型历史会一路回溯到两年前 —— 把"今天 vs 最近状态"
// 混成了"今天 vs 两年前的自己",差值数字仍然成立但答非所问。
// 90 天约覆盖一个训练周期，既能凑够样本，又不至于跨越体能水平的变化。
export const PEER_WINDOW_DAYS = 90;

const dayDiff = (fromLocal: string, toLocal: string): number =>
  Math.round(
    (new Date(`${toLocal.slice(0, 10)}T00:00:00`).getTime() -
      new Date(`${fromLocal.slice(0, 10)}T00:00:00`).getTime()) /
      86_400_000
  );

// 本次与"近期同类型历史"的对比。
// 无课表标签、窗口内同类样本不足时返回 null (不回退到更长的窗口：
// 样本不够就是不够，凑出来的均值不如不给)。
export const comparePeers = (
  target: Activity,
  activities: Activity[],
  windowDays: number = PEER_WINDOW_DAYS
): PeerComparison | null => {
  const { workout } = splitRunName(target.name);
  if (!workout) return null;

  const peers = activities.filter((a) => {
    if (!isRun(a)) return false;
    if (a.start_date_local === target.start_date_local) return false;
    if (splitRunName(a.name).workout !== workout) return false;
    const gap = dayDiff(a.start_date_local, target.start_date_local);
    return gap > 0 && gap <= windowDays; // 只取本次之前、窗口之内
  });
  if (peers.length < MIN_PEER_SAMPLE) return null;

  const peerPace = weightedPace(peers);
  const selfPace = paceSeconds(target);
  if (peerPace == null || selfPace == null) return null;

  const hrs = peers
    .map((a) => a.average_heartrate)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const peerHr = hrs.length
    ? Math.round(hrs.reduce((s, n) => s + n, 0) / hrs.length)
    : null;
  const selfHr = target.average_heartrate;

  return {
    workout,
    sample: peers.length,
    peerPace,
    peerHr,
    paceDelta: peerPace - selfPace,
    hrDelta: peerHr != null && selfHr ? peerHr - selfHr : null,
  };
};

// ---- 配速排名 ----
// 没有同类型参照时的退路：本次在近期里排第几。
// 同样限定窗口 —— 在 262 次全量里排名回答的是"生涯第几"，
// 而这里要的是"最近状态如何"。
export const paceRank = (
  target: Activity,
  activities: Activity[],
  windowDays: number = PEER_WINDOW_DAYS
): { rank: number; total: number } | null => {
  const paced = activities
    .filter((a) => {
      if (!isRun(a)) return false;
      const gap = dayDiff(a.start_date_local, target.start_date_local);
      return gap >= 0 && gap <= windowDays; // 含本次
    })
    .map((a) => ({ a, p: paceSeconds(a) }))
    .filter((x): x is { a: Activity; p: number } => x.p != null);
  if (paced.length < 2) return null;

  const selfPace = paceSeconds(target);
  if (selfPace == null) return null;

  // 比本次快的条数 + 1 即名次 (并列取靠前名次)
  const faster = paced.filter((x) => x.p < selfPace).length;
  return { rank: faster + 1, total: paced.length };
};

// ---- 配速稳定度 ----
// 分段配速极差。差值小说明全程节奏稳,是"跑得好"的一个独立维度
// (与快慢无关:慢而稳和快而崩是两回事)。
export const STEADY_THRESHOLD = 25;

export const splitRange = (a: Activity): number | null => {
  const s = splitSeconds(a);
  if (s.length < 3) return null; // 段数太少谈不上"稳"
  return Math.max(...s) - Math.min(...s);
};
