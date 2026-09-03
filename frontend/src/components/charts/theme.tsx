import type { ReactNode } from 'react';
import type { TooltipContentProps } from 'recharts';
import type {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';

// Recharts 图表共享主题。颜色走 CSS 变量运行时读取 (getComputedStyle)，
// 保证亮暗主题切换时图表颜色跟随；Recharts 的 SVG 属性不接受 var()，
// 必须解析成具体色值再传入。

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
};

// 图表用到的全部色值与字体，一次性读出
export const chartColors = () => ({
  route: cssVar('--color-route', '#378add'),
  accent: cssVar('--color-accent', '#ef7d33'),
  ink: cssVar('--color-ink', '#17211c'),
  ink3: cssVar('--color-ink-3', '#94a099'),
  line: cssVar('--color-line', '#dce3de'),
  card: cssVar('--color-card', '#ffffff'),
  card2: cssVar('--color-card-2', '#f4f6f4'),
  mono: cssVar('--font-mono', 'ui-monospace, "SF Mono", Menlo, monospace'),
});

// 坐标轴统一样式：细刻度、无轴线、等宽小字
export const axisProps = (c: ReturnType<typeof chartColors>) => ({
  tickLine: false,
  axisLine: false,
  tick: { fill: c.ink3, fontSize: 10, fontFamily: c.mono },
});

// 图表内 tooltip 外壳 — 与 Radix Tooltip 视觉一致 (卡片底 + 细边 + 软阴影)
export const ChartTooltipBox = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-[var(--color-ink)] shadow-[var(--shadow-soft)]">
    <div className="tnum font-mono">{children}</div>
  </div>
);

// 空态占位
export const ChartEmpty = ({ text = '暂无数据' }: { text?: string }) => (
  <p className="text-sm text-[var(--color-ink-3)]">{text}</p>
);

// Recharts Tooltip 的 content 回调参数类型。
// Tooltip 组件默认泛型是 <ValueType, NameType>，自定义 content 必须匹配这套宽泛型，
// 收窄成 <number, string> 会与 Tooltip 自身的 props 类型冲突。
export type ChartTooltipProps = TooltipContentProps<ValueType, NameType>;
