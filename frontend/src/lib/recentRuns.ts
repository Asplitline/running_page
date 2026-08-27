import type { Activity } from '@/data/types';

// 最近跑步列表的展示逻辑 — 从活动名拆出训练类型、标记极值记录。

export interface RunName {
  place: string; // 地点，如 "成都市"
  workout: string | null; // 训练类型，如 "乳酸阈值"；普通跑为 null
}

// 活动名形如 "成都市 - 乳酸阈值"(有意图的课表) 或 "成都市 跑步"(普通跑)。
// 数据里半角 "-" 与全角 "–" 混用,两种都认；训练类型自身可能含分隔符
// (如 "200m * 15")，故只按首个分隔符切一刀。
export const splitRunName = (name: string): RunName => {
  const m = name.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return { place: name, workout: null };
  return { place: m[1].trim(), workout: m[2].trim() };
};

export interface HighlightedRun {
  activity: Activity;
  isLongest: boolean; // 本批次最长距离
  isFastest: boolean; // 本批次最快配速
}

// 标记极值:同批次里最长的一次与最快的一次。
// 并列时只标第一条,否则一屏全是高亮等于没有高亮；
// 单条记录不标记 (没有比较对象,标了也无意义)。
export const markHighlights = (activities: Activity[]): HighlightedRun[] => {
  if (activities.length <= 1) {
    return activities.map((activity) => ({
      activity,
      isLongest: false,
      isFastest: false,
    }));
  }

  let longestIdx = -1;
  let fastestIdx = -1;
  activities.forEach((a, i) => {
    if (longestIdx < 0 || a.distance > activities[longestIdx].distance) {
      longestIdx = i;
    }
    // average_speed 是 m/s，越大越快；缺值(0/null)不参与评选
    if (
      a.average_speed &&
      (fastestIdx < 0 || a.average_speed > activities[fastestIdx].average_speed!)
    ) {
      fastestIdx = i;
    }
  });

  return activities.map((activity, i) => ({
    activity,
    isLongest: i === longestIdx,
    isFastest: i === fastestIdx,
  }));
};

export interface RunsSummary {
  count: number;
  totalKm: number;
  avgPaceSecPerKm: number | null; // 按总时长/总距离加权，非各次配速算术平均
  spanDays: number; // 首末两次跑步的跨度(含首尾)
}

// 汇总一批跑步 — 给最近列表配一句"这批跑得怎么样"的解读。
// 均配速必须按总时长÷总距离算:各次配速直接取平均会让 1km 快跑
// 与 20km 慢跑等权,得出与实际体感不符的数字。
export const summarizeRuns = (activities: Activity[]): RunsSummary | null => {
  if (!activities.length) return null;

  let totalMeters = 0;
  let pacedMeters = 0; // 有速度记录的距离,用于加权配速
  let pacedSeconds = 0;
  let earliest = Infinity;
  let latest = -Infinity;

  for (const a of activities) {
    totalMeters += a.distance;
    if (a.average_speed) {
      pacedMeters += a.distance;
      pacedSeconds += a.distance / a.average_speed;
    }
    const t = new Date(a.start_date_local).getTime();
    if (Number.isFinite(t)) {
      if (t < earliest) earliest = t;
      if (t > latest) latest = t;
    }
  }

  const DAY_MS = 86_400_000;
  const spanDays = Number.isFinite(earliest)
    ? Math.round((latest - earliest) / DAY_MS) + 1
    : 1;

  return {
    count: activities.length,
    totalKm: Math.round((totalMeters / 1000) * 10) / 10,
    avgPaceSecPerKm: pacedMeters
      ? Math.round(pacedSeconds / (pacedMeters / 1000))
      : null,
    spanDays,
  };
};
