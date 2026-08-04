# 首页成就仪表盘 · 设计文档

日期:2026-08-04
状态：待评审
范围：仅 `frontend/` 子包，重构 `pages/Home.tsx`

## 背景

当前 [Home.tsx](../../../frontend/src/pages/Home.tsx) 只做一件事：取最近 20 条活动渲染成列表 (44 行)。注释自陈是「S6 临时首页，M3 起重构为仪表盘」——本文档即 M3 的仪表盘重构。

数据侧弹药充足 (`activities.json`,278 次 / 2.4 年 / 跑步累计 2192 km / 心率 100% 覆盖 / 241 条轨迹),首页只用了其中一勺。丰富度不够的根因是首页只做了「最近列表」这一件事，不是数据不够。

## 目标

把首页从「最近列表」升级为「成就仪表盘」——跑者打开即看到：跑了多少、坚持得怎样、最强成绩、最近动态。

**本版四块 (已收敛):**

1. 总览数字条 (Stats Bar)
2. 年度热力日历 (Heatmap Calendar)
3. PB 快照 (PR Snapshot)
4. 最近活动列表 (保留，置于底部)

**明确不做 (YAGNI，留后续里程碑):**

- 轨迹地图 (重活，与当前零地图库选型冲突，单独里程碑)
- 运动类型筛选 / 搜索 / 无限滚动 (属「强化列表」方向，非本方向)
- 效率趋势迷你图 (分析页已有完整版，首版不进首页)
- 热力格子点击跳转 (一天多次活动有歧义，留后续)

## 设计约束 (继承现有选型)

- **零图表库**:热力日历用纯 CSS Grid + `div` 方格，配色走 `--color-z1..z5` 梯度，与现有 `SplitPaceChart`「CSS bar」风格一脉相承
- **token 驱动**:所有颜色/圆角/阴影用 `styles/index.css` 的 CSS 变量，不硬编码，自动继承暗色主题
- **纯函数 + 测试**:所有派生统计放 `lib/`,数值计算必须有 vitest 兜底
- **复用优先**:PB 复用已有 `analytics.ts::personalRecords`;时钟/日期/距离复用 `format.ts`

## 页面结构

```
Home (main)
├─ Header:eyebrow "Running Page" + 大标题 + "训练分析 →" 链接
├─ StatsBar          总览数字条   —— 新组件
├─ HeatmapCalendar   年度热力日历 —— 新组件(核心)
├─ PrSnapshot        PB 快照      —— 新组件(复用 personalRecords)
└─ RecentRuns        最近活动列表 —— 从现有 Home 抽出的列表
```

各块用现有 `Card`(eyebrow + 圆角边框卡) 包裹，视觉与 Analysis/RunDetail 一致。

## 组件设计

### 1. StatsBar —— 总览数字条

- **展示**:累计距离 (km)、总次数、今年距离 (km)、最长单次 (km)。四个 KPI，响应式 2×2 / 1×4。
- **数据来源**:新增纯函数 `lib/stats.ts::overallStats(activities)`
- **视觉**:复用 RunDetail 已有的 `Kpi` 卡样式 (考虑抽到 `components/ui/` 共用),`.tnum` 对齐，大号 `--font-display`
- **口径**:距离统计**只计 `type === 'Run'`**(骑行/徒步距离量级不同，混算会误导);次数可含全部或仅跑步，本版取「仅跑步」保持与距离口径一致

### 2. HeatmapCalendar —— 年度热力日历 (核心)

- **展示**:GitHub 式格子。默认展示**当前年**(2026),右上角年份切换 (2024/2025/2026，数据实际存在的年份)。每格 = 一天，颜色深浅按当日跑步距离分 5 档 (无 → z1 浅 → z5 深)。
- **布局**:CSS Grid,`grid-auto-flow: column`,7 行 (周一~周日) × 53 列 (周)。左侧月份标签，顶部星期标签。
- **数据来源**:新增 `lib/stats.ts::heatmapByDay(activities, year)` → `Map<'YYYY-MM-DD', { count, distanceKm }>`;再由组件铺成完整年的格子网格 (无活动的日期也要占位成空格)。
- **配色分档**:按当日距离分位。0 → `--color-line-2`(空);>0 起用 `--color-z1..z5` 五档梯度。分档阈值：先用固定档 (如 0/3/6/10/15+ km),实现时按数据分布微调，写进纯函数便于测试。
- **交互**:hover 出 Radix Tooltip(复用 `components/ui/Tooltip`),显示「2026-07-28 · 8.2km · 1 次」。**不做点击跳转**(本版)。
- **降级**:某年无数据 → 显示占位文案;`prefers-reduced-motion` 已由全局 CSS 覆盖。

