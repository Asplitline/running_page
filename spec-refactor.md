# 前端重构方案 (Running Analysis Platform)

> 目标：把当前「地图展示站」升级为「跑步训练分析平台」。
> 基于真实代码 + 佳明数据边界分析制定，不是凭空构想。
> 设计语言见 `spec-design.md`(森林绿意调 / Archivo 字体 / 心率 5 区 / 四视图，基于 `aiyuanzi-running.html`),本文档只定**信息架构 + 数据契约 + 分阶段计划**。

---

## 0. 决策基线 (已与冒险家对齐)

| 维度 | 决策 |
| --- | --- |
| 重构定位 | **架构重整**(拆结构，不是加功能也不是换皮) |
| 受众 | **两者兼顾** — 首页给访客爽，详情/分析页给自己深挖 |
| 首页地图 | **保留但降权** — 从主视觉退成一个板块 |
| 首屏重心 | **近期状态在上，生涯叙事在下** |
| 后端 | **前后端都深挖** — 调用佳明未用的 API |
| 技术栈 | **升级** — 详见 §0.1 分级升级建议 |
| 推进 | **先出方案文档**(本文),审完再写代码 |

---

## 0.1 技术栈升级 (分级建议)

> 原则：重构与升级**解耦推进** —— 先在独立 commit 完成升级并验证 `pnpm ci` 通过，再在干净基线上做重构。避免"升级 bug"和"重构 bug"混在一起无法定位。

### 现状 vs 最新 (实测锁定版本 → npm registry 最新)

| 库 | 当前 | 最新 | 跨度 | 分档 |
| --- | --- | --- | --- | --- |
| react / react-dom | 18.2.0 | 19.2.8 | 大版本 | 🟢 该升 |
| @types/react | **19.1.10** | — | ⚠️ 已与 react18 **错配** | 🟢 随 react19 修正 |
| react-router-dom | 6.15.0 | 7.18.2 | 大版本 | 🟡 谨慎升 |
| recharts | 2.15.2 | 3.10.1 | 大版本 | 🟡 谨慎升 |
| mapbox-gl | 2.15.0 | 3.27.0 | 大版本 | 🟡 谨慎升 |
| react-map-gl | 7.1.6 | 8.1.2 | 大版本 | 🟡 随 mapbox3 |
| **tailwindcss** | 4.1.10 | **4.3.3** | 小版本 | 🟢 该升 |
| **@tailwindcss/vite** | 4.1.11 | **4.3.3** | 随 tailwind | 🟢 该升 |
| **prettier-plugin-tailwindcss** | 0.5.13 | **0.6.x** | 小版本 | 🟢 该升 |
| vite | 7.1.2 | 8.2.0 | 大版本 | 🔴 先别升 |
| typescript | 5.2.2 | 7.0.2 | 大版本 | 🔴 先别升 |

### 分档理由 (基于实际代码扫描)

**🟢 该升 (低风险，先做)**
- **React 18 → 19**:代码已用 `createRoot`(19 就绪)、**零 `defaultProps`**、仅 2 处 `propTypes`(顺手清)。同时修正 `@types/react@19` 与 `react@18` 的**现存错配**。
- **TypeScript 5.2 → 5.9**(注意：**不是 7**):升到 5.x 最新稳定，拿到更好的类型推断。**TS 7 是原生重写版，生态刚起步，禁止此时跳**。
- **Tailwind 4.1 → 4.3(三包一起对齐)**:v4 已是**最新大版本**(不存在跨大版本选项),项目已是 v4 现代姿势 —— `@tailwindcss/vite` 插件 + CSS-first(`src/styles/index.css` 用 `@import "tailwindcss"` / `@theme`,无 `tailwind.config.js`),零迁移负担。三个包必须同版对齐：`tailwindcss` + `@tailwindcss/vite` 升 4.3.3、`prettier-plugin-tailwindcss` 升 0.6.x。**重构会大量写新样式，先升可享受 4.3 的新 utility 与更快编译。**

