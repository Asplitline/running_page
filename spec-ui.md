# UI Spec (Running Archive)

本规范用于统一站点页面视觉与交互风格，基于当前 `ActivityList` 页面沉淀。  
目标关键词：**Minimal / Rigorous / Airy**（克制、精确、留白）。

---

## 1) 设计目标

- 页面是个人训练档案，不是后台控制台。
- 强调“训练表现 + 身体负荷”的语义分离。
- 信息密度高，但阅读节奏要轻，不压迫。
- 亮暗主题均需一致的语义映射。

---

## 2) 语义配色

### 2.1 Dark Theme (默认)

```css
:root {
  --page-bg: #0b1220;
  --card-bg: #111827;
  --card-bg-strong: #1f2937;
  --border: #2a3648;
  --border-soft: color-mix(in oklch, #2a3648 58%, transparent);

  --text-main: #e5e7eb;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  --metric-primary: #34d399; /* 距离 / 配速 */
  --metric-heart: #fb923c;   /* 平均心率 / 分段心率 */
  --metric-peak: #fb7185;    /* 峰值心率 */
  --metric-neutral: #cbd5e1; /* 步频 / 次级技术指标 */
}
```

### 2.2 Light Theme

```css
[data-theme='light'] {
  --page-bg: #f8fafc;
  --card-bg: #f8fafc;
  --card-bg-strong: #eef2f7;
  --border: #cbd5e1;
  --border-soft: color-mix(in oklch, #94a3b8 20%, transparent);

  --text-main: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;

  --metric-primary: #16a34a;
  --metric-heart: #ea580c;
  --metric-peak: #e11d48;
  --metric-neutral: #334155;
}
```

### 2.3 颜色语义（强制）

- `metric-primary`：距离、配速、完成表现
- `metric-heart`：平均心率、分段心率
- `metric-peak`：峰值心率、高负荷提醒
- `metric-neutral`：步频、技术型次级指标

---

## 3) 布局与节奏

- 主容器最大宽度：`1180px`
- 页面横向留白：`clamp(18px, 4vw, 56px)`（小屏 `16px`）
- 顶部留白：`.activityList` 使用 `padding-top: clamp(20px, 3vw, 40px)`；**概览吸顶条**通过 `margin-top: calc(-1 * clamp(20px, 3vw, 40px))` 与横向负边距对齐父级内边距，使渐变头带贴齐内容区视觉顶端，避免“顶上空一截页面底色”。
- 页面节奏：**吸顶头带（标题 + 日/周/月/年 + 操作）** > 各视图内容区，避免双重视觉中心

推荐值（与实现一致）：

```css
.page {
  padding: clamp(20px, 3vw, 40px) clamp(18px, 4vw, 56px) 64px;
}

.section {
  margin-top: 32px;
}
```

---

## 4) 字体层级

- **概览页标题**（`SUMMARY_PAGE_TITLE` / 如「概览」）：展开态 `clamp(2.25rem, 3.8vw, 2.5rem)`（约 36–40px）；吸顶压缩态 `1.25rem`（20px）
- Section Title：`clamp(1.6rem, 2.4vw, 2.25rem)`（次视觉）
- Label：0.72–0.82rem，低存在感
- Metric Value：0.92–1rem，强调对比而非放大字号

规则：页面内同屏不允许两个“超大标题”竞争注意力。

---

## 5) 组件规范

### 5.0 概览吸顶头（两段式）

实现位置：`ActivityList/style.module.css`（`.overviewSticky`、`.overviewStickyCompact`、`.overviewStickyInner`）+ `index.tsx`（`window.scrollY > 28` 切换压缩态）。

**展开态（页面顶部 / 未滚动或小幅滚动）**

- 条带整体 `position: sticky; top: 0; z-index: 50`
- 目标高度约 **136px**（`min-height` + 内边距）：第一行左侧大标题、右侧主题/首页；第二行 **日 / 周 / 月 / 年** 占满宽
- 背景：深色冷渐变 `linear-gradient(90deg, #171b2f, #0d1b2b)`；`html[data-theme='light']` 下为浅灰渐变，与页面底色区分
- 内层为 **CSS Grid**：标题占 `(1,1)`，操作占 `(2,1)`，Tabs 跨两列第 2 行

**吸顶压缩态（滚动后）**

- 目标高度约 **64px**（小屏可略收紧，如 **56px**）
- 单行三列：**标题（缩小）| Tabs（核心操作，优先可见）| 主题 + 首页**
- 背景：`backdrop-filter: blur(16px)` + 半透明面（暗色 `rgba(13,27,43,0.86)`；亮色 `color-mix` 页面底）；底部分隔：`border-bottom` + 极轻 `box-shadow`
- Tabs 区可 **横向滚动**（`overflow-x: auto`），避免极窄屏换行打乱一行工具栏
- 视图按钮：展开态约 **46px** 高；压缩态 **36px** 高、`min-width` 约 **64px**，选中态保留 **绿色描边/强调色**（`--ui-accent-primary`），减轻压迫感

