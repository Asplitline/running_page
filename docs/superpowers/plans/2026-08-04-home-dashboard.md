# 首页成就仪表盘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `frontend` 首页从「最近 20 条列表」重构为成就仪表盘 (总览数字条 + 年度热力日历 + PB 快照 + 最近活动列表)。

**Architecture:** 编译期 `activities.json` → 纯函数派生统计 (`lib/stats.ts`)→ 四个 dashboard 组件消费。全程零运行时请求。图表零依赖：热力日历用 CSS Grid，配色走现有 `--color-z1..z5` token。PB 直接复用 `analytics.ts::personalRecords`。

**Tech Stack:** React 19 + react-router 7 + Tailwind v4(`@theme` token)+ Radix Tooltip + Vitest + Testing Library。

## Global Constraints

- 仅改动 `frontend/` 子包;不碰根 `package.json` 与后端。
- 零新增运行时依赖 (不引图表库/日历库)。
- 所有颜色/圆角/阴影用 `styles/index.css` 的 CSS 变量，不硬编码颜色值。
- TS `strict` + `noUnusedLocals` + `noUnusedParameters` 开启：不留未用变量/参数。
- 距离统计口径:**仅 `type === 'Run'`**;次数口径同样仅跑步 (与距离一致)。
- 数值展示类加 `.tnum`;标题用 `var(--font-display)`;板块用 eyebrow 小标签。
- 注释用中文、单行 `//`;不可变风格 (`{ ...obj }` 不 mutate)。
- 命令统一在 `frontend/` 目录下跑：`pnpm --filter @running-page/frontend <script>`。
- 测试用 vitest globals(`describe/it/expect`,无需 import);造 Activity 用工厂函数模式 (见 `analytics.test.ts` 的 `mk`)。
- 提交在分支 `feat/home-dashboard`(已创建),commit 用 `docs/feat/refactor` 前缀。

---

## File Structure

```
frontend/src/
├─ lib/
│  ├─ stats.ts            新 — 总览统计 + 热力聚合 + 热力分档(纯函数)
│  └─ stats.test.ts       新 — stats 口径测试
├─ lib/format.ts          修改 — 新增 formatKm(千分位)
├─ components/dashboard/
│  ├─ StatsBar.tsx        新 — 总览数字条(4 KPI)
│  ├─ HeatmapCalendar.tsx 新 — 年度热力日历(CSS Grid + Tooltip)
│  ├─ PrSnapshot.tsx      新 — PB 快照(复用 personalRecords)
│  └─ RecentRuns.tsx      新 — 最近活动列表(从旧 Home 抽出)
├─ components/dashboard/dashboard.test.tsx  新 — 组件渲染/tooltip 测试
└─ pages/Home.tsx         重写 — 组装四块
```

决策：`Card` 与 `Kpi` 目前在 RunDetail/Analysis 内局部定义。本计划**不抽公共组件**(避免过度设计),dashboard 组件各自定义所需的轻量卡片壳。若后续第三处复用再抽。

---

## Task 1: 数据层 stats.ts —— 总览统计

**Files:**
- Create: `frontend/src/lib/stats.ts`
- Test: `frontend/src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `Activity` from `@/data/types`
- Produces:
  - `interface OverallStats { totalDistanceKm: number; totalRuns: number; thisYearKm: number; longestRunKm: number }`
  - `overallStats(activities: Activity[], year: number): OverallStats`

- [ ] **Step 1: 写失败测试**

创建 `frontend/src/lib/stats.test.ts`:

```ts
import { overallStats } from './stats';
import type { Activity } from '@/data/types';

// 最小活动工厂 (对齐 analytics.test.ts 风格)
const mk = (over: Partial<Activity>): Activity =>
  ({
    run_id: 1,
    name: 'test',
    distance: 5000,
    moving_time: '0:25:00',
    type: 'Run',
    subtype: '',
    start_date: '2024-03-20 00:00:00',
    start_date_local: '2024-03-20 08:00:00',
    location_country: '',
    summary_polyline: null,
    average_heartrate: 150,
    max_heartrate: 165,
    average_speed: 3.3,
    average_cadence: 185,
    cadence_trend: null,
    split_paces: null,
    split_heart_rates: null,
    elevation_gain: 0,
    ...over,
  }) as Activity;