**🟡 谨慎升 (重构中受益，单独验证)**
- **React Router 6 → 7**:v7 是 Remix 合流版，`createBrowserRouter` API 兼容，但有配置面变化。重构要加 `/runs/:id`、`/analysis` 路由，**升 7 顺理成章**,但需单独跑通再继续。
- **Recharts 2 → 3**:详情页/分析页要大量用图表，v3 API 有调整 (部分组件 props 变更)。**建议：重构新图表直接按 v3 写，一步到位**,避免先写 v2 再迁移。
- **mapbox-gl 2 → 3 + react-map-gl 7 → 8**:v3 性能更好但 access token/worker 有破坏性变更;地图已降权，**可作为独立小任务验证**,不阻塞主线。

**🔴 先别升 (收益低 / 风险高)**
- **Vite 7 → 8**:刚发布，插件生态 (svgr / tsconfig-paths / tailwind vite plugin) 兼容性未稳。**等生态跟上**。
- **TypeScript 7**:原生重写版，早期。**明确不升**。

### 推荐升级顺序 (独立 commit，每步 `pnpm ci` 验证)

1. `chore: React 18→19 + @types 修正 + 清理 propTypes` → verify:`pnpm ci` 通过 + 页面可跑
2. `chore: TypeScript 5.2→5.9 + Tailwind 4.3` → verify:`pnpm ci` 通过
3. `chore: React Router 6→7`(重构开始前)→ verify:现有路由跑通
4. Recharts 3 / mapbox 3:**不单独升，在重构对应阶段随新代码引入并验证**

---

## 0.2 无头组件库选型 (headless UI)

> 需求 (冒险家):组件统一切换用无头组件。重构要大量做 **Tabs(日/周/月/年 + 视图切换)、Dialog(年度总结/详情弹窗)、Tooltip(心率区间/指标)、Popover/Dropdown、Calendar(streak 打卡)**。
> 现状：**项目零 headless 库，纯手写**(如 `ViewButton` = 手写 `button` + `aria-pressed`)。迁移成本低，是引入的好时机。

### 候选对比 (实测最新版 + React 19 兼容)

| 库 | 最新版 | React19 | 体质 | Tailwind 契合 | 结论 |
| --- | --- | --- | --- | --- | --- |
| **Radix UI Primitives** | 1.1.x | ✅ 原生 | 按组件分包、tree-shake 友好、无样式、a11y 标杆 | ⭐⭐⭐ 极佳 (无样式，className 直传) | 🟢 **首选** |
| **Base UI** | 1.0.0-rc | ✅ | Radix/MUI 原班人马新作，定位继任者，但仍 RC | ⭐⭐⭐ 极佳 | 🟡 观望 (未 GA) |
| **Headless UI** | 2.2.x | ✅ | Tailwind 官方出品，但**组件少**(无 Tabs 之外的日历/complex) | ⭐⭐⭐ 原生为 Tailwind 设计 | 🟡 组件覆盖不足 |
| **Ark UI** | 5.37.x | ✅ | 基于 Zag.js，组件最全 (含 Calendar/DatePicker) | ⭐⭐⭐ 无样式 | 🟡 较重、API 抽象层多 |
| **React Aria Components** | 1.19.x | ✅ | Adobe 出品，a11y 最强 (国际化/触屏/RTL) | ⭐⭐ 可用但 render-props 风格重 | 🟡 偏重、学习曲线陡 |

### 推荐:Radix UI Primitives 为主，按需补充

**为什么是 Radix**
- **无样式**:只给行为 + a11y + 键盘导航，视觉 100% 由你的 `spec-design.md` 语义 token 控制 —— 契合"保留现有设计系统"的硬约束。
- **按组件分包**:`@radix-ui/react-tabs`、`@radix-ui/react-dialog` 独立安装，只引入用到的，bundle 可控。
- **a11y 标杆**:WAI-ARIA 完整、`focus-visible`、`prefers-reduced-motion`、焦点陷阱开箱即用 —— 正好覆盖 spec-design §7 的可访问性要求，不用自己维护。
- **React 19 原生 peer**、社区最大、文档最全。

**Radix 覆盖不到的场景 → 精准补充**
- **Calendar / DatePicker**(streak 打卡日历):Radix **无**日历原语。方案二选一：
  - 轻量：用现有数据 + CSS Grid 手写热力日历 (GitHub 贡献图风格),**不引库**(推荐，契合极简)。
  - 需交互日历：补 `@ark-ui/react` 的 DatePicker(仅此一处)。