**与父级内边距**

- `.overviewSticky` 使用与 `.activityList` 上内边距同值的 **负 `margin-top`**，使渐变条顶缘与内容区对齐，不出现条带上方“另一块纯色”断层。

**动效与无障碍**

- 高度、内边距、标题字号、Tab 尺寸过渡约 **0.24s**；`prefers-reduced-motion: reduce` 下关闭相关 `transition`。

### 5.1 View Switcher（在吸顶壳内）

- 不再单独 `position: sticky`；由 **5.0 整条头带** 统一吸顶
- 按钮自身保留表面与边框；激活态使用主题强调色边框与文字
- 压缩态下 Tabs 与标题同一行，为**主操作区**

### 5.2 顶部操作按钮（主题 / 首页）

- **桌面 / 宽屏**：始终在吸顶条右侧，展开与压缩同一行逻辑（Grid 第 3 列）
- **移动端（≤720px）**
  - **未压缩**：与历史行为一致，**右下角 `fixed`**，`z-index: 52`（略高于吸顶条 `50`），`safe-area-inset-bottom` 避让
  - **已压缩**：操作区回到吸顶条内 **`position: static`**，与标题、Tabs 同一行，避免滚动后仅底部 FAB、与 Tabs 语义重复
- 默认弱化，hover / focus-visible 提亮

### 5.3 Card Grid

- 栅格间距建议：`12px`（`sm`）
- 信息块内部通过分割线 + 小标题分组
- 不堆叠“卡片套卡片”的结构

---

## 6) 数据表达规则

- 距离与配速必须同色（`metric-primary`）
- 心率必须暖色（`metric-heart`）
- 峰值心率必须更强暖色（`metric-peak`）
- 步频保持中性，避免与心率抢语义
- 日期、标签、分页器用 `text-muted`

---

## 6.1 心率区间模型（HR Zones）

采用跑步常用 5 区模型（基于最大心率百分比）：

| 区间 | 最大心率占比 | 体感 | 跑步含义 |
| --- | ---: | --- | --- |
| Z1 恢复区 | 50-60% | 很轻松 | 热身、恢复跑、放松跑 |
| Z2 有氧区 | 60-70% | 轻松，可完整说话 | 有氧基础、长距离慢跑 |
| Z3 节奏区 | 70-80% | 有压力，说话变短 | 稳态跑、马拉松配速附近 |
| Z4 阈值区 | 80-90% | 很吃力，呼吸明显重 | 乳酸阈值、节奏跑 |
| Z5 极限区 | 90-100% | 极吃力，难以持续 | 间歇、冲刺、VO2max |

最大心率估算：

```text
HRmax ≈ 220 - 年龄
```

默认个人参数（站点 owner）：

- 出生年份：1997
- 参考年份：2026
- 估算年龄：29
- 估算最大心率：`191 bpm`

区间换算（按 `HRmax=191`）：

- Z1: 96-115 bpm
- Z2: 115-134 bpm
- Z3: 134-153 bpm
- Z4: 153-172 bpm
- Z5: 172-191 bpm

### UI 表达规范（强制）

- 平均心率展示：`HR 156 bpm · Z4`
- 峰值心率展示：`Peak 187 bpm · Z5`
- 可选摘要标签：`平均 Z4，高峰 Z5`

颜色语义（与区间绑定）：

- Z1：灰蓝（恢复）
- Z2：绿色（有氧）
- Z3：青绿（节奏）
- Z4：橙色（阈值）
- Z5：红色（极限）

---

## 7) 交互与可访问性

- 所有按钮需要 `hover` + `focus-visible` 态
- `aria-label` 必填（图标按钮尤其）
- 动效时长控制在 `0.2s~0.28s`
- `prefers-reduced-motion` 下关闭过渡

---

## 8) 页面改造检查清单

每个页面改造后自检：

- [ ] 配色语义是否一致（绿=表现，橙/粉=负荷）
- [ ] 概览吸顶：展开 / 压缩两态高度与对齐是否符合预期（顶缘无断层、压缩态 Tabs 可用）
- [ ] 吸顶条与 `.activityList` 的负边距是否与 `padding` 同步修改（避免再次出现顶部空隙）
- [ ] 是否收紧了上半区留白，让内容区更早进入视野
- [ ] 标题层级是否只有一个主视觉中心
- [ ] 移动端：未压缩时 FAB 可达；压缩后头带内操作是否仍可达
- [ ] 亮暗主题是否都验证过对比度与可读性（含吸顶半透明与底边分隔）

---

## 9) 推荐实施顺序（改其他页面时）

1. 先替换语义颜色变量（不动结构）
2. 再收紧顶部节奏；若做吸顶头带，**与父容器 padding 成对设计**（必要时负边距对齐渐变）
3. 然后统一卡片间距与指标色
4. 最后做移动端操作位（FAB vs 吸顶内联）与细节态（hover/focus）

