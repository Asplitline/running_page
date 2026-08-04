// 设计 token 的 TS 镜像 — 供 JS 逻辑 (图表配色、心率分区计算) 使用。
// 视觉真相源是 styles/index.css 的 @theme;此处保持同步。

// 心率分区 Z1-Z5(绿→黄→橙→红，强度递增)
export const HR_ZONES = [
  { zone: 1, key: 'z1', color: '#58B99D', label: '恢复', pctMin: 0.5, pctMax: 0.6 },
  { zone: 2, key: 'z2', color: '#82BE53', label: '有氧', pctMin: 0.6, pctMax: 0.7 },
  { zone: 3, key: 'z3', color: '#E5B93C', label: '节奏', pctMin: 0.7, pctMax: 0.8 },
  { zone: 4, key: 'z4', color: '#EF7D33', label: '阈值', pctMin: 0.8, pctMax: 0.9 },
  { zone: 5, key: 'z5', color: '#DC4C3F', label: '极限', pctMin: 0.9, pctMax: 1.0 },
] as const;

export type HrZone = (typeof HR_ZONES)[number];

// 语义色 (图表/指标用)
export const SEMANTIC = {
  accent: '#EF7D33', // 强调 = Z4 橙
  route: '#378ADD', // 轨迹蓝
} as const;

// 默认最大心率估算:220 - 年龄
export const estimateHrMax = (age: number): number => 220 - age;

// 给定心率与最大心率，返回所属分区 (找不到返回 null)
export const hrZoneOf = (hr: number, hrMax: number): HrZone | null => {
  if (!hr || !hrMax) return null;
  const pct = hr / hrMax;
  return HR_ZONES.find((z) => pct >= z.pctMin && pct < z.pctMax) ?? (pct >= 1 ? HR_ZONES[4] : null);
};