- **智能定位 (Tooltip/Popover 防溢出)**:Radix 内置 `@floating-ui`,无需额外装。

### 落地约束 (强制)

- **零样式泄漏**:只用 Radix 的行为层，所有视觉走 `spec-design` token / Tailwind class,**不引入任何预置主题**(不装 Radix Themes)。
- **渐进替换**:先替换重构新页面 (详情页 Tabs / Tooltip、分析页 Dialog),**不动**现有已稳定的 ActivityList 手写交互，除非顺带收益明确。
- **封装一层**:在 `components/ui/` 下做薄封装 (`Tabs`/`Dialog`/`Tooltip`),注入项目默认样式与 a11y 默认值，页面只用封装组件 —— 隔离未来换库风险。

### 为什么不用 shadcn/ui(已评估,决定不用)

**shadcn 不是组件库，是"基于 Radix + Tailwind 的组件代码生成器 + 复制粘贴分发平台"。** 官方定义：*built with TypeScript, Tailwind CSS, and **Radix UI***。它的 CLI 把「Radix 行为 + Tailwind 样式」的成品代码复制进你的 `src/`,归你所有。

- **契合度实测极高**:已全面支持 Tailwind 4(`@theme`/`@theme inline`)、React 19(移除 forwardRef)、Vite、OKLCH 颜色 —— 与本项目栈几乎无缝。
- **但对本项目是净负担**:shadcn 组件自带一整套设计 token(`--background`/`--primary`/`--radius`/new-york 风格),会与本项目 `spec-design` 语义 token(`--ink`/`--z1`~`--z5`/`--accent`...)**两套并存**。要么逐 class 改造对齐 (丢掉 shadcn 大半样式价值),要么牺牲设计系统的单一真相源。
- **本质等价**:选 shadcn 底层仍是 Radix。对已有设计规范的极简个人项目，**直接用 Radix + 自建薄封装**更干净 —— 少一层别人的样式约定，token 单一来源。

> 决策 (冒险家):**纯 Radix + 自建薄封装**。shadcn 可作为「写某个复杂组件时参考其 Radix 组合方式」的只读参考，但不接入其 CLI、不复制其 token 体系。

### 升级顺序补充

- 放在技术栈升级**第 3 步之后、重构阶段 0** 引入：`chore: 引入 Radix + 建 components/ui 薄封装层`。

---

## 1. 现状画像 (基于实际代码)

### 1.1 技术栈 (无历史包袱)

React 18 + TS + Vite 7 + **Tailwind 4** + Mapbox GL + Recharts + react-router 6。

### 1.2 现有两个割裂页面

- `/` (`pages/index.tsx`) — 地图为中心：热力图 + 年份统计 + 城市统计 + RunTable。
- `/summary` (`pages/total.tsx` → `ActivityList`) — 训练档案：日/周/月/年切换、PeriodCard 折线图、心率区间、配速分段。**团队投入最多、最成熟的部分。**

**问题**:两个页面像两个应用，访客与自用视角混在一起，且**没有单次跑步详情页**。

### 1.3 已沉淀的优秀资产 (必须保留)

- **新设计系统** `spec-design.md`(基于 `aiyuanzi-running.html`):森林绿意调、Archivo/IBM Plex Mono/Noto Sans SC 三档字体、心率 5 区 (绿=恢复→红=极限)、日/周/月/年四视图、eyebrow 橙横杠签名。
- 数据层已很厚：`split_paces` / `split_heart_rates` / `cadence_trend` / `elevation_gain` / `streak` 后端已算好。
- 主题 / i18n / 无障碍全覆盖。

> ⚠️ 旧 `spec-ui.md` 已作废 (暖蓝深色调 + 两段式吸顶头),不再遵循;视觉一律以 `spec-design.md` 为准。

---

## 2. 数据边界分析 (核心 —— 分析页天花板由此决定)

### 2.1 当前数据链路

