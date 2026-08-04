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
   ├─ get_activity(id) ───── 单条详情 summaryDTO   ← 只取了 7 个字段注入 GPX,其余丢弃
   └─ download_activity(GPX) ─ 轨迹点(经纬度+时间+心率+步频+海拔)
   │
   ▼
track.py 逐点计算 ──► split_paces / split_heart_rates / cadence_trend
   ▼
db.py 落库(19 字段) ──► activities.json ──► 前端
```

### 2.2 当前落库的 19 个字段 (前端目前全部可用数据)

`run_id, name, distance, moving_time, elapsed_time, type, subtype, start_date,
start_date_local, location_country, summary_polyline, average_heartrate,
max_heartrate, average_speed, average_cadence, cadence_trend, split_paces,
split_heart_rates, elevation_gain`(+ 派生 `streak`)

### 2.3 三个层次的数据缺口

| 层次 | 现状 | 佳明能给什么 | 改动成本 |
| --- | --- | --- | --- |
| **① summaryDTO 已在手却被丢弃** | `get_activity()` 返回详情，只取 7 字段 | 海拔上升/下降、最低/最高海拔、**卡路里**、平均/最大步幅、垂直振幅、触地时间、**平均/最大功率**、**有氧/无氧训练效果 TE**、体感温度 | 🟢 加几行提取 |
| **② 佳明专门 API 没调** | 只用 3 个方法 | `get_activity_hr_in_timezones`(**心率区间时长分布** → 直接兑现 spec 的 5 区模型)、`get_activity_details`(**逐秒时间序列**,比 GPX 精)、`get_activity_splits`(佳明官方分段)、`get_max_metrics`(**VO2max**)、`get_training_status`(**训练状态/负荷**)、`get_race_predictions`(**各距离成绩预测**)、`get_rhr_day`(每日静息心率) | 🟡 加同步方法 + 落库字段 |
| **③ 派生指标没算** | 有 avg_hr + avg_pace 未组合 | **有氧效率 (pace÷hr 趋势)、心率漂移、配速 - 心率散点、各距离 PB、周训练负荷 ACWR、streak 打卡日历** | 🟢 纯前端可算 (部分) |

### 2.4 结论

- **不动后端**,前端就能做:PB 追踪、有氧效率趋势、配速 - 心率散点、月/周趋势、streak 日历、单次详情页 (用现有 split 画曲线)。**占分析价值 ~70%,零后端风险。**
- **后端加几行提取 summaryDTO**:多得心率区间分布、卡路里、海拔剖面、功率、TE。**ROI 最高 —— 数据已拉回来。**
- **深挖佳明新 API**:VO2max 趋势、训练状态、成绩预测。数据最全但同步变慢、需处理认证/限流。

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
│ 心率区间时长分布(横向堆叠条,Z1-Z5)             │  ← hr_in_timezones (后端新增)
├─────────────────────────────────────────────┤
│ 步频趋势(前半/后半对比)· 海拔剖面 · 卡路里/TE     │  ← cadence_trend(现有)+ summaryDTO(小改)
├─────────────────────────────────────────────┤
│ 🗺 轨迹地图(有 polyline 才显示,否则降级隐藏)      │  ← summary_polyline(现有, 多为 null → 降级)
└─────────────────────────────────────────────┘
```

> ⚠️ 详情页地图**降级策略**:数据里 `summary_polyline` 很多是 `null`。有轨迹显示地图，无轨迹只展示图表，不留空块。

---

## 4. 数据契约演进 (向后兼容，不破坏现有硬契约)

### 4.1 硬契约 (不可破坏)

- ORM 表名 `activities`、`ACTIVITY_KEYS` 现有 19 字段的语义与类型
- `activities.json` 数组结构、现有字段名
- `run_id` 主键、token 机制、GPX 落盘路径

### 4.2 新增字段 (全部 nullable，老数据无值不崩)

| 新字段 | 类型 | 来源 | 阶段 |
| --- | --- | --- | --- |
| `calories` | Float? | summaryDTO(已在手) | P1 |
| `elevation_loss` | Float? | summaryDTO | P1 |
| `min_elevation` / `max_elevation` | Float? | summaryDTO | P1 |
| `avg_power` / `max_power` | Float? | summaryDTO | P1 |
| `aerobic_te` / `anaerobic_te` | Float? | summaryDTO | P1 |
| `avg_stride_length` | Float? | summaryDTO | P1 |
| `hr_zones` | JSON? | `get_activity_hr_in_timezones` | P2 |
| `vo2max` | Float? | `get_max_metrics` | P2 |
| `training_status` | String? | `get_training_status` | P2 |

> schema 演进已有机制托底：`db.py::add_missing_columns` 会自动 ALTER TABLE 补列，无需手写迁移。

### 4.3 前端派生 (不落库，前端算)

`personal_records`(各距离 PB)、`aerobic_efficiency`(pace÷hr 序列)、`weekly_load`(ACWR)、`streak_calendar`。

---