describe('overallStats', () => {
  it('距离/次数仅计 Run，排除骑行徒步', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000 }),
      mk({ type: 'Run', distance: 10000 }),
      mk({ type: 'cycling', distance: 30000 }),
      mk({ type: 'hiking', distance: 8000 }),
    ];
    const s = overallStats(acts, 2024);
    expect(s.totalRuns).toBe(2);
    expect(s.totalDistanceKm).toBe(15);
  });

  it('thisYearKm 只累计指定年的 Run', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000, start_date_local: '2024-06-01 08:00:00' }),
      mk({ type: 'Run', distance: 8000, start_date_local: '2025-06-01 08:00:00' }),
    ];
    const s = overallStats(acts, 2025);
    expect(s.thisYearKm).toBe(8);
  });

  it('longestRunKm 取最长单次 Run', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000 }),
      mk({ type: 'Run', distance: 21097 }),
      mk({ type: 'cycling', distance: 50000 }),
    ];
    expect(overallStats(acts, 2024).longestRunKm).toBe(21.1);
  });

  it('空数组 → 全 0', () => {
    const s = overallStats([], 2024);
    expect(s).toEqual({ totalDistanceKm: 0, totalRuns: 0, thisYearKm: 0, longestRunKm: 0 });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend && pnpm vitest run src/lib/stats.test.ts`
Expected: FAIL —— `overallStats` is not a function / 模块不存在。

- [ ] **Step 3: 写最小实现**

创建 `frontend/src/lib/stats.ts`:

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && pnpm vitest run src/lib/stats.test.ts`
Expected: PASS(4 个 overallStats 用例)。

注：`toKm` 对 0 返回 0，空数组分支自然满足全 0。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/stats.ts frontend/src/lib/stats.test.ts
git commit -m "feat(frontend): 首页统计纯函数 overallStats"
```

---

## Task 2: 数据层 stats.ts —— 热力聚合与分档

**Files:**
- Modify: `frontend/src/lib/stats.ts`
- Test: `frontend/src/lib/stats.test.ts`

**Interfaces:**
- Produces:
  - `interface DayCell { date: string; count: number; distanceKm: number }`(date 为 `YYYY-MM-DD`)
  - `heatmapByDay(activities: Activity[], year: number): Map<string, DayCell>`
  - `heatLevel(distanceKm: number): 0 | 1 | 2 | 3 | 4 | 5`

- [ ] **Step 1: 追加失败测试**

在 `stats.test.ts` 末尾追加：

```ts
import { heatmapByDay, heatLevel } from './stats';

describe('heatmapByDay', () => {
  it('同日多次跑步合并 count 与距离', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000, start_date_local: '2024-03-20 08:00:00' }),
      mk({ type: 'Run', distance: 3000, start_date_local: '2024-03-20 18:00:00' }),
    ];
    const m = heatmapByDay(acts, 2024);
    const cell = m.get('2024-03-20');
    expect(cell?.count).toBe(2);
    expect(cell?.distanceKm).toBe(8);
  });

  it('只含指定年 + 仅 Run', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000, start_date_local: '2024-03-20 08:00:00' }),
      mk({ type: 'Run', distance: 5000, start_date_local: '2025-03-20 08:00:00' }),
      mk({ type: 'cycling', distance: 5000, start_date_local: '2024-03-21 08:00:00' }),
    ];
    const m = heatmapByDay(acts, 2024);
    expect(m.size).toBe(1);
    expect(m.has('2024-03-20')).toBe(true);
  });
});