```
Garmin Connect (garminconnect 库, 144 个方法)
   │
   ├─ get_activities() ──── 活动列表摘要
   ├─ get_activity(id) ───── 单条详情 summaryDTO   ← 已提取(阶段2完成,2026-08-13)
   └─ download_activity(GPX) ─ 轨迹点(经纬度+时间+心率+步频+海拔)
   │
   ▼
track.py 逐点计算 ──► split_paces / split_heart_rates / cadence_trend
   ▼
db.py 落库(28 字段,阶段2后) ──► activities.json ──► 前端
```

### 2.2 当前落库字段 (阶段 2 完成后，前端目前全部可用数据)

原 19 字段:`run_id, name, distance, moving_time, elapsed_time, type, subtype, start_date,
start_date_local, location_country, summary_polyline, average_heartrate,
max_heartrate, average_speed, average_cadence, cadence_trend, split_paces,
split_heart_rates, elevation_gain`(+ 派生 `streak`)

**阶段 2 新增 9 字段** (2026-08-13 完成，全部来自 `get_activity()` 的 `summaryDTO`，已用真实活动核实字段名):
`calories, elevation_loss, min_elevation, max_elevation, avg_power, max_power,
aerobic_te(← summaryDTO.trainingEffect), anaerobic_te, avg_stride_length`

### 2.3 三个层次的数据缺口 (阶段 2 完成后更新)

| 层次 | 现状 | 佳明能给什么 | 改动成本 |
| --- | --- | --- | --- |
| ~~① summaryDTO 已在手却被丢弃~~ | ✅ **已完成 (阶段2)** | calories/elevation/power/TE/步幅 9 字段已提取入库 | 已完成 |
| **② 佳明专门 API 没调** | 只用 3 个方法 (`get_activities`/`get_activity`/`download_activity`) | `get_activity_hr_in_timezones`(**心率区间时长分布**, 按 activity_id, 与现有 summaryDTO 同粒度)、`get_max_metrics`(**VO2max**, 按日期 cdate)、`get_training_status`(**训练状态/负荷**, 按日期)、`get_race_predictions`(**各距离成绩预测**, 按日期区间)、`get_rhr_day`(**静息心率**, 按日期) | 🟡 加同步方法 + 落库字段/新表 |
| **③ 派生指标没算** | 有 avg_hr + avg_pace 未组合 | **有氧效率 (pace÷hr 趋势)** ✅已完成(阶段1)、**心率漂移、配速-心率散点** ✅已完成(阶段1)、**各距离 PB** ✅已完成(阶段1)、**周训练负荷 ACWR、streak 打卡日历** ✅已完成(阶段1,首页近期状态区+HeatmapCalendar) | 🟢 纯前端可算 |

### 2.4 结论 (阶段 2 完成后更新)

- ~~不动后端,前端就能做~~ ✅ **阶段 1 已完成**:PB 追踪、有氧效率趋势、配速-心率散点、streak 日历、单次详情页。
- ~~后端加几行提取 summaryDTO~~ ✅ **阶段 2 已完成**:卡路里、海拔剖面、功率、TE、步幅已落库并在详情页展示。
- **深挖佳明新 API (阶段 3，待推进)**:VO2max 趋势、训练状态、成绩预测、心率区间分布。数据最全但同步变慢、需处理认证/限流，且**数据粒度不统一**(见 §6 阶段 3 拆解)。

---

## 3. 目标信息架构 (三层)

现在 2 个割裂页面 → 重整为 3 层清晰架构：

```
┌─ / 首页 = 数据仪表盘 (Dashboard)              ← 访客 + 自己都先看这里
│    [近期状态区] 本周/本月跑量 · 最近配速心率趋势 · 训练状态
│    [生涯叙事区] 总里程 · 总次数 · 马拉松完成数 · streak · 成就
│    [地图板块]   热力图(降权为一个卡片)
│    [最近跑步]   最近 N 次列表,点击进详情页
│
├─ /analysis 分析页 = 深挖(现 ActivityList 升级)  ← 自己复盘
│    日/周/月/年切换 · 趋势 · PB 榜 · 心率负荷 · 有氧效率 · 配速-心率散点
│
└─ /runs/:id 单次详情页(全新,当前完全缺失)       ← 复盘单次训练
     配速曲线 · 逐公里心率 · 步频趋势 · 心率区间分布 · 海拔剖面 · 轨迹地图(降级)
```