## 5. 模块 → 数据 → 来源 映射表 (实施依据)

| 分析模块 | 页面 | 所需字段 | 数据来源 | 优先级 |
| --- | --- | --- | --- | --- |
| 单次配速曲线 | 详情页 | `split_paces` | 🟢 现有 | **P0** |
| 单次心率分段 + 漂移 | 详情页 | `split_heart_rates` | 🟢 现有 | **P0** |
| 步频趋势 | 详情页 | `cadence_trend` | 🟢 现有 | **P0** |
| 各距离 PB 榜 | 分析页 | `distance` + `moving_time` | 🟢 现有 (前端算) | **P0** |
| 有氧效率趋势 | 首页/分析 | `average_speed` + `average_heartrate` | 🟢 现有 (前端算) | **P0** |
| 配速 - 心率散点 | 分析页 | `average_speed` + `average_heartrate` | 🟢 现有 | P1 |
| streak 打卡日历 | 首页 | `streak` + `start_date_local` | 🟢 现有 | P1 |
| 周跑量趋势 + ACWR | 首页/分析 | `distance` + `start_date` | 🟢 现有 (前端算) | P1 |
| 卡路里 / 海拔剖面 | 详情页 | `calories` `elevation_*` | 🟡 后端小改 | P1 |
| 训练效果 TE | 详情页 | `aerobic_te` `anaerobic_te` | 🟡 后端小改 | P1 |
| **心率区间时长分布** | 详情页/分析 | `hr_zones` | 🔴 佳明新 API | P2 |
| VO2max 趋势 | 首页/分析 | `vo2max` | 🔴 佳明新 API | P2 |
| 训练状态卡片 | 首页 | `training_status` | 🔴 佳明新 API | P2 |

---

## 6. 分阶段实施计划

### 阶段 0 — 地基 (路由 + 数据 hook，不改视觉)

1. 引入 `/runs/:id` 路由 → verify:能通过 URL 打开任一跑步的空详情页
2. 抽 `useActivity(id)` hook(从 activities.json 定位单条)→ verify:详情页能拿到该条数据
3. 抽公共派生计算 `utils/analytics.ts`(PB / 有氧效率 / 周负荷)→ verify:单测覆盖计算正确性

### 阶段 1 — P0 纯前端价值兑现 (零后端风险)

4. 单次详情页：配速曲线 + 心率分段 + 步频趋势 (用现有 split 数据，Recharts)
5. 分析页新增:PB 榜 + 有氧效率趋势
6. 首页仪表盘骨架：近期 KPI 行 + 周跑量趋势 + 生涯大数字 (地图降权为卡片)
   → verify:三层路由跑通，首页近期在上/生涯在下，详情页图表正确

### 阶段 2 — P1 后端小改 (提取已在手的 summaryDTO)

7. `downloader.py`:`_extract_summary_infos` 扩展提取 calories/elevation/power/TE
8. `db.py`:`ACTIVITY_KEYS` + ORM 加 nullable 字段 (靠 add_missing_columns 自动迁移)
9. 详情页补：卡路里 / 海拔剖面 / TE;首页补 streak 日历 + ACWR
   → verify:重跑同步，老活动不崩 (字段 null),新活动有值

### 阶段 3 — P2 佳明深挖 API(数据天花板)

10. `auth.py`:新增 `get_hr_zones` / `get_vo2max` / `get_training_status` 封装
11. 同步流程：按 activity_id 拉心率区间;按日期拉 VO2max/训练状态
12. 详情页补心率区间分布条;首页补训练状态卡片 + VO2max 趋势
    → verify:限流/认证异常降级不崩，无数据活动跳过

### 阶段 4 — 打磨

13. 成就系统、移动端细节态、动效、亮暗对比复验 (对照 spec-design 检查清单)

---

## 7. 风险与护栏

| 风险 | 护栏 |
| --- | --- |
| 佳明 API 限流/封号 | P2 新 API 串行 + 重试 + 失败降级;沿用现有 token 机制 |
| `summary_polyline` 多为 null | 详情页地图降级隐藏，不留空块 |
| 老数据无新字段 | 全部 nullable，前端 `?? fallback` |
| schema 迁移 | 复用 `add_missing_columns`,禁止破坏现有 19 字段 |
| CI 同步卡死 (历史坑) | 延续 `SKIP_REVERSE_GEOCODE`;新 API 加超时 |
| 改动过大失控 | 严格按阶段推进，每阶段独立可验证、可合并 |

---

## 8. 待冒险家确认

- [ ] 三层信息架构 (首页仪表盘 / 分析页 / 详情页) 是否符合预期？
- [ ] 首页「近期在上、生涯在下」的分区线框是否 OK?
- [ ] 分阶段顺序 (先 P0 纯前端见效 → 再后端小改 → 最后深挖 API) 是否认可？
- [ ] `/analysis` 路由命名，还是保留现有 `/summary`?
- [ ] 是否需要我先做**一个页面的可交互原型**(建议：单次详情页，价值最锐利) 让你看效果？
