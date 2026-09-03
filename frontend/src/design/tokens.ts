// 设计 token 的 TS 镜像 — 供 JS 逻辑 (图表配色、心率分区计算) 使用。
// 视觉真相源是 styles/index.css 的 @theme;此处保持同步。

// 心率分区 Z1-Z5(绿→黄→橙→红，强度递增)
// color   = 图表填充色 (只需 3:1)
// inkColor= 供文字使用的 var() 引用 —— 原 color 作文字在亮底上仅 1.85~4.08:1
//           (Z3 黄最差)，小字读不清。走 CSS 变量而非硬编码，暗色下
//           z*-ink 会回落到原色 (深底上原色本就 4.11~9.06:1)
// solidColor= 实心徽章底 (白字压其上)。与 inkColor 不同，它在暗色下也不回落 ——
//           白字压在 z3 原色黄上只有 1.85:1
export const HR_ZONES = [
  {
    zone: 1,
    key: 'z1',
    color: '#58B99D',
    inkColor: 'var(--color-z1-ink)',
    solidColor: 'var(--color-z1-solid)',
    label: '恢复',
    pctMin: 0.5,
    pctMax: 0.6,
  },
  {
    zone: 2,
    key: 'z2',
    color: '#82BE53',
    inkColor: 'var(--color-z2-ink)',
    solidColor: 'var(--color-z2-solid)',
    label: '有氧',
    pctMin: 0.6,
    pctMax: 0.7,
  },
  {
    zone: 3,
    key: 'z3',
    color: '#E5B93C',
    inkColor: 'var(--color-z3-ink)',
    solidColor: 'var(--color-z3-solid)',
    label: '节奏',
    pctMin: 0.7,
    pctMax: 0.8,
  },
  {
    zone: 4,
    key: 'z4',
    color: '#EF7D33',
    inkColor: 'var(--color-z4-ink)',
    solidColor: 'var(--color-z4-solid)',
    label: '阈值',
    pctMin: 0.8,
    pctMax: 0.9,
  },
  {
    zone: 5,
    key: 'z5',
    color: '#DC4C3F',
    inkColor: 'var(--color-z5-ink)',
    solidColor: 'var(--color-z5-solid)',
    label: '极限',
    pctMin: 0.9,
    pctMax: 1.0,
  },
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
  return (
    HR_ZONES.find((z) => pct >= z.pctMin && pct < z.pctMax) ??
    (pct >= 1 ? HR_ZONES[4] : null)
  );
};

// 按设备侧分区下界判定 (Garmin hr_zones.low_boundary)。
// 比百分比法准：boundary 是佳明按跑者真实 LTHR/储备心率算的，能复现它自己的时长统计。
export const hrZoneByBoundaries = (
  hr: number,
  zones: { zone: number; low_boundary: number }[]
): HrZone | null => {
  if (!hr) return null;
  // 从高到低找第一个够得着的区；低于 Z1 下界返回 null (交由调用方按"低于 Z1"处理)
  const hit = [...zones]
    .filter((z) => z.low_boundary > 0)
    .sort((a, b) => b.low_boundary - a.low_boundary)
    .find((z) => hr >= z.low_boundary);
  return hit ? HR_ZONES.find((z) => z.zone === hit.zone) ?? null : null;
};

// 分区判定入口：按可信度取源，返回 (hr) => 分区 的判定器。
//
// 绝不能用 activity.max_heartrate 当分母 —— 那是"本次跑到的最高心率"而非生理上限，
// 拿它做分母等于每次跑步都逼近 100%，实测会把 79% 的公里段误判成 Z5 极限。
export const makeZoneResolver = (
  hrZones: { zone: number; low_boundary: number }[] | null | undefined,
  fallbackHrMax: number
): ((hr: number) => HrZone | null) => {
  const usable = hrZones?.filter((z) => z.low_boundary > 0) ?? [];
  if (usable.length > 0) return (hr) => hrZoneByBoundaries(hr, usable);
  return (hr) => hrZoneOf(hr, fallbackHrMax);
};

// ---- 时间轴突破档位 → 配色 ----
// 复用上面的 Z1-Z5 强度色阶:它的语义本就是"强度递进",
// 正好对上"突破幅度递进"。不另造一套色,避免同一页出现两套语义相近的色阶。
//
// 档位判定在 lib/timeline.ts (tierByGainPct / tierByMilestone),
// 这里只负责档位 → CSS 变量名的映射。
export const TIER_COLOR_VAR = {
  minor: '--color-z2', // 微幅刷新 (提升 <2%) — 绿
  notable: '--color-z3', // 显著刷新 (2%~5%) — 黄
  first: '--color-z4', // 首次达成 — 橙 (= accent)
  major: '--color-z5', // 重大突破 (>5%) — 红
  neutral: '--color-ink-3', // 训练记录 / 未达成目标 — 中性灰
} as const;

export type TierKey = keyof typeof TIER_COLOR_VAR;

// 档位 → var() 表达式,直接塞进 style 的 --tone 自定义属性。
export const tierTone = (tier: TierKey): string =>
  `var(${TIER_COLOR_VAR[tier]})`;