### 3. PrSnapshot —— PB 快照

- **展示**:5K/10K/半马/全马 最佳成绩卡，与 Analysis 页 PB 榜同款 (距离档 + 用时 + 日期),点击跳详情。
- **数据来源**:直接复用 `analytics.ts::personalRecords(activities)`,零新逻辑。
- **与 Analysis 的关系**:首页展示同一份数据的快照;不抽公共组件避免过度设计，两处各自渲染 (卡片 JSX 简单，重复成本低于抽象成本)。若后续第三处复用再抽。

### 4. RecentRuns —— 最近活动列表

- 把现有 Home 的列表原样抽成组件，置于仪表盘底部。保持最近 20 条、点击进详情。

## 数据层新增

新建 `frontend/src/lib/stats.ts`(纯函数，配 `stats.test.ts`):

```ts
// 总览统计 (距离口径：仅 Run)
export interface OverallStats {
  totalDistanceKm: number;   // 累计跑步距离
  totalRuns: number;         // 跑步总次数
  thisYearKm: number;        // 今年跑步距离
  longestRunKm: number;      // 最长单次跑步
}
export const overallStats = (activities: Activity[], year: number): OverallStats

// 热力聚合：某年逐日跑步量
export interface DayCell { date: string; count: number; distanceKm: number; }
export const heatmapByDay = (activities: Activity[], year: number): Map<string, DayCell>

// 距离 → 热力档位 (0~5),纯函数便于测试
export const heatLevel = (distanceKm: number): 0 | 1 | 2 | 3 | 4 | 5
```

`format.ts` 可能新增 `formatKm`(带千分位，如 `2,192`),视实现需要。

## 组件文件清单

```
frontend/src/
├─ pages/Home.tsx                    重写:组装四块
├─ components/dashboard/
│  ├─ StatsBar.tsx                   新
│  ├─ HeatmapCalendar.tsx            新(核心)
│  ├─ PrSnapshot.tsx                 新
│  └─ RecentRuns.tsx                 新(从旧 Home 抽出)
├─ components/ui/Kpi.tsx             (可选)从 RunDetail 抽出共用,或保持各自定义
├─ lib/stats.ts                      新
└─ lib/stats.test.ts                 新
```

`Card` 若在 Home/Analysis/RunDetail 三处重复，考虑抽到 `components/ui/Card.tsx`;本版可先局部定义，不强制。

## 数据流

编译期 `activities.json` → `data/activities.ts` 已有导出 → `lib/stats.ts` 纯函数派生 → 各 dashboard 组件消费。全程无运行时请求，与现有架构一致。

## 错误 / 边界处理

- 空数据集：各块显示占位文案 (「暂无数据」),不崩。
- 某年无活动：热力日历显示空网格 + 提示。
- 缺字段：`Activity` 新字段已全 optional，统计函数对 null/0 做保护 (参照 `analytics.ts` 现有风格)。
- 距离口径：非 Run 类型不计入距离统计，避免骑行 12 次污染跑步累计。

## 测试策略

- `stats.test.ts`:`overallStats` 口径正确 (只算 Run)、`heatmapByDay` 聚合正确 (同日多次合并)、`heatLevel` 分档边界。
- 沿用现有 `analytics.test.ts` / `ui.test.tsx` 的 vitest + Testing Library 模式。
- 组件层:HeatmapCalendar 至少一个渲染快照 + tooltip 存在性测试。

## 分阶段实现顺序

1. **P1 数据层**:`lib/stats.ts` + `stats.test.ts`(先测试兜底口径)
2. **P2 骨架**:重写 Home 为四块容器 + `RecentRuns`(抽现有列表，保证不回退)
3. **P3 StatsBar + PrSnapshot**:低风险，复用已有逻辑/样式
4. **P4 HeatmapCalendar**:核心与最花工，单独收口 (CSS Grid + tooltip)
5. **P5 自检**:暗色主题、响应式、空数据、reduced-motion

每阶段可独立验证 (typecheck + vitest + 目测),互不阻塞回退。

## 验收标准

- 首页渲染四块，视觉与 Analysis/RunDetail 同一设计语言 (eyebrow / token / tnum)
- 数字口径正确 (总距离仅 Run、今年口径按 year 过滤)
- 热力日历三年可切，hover 有 tooltip，暗色主题正常
- `pnpm --filter @running-page/frontend typecheck && test` 通过
- 无新增运行时依赖 (零图表库约束保持)