### 3.1 首页仪表盘线框 (近期在上 / 生涯在下)

```
┌─────────────────────────────────────────────┐
│ 顶栏(eyebrow 签名 + 导航)   主题 · 分析页 · 首页 │
├─────────────────────────────────────────────┤
│ ▓▓ 近期状态(自用优先) ▓▓                       │
│ ┌────────┬────────┬────────┬────────┐         │
│ │本周跑量 │本月跑量 │训练状态 │ VO2max │  ← KPI 行  │
│ └────────┴────────┴────────┴────────┘         │
│ ┌─────────────────────┬───────────────┐       │
│ │ 近 8 周跑量趋势(柱)  │ 有氧效率趋势(线)│       │
│ └─────────────────────┴───────────────┘       │
├─────────────────────────────────────────────┤
│ ░░ 生涯叙事(访客友好) ░░                        │
│ ┌──────┬──────┬──────┬──────┬──────┐          │
│ │总里程 │总次数 │总时长 │马拉松 │连跑天│  ← 大数字   │
│ └──────┴──────┴──────┴──────┴──────┘          │
│ [成就徽章行:里程碑 / 首马 / 最长距离 …]          │
├─────────────────────────────────────────────┤
│ 🗺 热力地图(降权为一个卡片,可点击进全屏)          │
├─────────────────────────────────────────────┤
│ 最近跑步 ▸(列表,每行点击 → /runs/:id)           │
└─────────────────────────────────────────────┘
```

> **进度标注 (2026-08-13)**：近期状态区已实现「本周跑量 KPI + 近8周趋势柱图」(缺训练状态/VO2max，待阶段3)；生涯叙事区（英雄区）已实现总里程/年度目标环/三年对比；地图板块与成就徽章行**未开始**。

### 3.2 单次详情页线框 (全新)

```
┌─────────────────────────────────────────────┐
│ ← 返回   成都市 全程马拉松   2024-03-24         │
│ [距离 42.7km][时间 4:22][配速 6:08][心率 156]  │  ← KPI 摘要行(语义色)
├─────────────────────────────────────────────┤
│ 逐公里配速曲线(bar/line,慢=暖色 快=冷色)        │  ← split_paces (现有)
├─────────────────────────────────────────────┤
│ 逐公里心率 + 心率漂移标注                        │  ← split_heart_rates (现有)
├─────────────────────────────────────────────┤
│ 心率区间时长分布(横向堆叠条,Z1-Z5)             │  ← hr_in_timezones (阶段3，待实现)
├─────────────────────────────────────────────┤
│ 步频趋势(前半/后半对比)· 海拔剖面 · 卡路里/TE     │  ← cadence_trend(现有)+ summaryDTO(✅阶段2完成)
├─────────────────────────────────────────────┤
│ 🗺 轨迹地图(有 polyline 才显示,否则降级隐藏)      │  ← summary_polyline(现有, 多为 null → 降级)
└─────────────────────────────────────────────┘
```

> ⚠️ 详情页地图**降级策略**:数据里 `summary_polyline` 很多是 `null`。有轨迹显示地图，无轨迹只展示图表，不留空块。
>
> **进度标注 (2026-08-13)**：配速曲线/逐公里心率/步频趋势/训练效果(卡路里+TE+功率) 已实现。心率区间分布/海拔剖面图/轨迹地图**未开始**。

---

## 4. 数据契约演进 (向后兼容，不破坏现有硬契约)

### 4.1 硬契约 (不可破坏)

- ORM 表名 `activities`、`ACTIVITY_KEYS` 现有字段的语义与类型
- `activities.json` 数组结构、现有字段名
- `run_id` 主键、token 机制、GPX 落盘路径

### 4.2 新增字段 (全部 nullable，老数据无值不崩)

