# 设计系统规范 v2 (Forest / Athletic Archive)

> **基准来源**:`aiyuanzi-running.html`(冒险家确认满意的设计)。本规范全盘提取其设计 DNA，作为重构后 UI 的**单一真相源**。
> **旧 `spec-ui.md` 作废**——保留为历史参考，不再遵循。
> 关键词：**森林绿意 · 克制精确 · 有机通透**(Forest / Rigorous / Airy)。

---

## 0. 设计基调

- 冷静的**森林绿灰**中性 (连中性色都带绿偏移，是选择而非默认灰)。
- 数据是主角：大号 tabular 数字 + `Archivo` 几何标题 + `IBM Plex Mono` 数据标签。
- 极轻阴影几乎贴平，胶囊圆角大量使用，整体有机、通透、不像后台。
- 亮暗双主题语义一致。

---

## 1. 配色 Token

### 1.1 中性 (界面层 · 森林绿灰)

```css
:root {
  --paper:  #EDF1EE;   /* 页底 (冷绿灰白) */
  --card:   #FFFFFF;   /* 卡片面 */
  --card-2: #F5F8F6;   /* 次级面 */
  --ink:    #17211C;   /* 主文字 (墨绿黑) */
  --ink-2:  #57635D;   /* 次要文字 */
  --ink-3:  #94A099;   /* muted / 标签 */
  --line:   #DCE3DE;   /* 边框 */
  --line-2: #E8EDE9;   /* 更轻分隔 */
}
[data-theme='dark'] {
  --paper:  #0F1513;   /* 深墨绿 */
  --card:   #181F1C;
  --card-2: #1E2723;
  --ink:    #E9EEEB;
  --ink-2:  #9DA9A2;
  --ink-3:  #68746D;
  --line:   #28322D;
  --line-2: #222B27;
}
```

### 1.2 心率分区 Z1-Z5(绿→黄→橙→红 强度渐变)

```css
:root {
  --z1: #58B99D;  /* 青绿 · 恢复 (50-60%) */
  --z2: #82BE53;  /* 草绿 · 有氧 (60-70%) */
  --z3: #E5B93C;  /* 金黄 · 节奏 (70-80%) */
  --z4: #EF7D33;  /* 橙   · 阈值 (80-90%) */
  --z5: #DC4C3F;  /* 红   · 极限 (90-100%) */
  --accent: var(--z4);   /* 品牌强调 = Z4 橙 */
  --route:  #378ADD;      /* 轨迹蓝 */
  --bar-muted: #DCE3DE;
}
[data-theme='dark'] {
  --route: #5FA8E8;
  --bar-muted: #2E3934;
  /* Z1-Z5 暗色下沿用同色相，靠 --card 底衬托;如需可微调 */
}
```

> **心率分区语义**(强制):绿=恢复/有氧、黄=节奏、橙=阈值、红=极限。强度靠**色相 + 亮度递增**双编码，天然色盲友好。

### 1.3 语义规则 (强制)

- **距离 / 配速**:`--ink`(主色) 或 `--route` 蓝 (图表中)
- **心率**:分区色 (平均心率用对应 Z 色)
- **强调 / 主操作**:`--accent`(Z4 橙)
- **日期 / 标签 / 分页**:`--ink-3`
- 图表多序列 (如不同活动类型):见 §6 图表色

---

## 2. 字体 Token(自托管，不外链 Google Fonts)

```css
:root {
  --font-display: 'Archivo', 'Noto Sans SC', sans-serif;        /* 标题 / 大数字 */
  --font-body:    'Noto Sans SC', -apple-system, 'PingFang SC', sans-serif;  /* 正文 / 中文 */
  --font-mono:    'IBM Plex Mono', 'Noto Sans SC', monospace;   /* 数据 / 标签 */
}
```

- **自托管**:下载 Archivo(500/700/800 + italic)、IBM Plex Mono(400/500)、Noto Sans SC(400/500/700),放 `public/fonts/`,用 `@font-face` + `font-display: swap`。**禁止外链 Google Fonts**(国内访问慢/不稳)。
- 所有数字统一 `font-variant-numeric: tabular-nums`。

### 字号层级 (px，与基准一致)

| 用途 | 字号 | 字重 |
| --- | ---: | ---: |
| 视图大标题 (日/周/月/年) | 44–58 | 800 |
| Section 标题 | 21 | 700 |
| 卡片标题 | 16–17 | 700 |
| 大数字 (KPI) | 26–46 | 700/800 |
| 正文 | 13–15 | 400/500 |
| 标签 / eyebrow | 11–12 | 500 |
| 微标注 | 10.5–11.5 | 500 |