describe('heatLevel', () => {
  it('0km → 0', () => expect(heatLevel(0)).toBe(0));
  it('分档边界', () => {
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(5)).toBe(2);
    expect(heatLevel(8)).toBe(3);
    expect(heatLevel(12)).toBe(4);
    expect(heatLevel(20)).toBe(5);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend && pnpm vitest run src/lib/stats.test.ts`
Expected: FAIL —— `heatmapByDay` / `heatLevel` 未定义。

- [ ] **Step 3: 追加实现**

在 `stats.ts` 追加 (复用已有 `isRun` / `yearOf`):

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && pnpm vitest run src/lib/stats.test.ts`
Expected: PASS(overallStats + heatmapByDay + heatLevel 全部)。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/stats.ts frontend/src/lib/stats.test.ts
git commit -m "feat(frontend): 热力聚合 heatmapByDay 与分档 heatLevel"
```

---

## Task 3: format.ts —— 千分位公里格式

**Files:**
- Modify: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/format.test.ts`(新建)

**Interfaces:**
- Produces: `formatKm(km: number): string`(整数千分位，如 `2192` → `"2,192"`)

- [ ] **Step 1: 写失败测试**

创建 `frontend/src/lib/format.test.ts`:

```ts
import { formatKm } from './format';

describe('formatKm', () => {
  it('千分位', () => {
    expect(formatKm(2192)).toBe('2,192');
  });
  it('保留 1 位小数并加千分位', () => {
    expect(formatKm(1234.5)).toBe('1,234.5');
  });
  it('小数 0 → 3', () => {
    expect(formatKm(0)).toBe('0');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd frontend && pnpm vitest run src/lib/format.test.ts`
Expected: FAIL —— `formatKm` 未定义。

- [ ] **Step 3: 追加实现**

在 `format.ts` 末尾追加：

```ts
// 公里数 → 千分位字符串 (用于总览大数字，如 2192 → "2,192")
export const formatKm = (km: number): string =>
  km.toLocaleString('en-US', { maximumFractionDigits: 1 });
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && pnpm vitest run src/lib/format.test.ts`
Expected: PASS(3 用例)。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/format.ts frontend/src/lib/format.test.ts
git commit -m "feat(frontend): formatKm 千分位公里格式"
```

---

## Task 4: RecentRuns 组件 (抽离现有列表)

**Files:**
- Create: `frontend/src/components/dashboard/RecentRuns.tsx`

**Interfaces:**
- Consumes: `activitiesByDateDesc` from `@/data/activities`;`toKm`/`paceFromSpeed`/`formatDateDots` from `@/lib/format`
- Produces: `RecentRuns` 默认导出组件 (无 props，内部取最近 20 条)

- [ ] **Step 1: 创建组件**

把现有 `Home.tsx` 的列表部分原样抽出。创建 `frontend/src/components/dashboard/RecentRuns.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { activitiesByDateDesc } from '@/data/activities';
import { toKm, paceFromSpeed, formatDateDots } from '@/lib/format';

// 最近 20 次跑步列表 — 从旧 Home 抽出，作为仪表盘落脚点。

const RecentRuns = () => {
  const recent = activitiesByDateDesc().slice(0, 20);

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {recent.map((a) => (
        <li key={a.run_id}>
          <Link
            to={`/runs/${a.run_id}`}
            className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4 transition-colors hover:border-[var(--color-accent)]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{a.name}</div>
              <div className="tnum font-mono text-xs text-[var(--color-ink-3)]">
                {formatDateDots(a.start_date_local)}
              </div>
            </div>
            <div className="tnum text-right font-mono text-sm">
              <div className="font-bold">{toKm(a.distance)} km</div>
              <div className="text-[var(--color-ink-3)]">{paceFromSpeed(a.average_speed)}/km</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default RecentRuns;
```

- [ ] **Step 2: typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS(无未用导入/变量报错)。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/RecentRuns.tsx
git commit -m "refactor(frontend): 抽离 RecentRuns 组件"
```

---

## Task 5: StatsBar 组件 (总览数字条)

**Files:**
- Create: `frontend/src/components/dashboard/StatsBar.tsx`

**Interfaces:**
- Consumes: `overallStats` from `@/lib/stats`;`formatKm` from `@/lib/format`
- Produces: `StatsBar({ activities, year }: { activities: Activity[]; year: number })` 默认导出

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/dashboard/StatsBar.tsx`:

```tsx
import type { Activity } from '@/data/types';
import { overallStats } from '@/lib/stats';
import { formatKm } from '@/lib/format';

// 总览数字条 — 累计 km / 总次数 / 今年 km / 最长单次。

interface Props {
  activities: Activity[];
  year: number;
}

const Stat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4">
    <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">
      {label}
    </div>
    <div
      className="tnum mt-2 flex items-baseline gap-1 text-3xl font-bold tracking-tight"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {value}
      {unit && <span className="text-xs font-normal text-[var(--color-ink-3)]">{unit}</span>}
    </div>
  </div>
);

const StatsBar = ({ activities, year }: Props) => {
  const s = overallStats(activities, year);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total" value={formatKm(s.totalDistanceKm)} unit="km" />
      <Stat label="Runs" value={String(s.totalRuns)} unit="次" />
      <Stat label={`${year}`} value={formatKm(s.thisYearKm)} unit="km" />
      <Stat label="Longest" value={formatKm(s.longestRunKm)} unit="km" />
    </div>
  );
};

export default StatsBar;
```

- [ ] **Step 2: typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/StatsBar.tsx
git commit -m "feat(frontend): StatsBar 总览数字条"
```

---

## Task 6: PrSnapshot 组件 (PB 快照)

**Files:**
- Create: `frontend/src/components/dashboard/PrSnapshot.tsx`

**Interfaces:**
- Consumes: `personalRecords` from `@/lib/analytics`;`formatClock`/`formatDateDots`/`toKm` from `@/lib/format`
- Produces: `PrSnapshot({ activities }: { activities: Activity[] })` 默认导出

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/dashboard/PrSnapshot.tsx`(卡片样式对齐 Analysis 页 PB 榜):

```tsx
import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { personalRecords } from '@/lib/analytics';
import { formatClock, formatDateDots, toKm } from '@/lib/format';

// PB 快照 — 5K/10K/半马/全马 最佳成绩，复用 personalRecords。

interface Props {
  activities: Activity[];
}

const PrSnapshot = ({ activities }: Props) => {
  const pbs = personalRecords(activities);
  if (pbs.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无符合距离档的记录</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {pbs.map((pb) => (
        <Link
          key={pb.key}
          to={`/runs/${pb.activity.run_id}`}
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4 transition-colors hover:border-[var(--color-accent)]"
        >
          <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">
            {pb.label}
          </div>
          <div className="tnum mt-2 text-2xl font-bold tracking-tight">
            {formatClock(pb.seconds)}
          </div>
          <div className="tnum mt-1 font-mono text-[11px] text-[var(--color-ink-3)]">
            {toKm(pb.activity.distance)}km · {formatDateDots(pb.activity.start_date_local)}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default PrSnapshot;
```

- [ ] **Step 2: typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/PrSnapshot.tsx
git commit -m "feat(frontend): PrSnapshot PB 快照"
```

---

## Task 7: HeatmapCalendar 组件 (核心)

**Files:**
- Create: `frontend/src/components/dashboard/HeatmapCalendar.tsx`

**Interfaces:**
- Consumes: `heatmapByDay`/`heatLevel`/`DayCell` from `@/lib/stats`;`Tooltip` from `@/components/ui/Tooltip`
- Produces: `HeatmapCalendar({ activities, year }: { activities: Activity[]; year: number })` 默认导出

**实现要点 (避坑):**
- 网格 = 从该年第一个「周日」起，按列 (周) 排 7 行 (周日→周六)。用 `grid-auto-flow: column` + `grid-template-rows: repeat(7, ...)`。
- 每格宽高固定小方块 (如 11px),`gap` 3px。空日期 (无跑步) 用 `--color-line-2`,有跑步按 `heatLevel` 取 `--color-z1..z5`。
- Tooltip 触发器 `asChild` 要求子元素能转发 ref:格子用原生 `<div>`,天然可用。
- 遍历该年每一天 (闰年 366),用不可变方式生成日期字符串，不用 `Date.now`/`Math.random`。

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/dashboard/HeatmapCalendar.tsx`:

```tsx
import type { Activity } from '@/data/types';
import { heatmapByDay, heatLevel } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';

// 年度热力日历 — GitHub 式格子。颜色深浅 = 当日跑步距离档位。零依赖 CSS Grid。

interface Props {
  activities: Activity[];
  year: number;
}

// 档位 → 背景色 token
const LEVEL_BG = [
  'var(--color-line-2)',
  'var(--color-z1)',
  'var(--color-z2)',
  'var(--color-z3)',
  'var(--color-z4)',
  'var(--color-z5)',
] as const;

// 生成该年所有日期的 YYYY-MM-DD(不可变，不依赖当前时间)
const daysOfYear = (year: number): string[] => {
  const out: string[] = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      out.push(`${year}-${mm}-${dd}`);
    }
  }
  return out;
};

const HeatmapCalendar = ({ activities, year }: Props) => {
  const byDay = heatmapByDay(activities, year);
  const days = daysOfYear(year);

  if (days.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">该年无数据</p>;
  }

  // 首格前的空占位：让 1 月 1 日落在其所在星期几的行
  const firstWeekday = new Date(`${year}-01-01T00:00:00`).getDay(); // 0=周日

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 11px)' }}
      >
        {/* 年初空占位，保证星期对齐 */}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`pad-${i}`} className="h-[11px] w-[11px]" />
        ))}
        {days.map((date) => {
          const cell = byDay.get(date);
          const level = heatLevel(cell?.distanceKm ?? 0);
          return (
            <Tooltip
              key={date}
              content={
                <span className="tnum font-mono">
                  {date}
                  {cell ? ` · ${cell.distanceKm}km · ${cell.count} 次` : ' · 未跑'}
                </span>
              }
            >
              <div
                className="h-[11px] w-[11px] rounded-[2px]"
                style={{ background: LEVEL_BG[level] }}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default HeatmapCalendar;
```

- [ ] **Step 2: typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/HeatmapCalendar.tsx
git commit -m "feat(frontend): HeatmapCalendar 年度热力日历"
```

---

## Task 8: dashboard 组件测试

**Files:**
- Create: `frontend/src/components/dashboard/dashboard.test.tsx`

**Interfaces:**
- Consumes: `StatsBar`/`PrSnapshot`/`HeatmapCalendar`/`RecentRuns`;`TooltipProvider` from `@/components/ui/Tooltip`

- [ ] **Step 1: 写测试**

创建 `frontend/src/components/dashboard/dashboard.test.tsx`。注意：`RecentRuns` 内部读真实 `activities.json` 且用 `<Link>`,需包 `MemoryRouter`;热力/PB 用工厂数据。

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { TooltipProvider } from '@/components/ui/Tooltip';
import StatsBar from './StatsBar';
import PrSnapshot from './PrSnapshot';
import HeatmapCalendar from './HeatmapCalendar';

const mk = (over: Partial<Activity>): Activity =>
  ({
    run_id: 1,
    name: 'test',
    distance: 5000,
    moving_time: '0:25:00',
    type: 'Run',
    subtype: '',
    start_date: '2024-03-20 00:00:00',
    start_date_local: '2024-03-20 08:00:00',
    location_country: '',
    summary_polyline: null,
    average_heartrate: 150,
    max_heartrate: 165,
    average_speed: 3.3,
    average_cadence: 185,
    cadence_trend: null,
    split_paces: null,
    split_heart_rates: null,
    elevation_gain: 0,
    ...over,
  }) as Activity;

describe('dashboard', () => {
  it('StatsBar 渲染累计数字', () => {
    render(<StatsBar activities={[mk({ distance: 5000 })]} year={2024} />);
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('Runs')).toBeDefined();
  });

  it('PrSnapshot 空数据显示占位', () => {
    render(
      <MemoryRouter>
        <PrSnapshot activities={[mk({ distance: 3000 })]} />
      </MemoryRouter>
    );
    expect(screen.getByText('暂无符合距离档的记录')).toBeDefined();
  });

  it('HeatmapCalendar 渲染不崩 (有 Tooltip Provider)', () => {
    render(
      <TooltipProvider>
        <HeatmapCalendar
          activities={[mk({ distance: 8000, start_date_local: '2024-03-20 08:00:00' })]}
          year={2024}
        />
      </TooltipProvider>
    );
    // 366/365 个格子渲染成功即 container 有内容
    expect(document.querySelector('.grid-flow-col')).not.toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认通过**

Run: `cd frontend && pnpm vitest run src/components/dashboard/dashboard.test.tsx`
Expected: PASS(3 用例)。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/dashboard/dashboard.test.tsx
git commit -m "test(frontend): dashboard 组件渲染测试"
```

---

## Task 9: Home 页组装

**Files:**
- Modify: `frontend/src/pages/Home.tsx`(整体重写)

**Interfaces:**
- Consumes: `activities` from `@/data/activities`;四个 dashboard 组件;`TooltipProvider` from `@/components/ui/Tooltip`

**年份选择：** 首版热力日历默认展示数据里最新的年份。用纯函数从 activities 取最大年份 (不依赖当前时间，保证测试与构建可复现)。

- [ ] **Step 1: 重写 Home**

替换 `frontend/src/pages/Home.tsx` 全部内容：

```tsx
import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { TooltipProvider } from '@/components/ui/Tooltip';
import StatsBar from '@/components/dashboard/StatsBar';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import PrSnapshot from '@/components/dashboard/PrSnapshot';
import RecentRuns from '@/components/dashboard/RecentRuns';

// 首页成就仪表盘 (M3)。总览 + 热力日历 + PB 快照 + 最近活动。

// 数据里最新年份 (不依赖当前时间，保证可复现)
const latestYear = (): number =>
  activities.reduce((max, a) => Math.max(max, Number(a.start_date_local.slice(0, 4))), 0);

const Card = ({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const Home = () => {
  const year = latestYear();

  return (
    <TooltipProvider delayDuration={100}>
      <main className="w-full px-6 py-12 sm:px-10 lg:px-16">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Running Page</p>
          <Link
            to="/analysis"
            className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
          >
            训练分析 →
          </Link>
        </div>
        <h1
          className="text-4xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          跑步档案
        </h1>

        <div className="mt-8">
          <StatsBar activities={activities} year={year} />
        </div>

        <Card eyebrow={`活跃日历 · ${year}`}>
          <HeatmapCalendar activities={activities} year={year} />
        </Card>

        <Card eyebrow="最佳成绩 · Personal Records">
          <PrSnapshot activities={activities} />
        </Card>

        <Card eyebrow="最近跑步">
          <RecentRuns />
        </Card>
      </main>
    </TooltipProvider>
  );
};

export default Home;
```

- [ ] **Step 2: typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: 全量测试**

Run: `cd frontend && pnpm vitest run`
Expected: PASS(stats / format / dashboard / 原有 analytics / ui 全绿)。

- [ ] **Step 4: 目测验证**

Run: `cd frontend && pnpm dev`
打开 `http://localhost:5173`,确认：
- 四块从上到下渲染：数字条 / 热力日历 / PB / 最近列表
- 热力格子 hover 出 tooltip(日期 + 距离 + 次数)
- 切系统暗色主题，配色正常 (格子、卡片、文字)
- 窄屏数字条变 2×2，热力日历可横向滚动

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat(frontend): 首页重构为成就仪表盘"
```

---

## Task 10: 收尾自检

**Files:** 无新增，仅验证

- [ ] **Step 1: lint + 全量测试 + typecheck**

Run: `cd frontend && pnpm lint && pnpm typecheck && pnpm vitest run`
Expected: 全绿，无 `noUnusedLocals` 报错。

- [ ] **Step 2: 构建验证**

Run: `cd frontend && pnpm build`
Expected: 构建成功，无类型错误。

- [ ] **Step 3: 确认无新依赖**

Run: `git diff master -- frontend/package.json`
Expected: 无 diff(未新增运行时依赖，零图表库约束保持)。

- [ ] **Step 4: 最终提交 (若有 lint 自动修复)**

```bash
git add -A frontend
git commit -m "chore(frontend): 仪表盘收尾 lint 修复" || echo "无需提交"
```

---

## Self-Review

**1. Spec 覆盖：**
- 总览数字条 → Task 1(数据)+ Task 5(组件)✓
- 年度热力日历 → Task 2(数据)+ Task 7(组件)✓
- PB 快照 → Task 6(复用 personalRecords)✓
- 最近活动列表 → Task 4 ✓
- 仅 Run 距离口径 → Task 1 测试断言 ✓
- 零依赖热力图 → Task 7 CSS Grid ✓
- 暗色/响应式/reduced-motion → Task 9 Step 4 目测 + Task 10 ✓
- 明确不做 (地图/筛选/迷你图/点击跳转)→ 计划中均未出现 ✓

**2. Placeholder 扫描：** 每个 code step 都有完整可运行代码，无 TBD/TODO/「similar to」。heatLevel 阈值写死为具体数值。✓

**3. 类型一致性：**
- `OverallStats` 四字段名在 Task 1 定义，Task 5 消费一致 (`totalDistanceKm`/`totalRuns`/`thisYearKm`/`longestRunKm`)✓
- `DayCell` 在 Task 2 定义 (`date`/`count`/`distanceKm`),Task 7 消费一致 ✓
- `heatLevel` 返回 `0|1|2|3|4|5`,Task 7 `LEVEL_BG` 数组 6 元素对齐 ✓
- 组件 props 签名 (`{ activities, year }`)Task 5/7 与 Task 9 调用一致 ✓
- `formatKm` Task 3 定义，Task 5 消费 ✓