| 新字段 | 类型 | 来源 | 阶段 | 状态 |
| --- | --- | --- | --- | --- |
| `calories` | Float? | summaryDTO(`calories`) | P1 | ✅ 已落库 (2026-08-13) |
| `elevation_loss` | Float? | summaryDTO(`elevationLoss`) | P1 | ✅ 已落库 |
| `min_elevation` | Float? | summaryDTO(`minElevation`) | P1 | ✅ 已落库 |
| `max_elevation` | Float? | summaryDTO(`maxElevation`) | P1 | ✅ 已落库 |
| `avg_power` | Float? | summaryDTO(`averagePower`) | P1 | ✅ 已落库 |
| `max_power` | Float? | summaryDTO(`maxPower`) | P1 | ✅ 已落库 |
| `aerobic_te` | Float? | summaryDTO(`trainingEffect`) ⚠️与最初假设的`aerobicTrainingEffect`不同,已用真实数据核实 | P1 | ✅ 已落库 |
| `anaerobic_te` | Float? | summaryDTO(`anaerobicTrainingEffect`) | P1 | ✅ 已落库 |
| `avg_stride_length` | Float? | summaryDTO(`strideLength`) | P1 | ✅ 已落库 |
| `hr_zones` | JSON? | `get_activity_hr_in_timezones(activity_id)` | P2 | ⏳ 待实现,字段名未核实 |
| `vo2max` | Float? | `get_max_metrics(cdate)` — **按日期非按活动** | P2 | ⏳ 待实现,需数据模型设计 |
| `training_status` | String? | `get_training_status(cdate)` — **按日期非按活动** | P2 | ⏳ 待实现,需数据模型设计 |
| `resting_hr` | Int? | `get_rhr_day(cdate)` — **按日期非按活动** | P2(spec 新增，原方案遗漏) | ⏳ 待实现 |
| `race_predictions` | JSON? | `get_race_predictions()` — **按日期区间，非按活动** | P2(spec 新增) | ⏳ 待实现 |

> schema 演进已有机制托底：`db.py::add_missing_columns` 会自动 ALTER TABLE 补列，无需手写迁移。

### 4.3 前端派生 (不落库，前端算)

- `personal_records`(各距离 PB) ✅ 已实现 (`lib/analytics.ts::personalRecords`)
- `aerobic_efficiency`(pace÷hr 序列) ✅ 已实现 (`lib/analytics.ts::aerobicEfficiency` / `efficiencyByMonth`)
- `pace_hr_scatter`(配速-心率散点) ✅ 已实现 (`lib/analytics.ts::paceHrScatter`)
- `weekly_volume`(近 N 周跑量趋势) ✅ 已实现 (`lib/stats.ts::weeklyVolume` / `thisWeekKm`)
- `streak_calendar` ✅ 已实现 (`components/dashboard/HeatmapCalendar.tsx`)
- `weekly_load`(ACWR) ⏳ 未实现

---

## 5. 模块 → 数据 → 来源 映射表 (实施依据，2026-08-13 更新状态)

| 分析模块 | 页面 | 所需字段 | 数据来源 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 单次配速曲线 | 详情页 | `split_paces` | 🟢 现有 | P0 | ✅ 完成 |
| 单次心率分段 + 漂移 | 详情页 | `split_heart_rates` | 🟢 现有 | P0 | ✅ 完成(漂移标注未做) |
| 步频趋势 | 详情页 | `cadence_trend` | 🟢 现有 | P0 | ✅ 完成 |
| 各距离 PB 榜 | 分析页 | `distance` + `moving_time` | 🟢 现有 (前端算) | P0 | ✅ 完成 |
| 有氧效率趋势 | 首页/分析 | `average_speed` + `average_heartrate` | 🟢 现有 (前端算) | P0 | ✅ 完成 |
| 配速-心率散点 | 分析页 | `average_speed` + `average_heartrate` | 🟢 现有 | P1 | ✅ 完成(提前于P1做了) |
| streak 打卡日历 | 首页 | `streak` + `start_date_local` | 🟢 现有 | P1 | ✅ 完成 |
| 周跑量趋势 | 首页 | `distance` + `start_date` | 🟢 现有 (前端算) | P1 | ✅ 完成 |
| 周训练负荷 ACWR | 分析页 | 周跑量序列 (前端算) | 🟢 现有 (前端算) | P1 | ⏳ 未做 |
| 卡路里 / 海拔剖面 / TE / 功率 / 步幅 | 详情页 | `calories` `elevation_*` `*_power` `*_te` `avg_stride_length` | 🟡 后端小改 | P1 | ✅ 完成(2026-08-13,海拔剖面图未做,只落库) |
| **心率区间时长分布** | 详情页/分析 | `hr_zones` | 🔴 佳明新 API (`get_activity_hr_in_timezones`) | P2 | ⏳ 未做，字段名未核实 |
| VO2max 趋势 | 首页/分析 | `vo2max` | 🔴 佳明新 API (`get_max_metrics`) | P2 | ⏳ 未做，按日期粒度需数据模型设计 |
| 训练状态卡片 | 首页 | `training_status` | 🔴 佳明新 API (`get_training_status`) | P2 | ⏳ 未做，按日期粒度需数据模型设计 |
| 静息心率趋势 | 首页/分析(spec新增) | `resting_hr` | 🔴 佳明新 API (`get_rhr_day`) | P2 | ⏳ 未做 |
| 各距离成绩预测 | 分析页(spec新增) | `race_predictions` | 🔴 佳明新 API (`get_race_predictions`) | P2 | ⏳ 未做 |