主力字重 **500**;标题 700/800。

---

## 3. 形状 · 阴影 · 间距 Token

```css
:root {
  --radius: 14px;                          /* 卡片主圆角 */
  --radius-pill: 99px;                     /* 胶囊 (标签/按钮，大量使用) */
  --radius-sm: 6px;                        /* 小元素 */
  --radius-xs: 2px;                        /* 刻度 / 装饰条 */
  --shadow: 0 1px 2px rgba(23,33,28,.05);  /* 极轻，几乎贴平 */
}
[data-theme='dark'] { --shadow: 0 1px 2px rgba(0,0,0,.3); }
```

- **间距刻度**(实测高频):`4 · 6 · 8 · 16 · 18 · 22 · 24 · 40`px。Section 用 `padding: 40px 0 8px`。
- **容器**:`max-width: 1140px`。
- **断点**:`600px`(移动)、`760px`、`920px`。

---

## 4. 核心组件模式 (复用三件套)

### 4.1 eyebrow(标志性小标签 — 强记忆点)

```css
.eyebrow {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  font-family: var(--font-mono); font-size: 12px;
  letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3);
}
.eyebrow::before {   /* 橙色小横杠 = 视觉签名 */
  content: ""; width: 22px; height: 3px;
  border-radius: 2px; background: var(--accent);
}
```

### 4.2 card

- 背景 `--card`,边框 `1px --line`,圆角 `--radius`,阴影 `--shadow`,内距 `22–24px`。
- 不堆叠卡片套卡片;内部用 `--line-2` 分隔 + eyebrow/小标题分组。

### 4.3 数据表达 (mono + num)

- 数据值用 `.mono`(IBM Plex Mono)+ `tabular-nums`。
- KPI = 大 num + 小 unit(baseline 对齐)。

### 4.4 胶囊标签 / 段控件 (seg)

- `border-radius: 99px`,用于 tag、分段切换、跳转按钮。选中态 `--accent`。

---

## 5. 信息架构 (基准已内建，与 spec-refactor 三层对齐)

基准的**日 / 周 / 月 / 年四视图** + 最佳成绩 (PB)+ 近期记录 + verdict(结论),正好对应重构方案：

| 基准区块 | 重构映射 (spec-refactor) |
| --- | --- |
| 四视图切换 | 分析页 `/analysis`(用 Radix Tabs 封装) |
| 最佳成绩 PB | 分析页 PB 榜 (M2-1) |
| 近期记录 | 首页/分析页最近跑步列表 |
| verdict 结论 | 单次详情页训练结论 |
| 大数字 KPI | 各页 KPI 行 |

---

## 6. 图表配色 (数据可视化)

- **心率分区**:直接用 §1.2 的 Z1-Z5。
- **单序列图表**(配速曲线等):用 `--route` 蓝或 `--accent` 橙。
- **多序列图表**(需要区分类型时):优先用**同色系不同亮度**或**直接标注 + 少量色相**;若必须多色相，须过色盲验证 (dataviz 验证器 CVD ΔE ≥ 8)。
- 网格/坐标轴用 `--line`(recessive);数值/图例用文字色，不用序列色。

---

## 7. 交互与无障碍

- 所有按钮 `hover` + `focus-visible`;图标按钮 `aria-label` 必填。
- 动效 `0.2–0.28s`,`prefers-reduced-motion` 下关闭 (基准已有 `@media (prefers-reduced-motion:no-preference)` 包裹)。
- 亮暗主题均验证对比度 (WCAG AA)。

---

## 8. 与技术栈的衔接

- **Tailwind 4 CSS-first**:把本规范的 token 写进 `src/styles/index.css` 的 `@theme`,组件用 token 而非硬编码。
- **Radix 薄封装**:`components/ui/` 的组件视觉全走本规范 token(见 spec-refactor §0.2)。
- **禁止两套 token 并存**:本规范是唯一真相源，不引入 shadcn/其他预置 token。

---

## 9. 落地检查清单

每个页面/组件完成后自检：

- [ ] 中性色用森林绿灰 token，未出现纯中性灰
- [ ] 心率分区用 Z1-Z5，语义正确 (绿=恢复 红=极限)
- [ ] 强调色 = Z4 橙，未滥用
- [ ] 数字 tabular-nums 对齐;数据用 mono
- [ ] eyebrow 小标签 + 橙横杠签名一致
- [ ] 圆角：卡片 14px / 胶囊 99px / 小 6px
- [ ] 阴影极轻，未出现重投影
- [ ] 字体自托管，无 Google Fonts 外链
- [ ] 亮暗双主题对比度达标
- [ ] hover/focus-visible/reduced-motion 齐全