---

## 6. 分阶段实施计划 (2026-08-13 更新)

### 阶段 0 — 地基 (路由 + 数据 hook，不改视觉) ✅ 已完成

1. ✅ 引入 `/runs/:id` 路由
2. ✅ 抽 `useActivity` 等价物 `getActivityById`(`data/activities.ts`)
3. ✅ 抽公共派生计算 `lib/analytics.ts` + `lib/stats.ts`(PB / 有氧效率 / 周跑量 / 散点)

### 阶段 1 — P0 纯前端价值兑现 (零后端风险) ✅ 已完成

4. ✅ 单次详情页：配速曲线 + 心率分段 + 步频趋势
5. ✅ 分析页新增:PB 榜 + 有氧效率趋势 + 配速-心率散点(提前完成)
6. ✅ 首页仪表盘骨架：英雄区(生涯大数字+三年对比) + 近期状态区(本周跑量+近8周趋势) + 坚持/峰值双栏 + 最近跑步列表

### 阶段 2 — P1 后端小改 (提取已在手的 summaryDTO) ✅ 已完成 (2026-08-13)

7. ✅ `downloader.py`:`_extract_summary_infos` 扩展提取 calories/elevation/power/TE/步幅(**用真实活动核实了字段名，`aerobic_te` 实际对应 `trainingEffect` 而非最初假设的字段名**)
8. ✅ `db.py`:`ACTIVITY_KEYS` + ORM 加 9 个 nullable 字段(`add_missing_columns` 自动迁移已验证)
9. ✅ 详情页补：卡路里 / TE / 平均功率(新增卡片「训练效果」)
   - ⚠️ **遗留**：海拔剖面图(min/max/loss 已落库但前端未画图)、首页 streak 日历已有(阶段1做了)、ACWR 未做

### 阶段 3 — P2 佳明深挖 API(数据天花板，待推进)

> **关键差异**：本阶段 4 个 API 中，`get_activity_hr_in_timezones` 是**逐次跑步粒度**(跟 §4.2 已完成的 P1 字段同构)，而 `get_max_metrics`/`get_training_status`/`get_rhr_day`/`get_race_predictions` 是**按日期的全局身体状态快照**，不属于 `activities` 表的行语义 —— 需要先做小型数据模型设计，不能照搬阶段2的"加列"套路。
>
> **执行前必须**：用真实佳明账号数据探测这 4 个 API 的真实返回 schema(参考阶段2的教训 —— 社区命名假设与真实字段有偏差，`aerobicTrainingEffect` 实际是 `trainingEffect`)。探测方式：一次性、不落盘异常字段、验证后清理调试代码，同用户账号密钥严格按当次会话使用、不写入任何文件。

**3a. 心率区间分布 (逐次跑步粒度，风险最低，建议先做)**

10. `auth.py`:封装 `get_hr_zones(activity_id)`
11. `downloader.py`:下载新活动时按 activity_id 追加调用，提取 5 档时长(单位待探测确认,推测秒)，序列化进 `hr_zones` JSON 字段(仿照 `cadence_trend` 的 JSON 存法)
12. `db.py`:`ACTIVITY_KEYS` + ORM 加 `hr_zones`(String/JSON 存文本)
13. 详情页新增「心率区间分布」横向堆叠条(参照 spec-design 心率 5 区色)
    → verify:老活动 `hr_zones=null` 不崩;限流/异常时该活动跳过 hr_zones 不影响主同步流程

**3b. 按日期身体状态 (VO2max / 训练状态 / 静息心率 / 成绩预测，需先设计数据模型)**

14. **数据模型设计**(先讨论，非直接写代码):
    - 选项 A：新建 `daily_metrics` 表(`date` 主键，`vo2max`/`training_status`/`resting_hr` 列)，与 `activities` 表独立，前端按日期查询关联
    - 选项 B：挂在"当天最新一条活动"上(简单但语义不准确 —— 训练状态是"人"的状态不是"某次跑步"的属性)
    - **倾向选项 A**，但需要冒险家确认是否值得为此新增一张表(复杂度 vs 首页 KPI 行的展示价值)
15. 按选定模型实现同步(`auth.py` 封装 4 个新方法 + 独立同步流程，与 GPX 下载解耦，避免拖慢主同步)
16. 首页 KPI 行补训练状态卡片 + VO2max 趋势;分析页补成绩预测卡片
    → verify:限流/认证异常降级不崩，无数据日期跳过

### 阶段 4 — 打磨 (未开始)

17. 海拔剖面图(详情页，用已落库的 `min_elevation`/`max_elevation`/`elevation_loss` 画图)
18. 周训练负荷 ACWR(分析页，纯前端算，复用 `weeklyVolume`)
19. 成就系统、地图板块降权卡片、移动端细节态、动效、亮暗对比复验

---

## 7. 风险与护栏

| 风险 | 护栏 |
| --- | --- |
| 佳明 API 限流/封号 | P2 新 API 串行 + 重试 + 失败降级;沿用现有 token 机制 |
| `summary_polyline` 多为 null | 详情页地图降级隐藏，不留空块 |
| 老数据无新字段 | 全部 nullable，前端 `?? fallback`(已在阶段2验证:`add_missing_columns` 自动补列 + 老数据读出 `None` 不崩) |
| schema 迁移 | 复用 `add_missing_columns`,禁止破坏现有字段(已验证) |
| CI 同步卡死 (历史坑) | 延续 `SKIP_REVERSE_GEOCODE`;新 API 加超时 |
| 改动过大失控 | 严格按阶段推进，每阶段独立可验证、可合并 |
| **API 字段名猜测偏差** (阶段2实际发生) | **禁止**照抄社区命名假设直接写提取代码;必须先用真实账号数据一次性探测字段名，验证后立即清理调试代码和临时数据文件，不落盘敏感响应体 |
| **凭据处理** (阶段2实际发生 — 用户曾把真实 token 直接贴入对话) | 任何真实 token/密钥出现在对话中必须视为已泄露，仅做一次性只读验证、不写入任何文件、用后清理内存引用，并提醒用户尽快轮换 |

---

## 8. 待冒险家确认 (更新)

- [x] 三层信息架构 (首页仪表盘 / 分析页 / 详情页) — 已用行动确认，阶段0-2 均按此结构实现
- [x] 首页「近期在上、生涯在下」的分区线框 — 已实现(英雄区+近期状态区+双栏+列表)
- [x] 分阶段顺序 (先 P0 纯前端见效 → 再后端小改 → 最后深挖 API) — 已按此推进，阶段0-2 完成
- [x] `/analysis` 路由命名 — 已采用，非 `/summary`
- [ ] **阶段 3a (心率区间分布) 是否现在推进？** 风险最低，与阶段2模式一致，只需一次真实数据探测确认 `get_activity_hr_in_timezones` 返回结构
- [ ] **阶段 3b 数据模型：新建 `daily_metrics` 表，还是暂缓？** VO2max/训练状态/静息心率/成绩预测是"人"的状态而非"跑步"的属性，值得单独设计
- [ ] **是否需要先做一次真实数据探测**(核实 4 个新 API 的返回字段名)，再继续写阶段3代码？(强烈建议 —— 阶段2已证明社区命名假设不可靠)
