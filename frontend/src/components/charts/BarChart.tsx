import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { PartialTheme } from '@nivo/theming';

// Nivo ResponsiveBar 薄封装。颜色/字体走 CSS 变量 (design/tokens.ts 之外的
// 运行时读取方式)：用 getComputedStyle 读当前生效的 --color-* 值，
// 保证亮暗主题切换时图表颜色跟随更新，不需要重新渲染整个组件树。

export interface BarDatum {
  label: string; // X 轴刻度文本
  value: number;
  [key: string]: string | number; // 满足 @nivo/bar 的 BarDatum 索引签名约束
}

interface Props {
  data: BarDatum[];
  valueLabel?: string; // tooltip 里数值的单位文案，如 "km"
  height?: number;
}

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
};

const useNivoTheme = (): PartialTheme =>
  useMemo(() => {
    const ink3 = cssVar('--color-ink-3', '#94a099');
    const line = cssVar('--color-line', '#dce3de');
    const card = cssVar('--color-card', '#ffffff');
    const ink = cssVar('--color-ink', '#17211c');
    const mono = cssVar(
      '--font-mono',
      'ui-monospace, "SF Mono", Menlo, monospace'
    );
    const textStyle = {
      fontFamily: mono,
      fontSize: 10,
      fill: ink3,
    };
    return {
      text: textStyle,
      axis: {
        domain: { line: { stroke: line } },
        ticks: {
          line: { stroke: line },
          text: textStyle,
        },
      },
      grid: { line: { stroke: line, strokeDasharray: '2 4' } },
      tooltip: {
        container: {
          background: card,
          color: ink,
          fontSize: 12,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        },
      },
      labels: { text: textStyle },
    };
  }, []);

export const BarChart = ({ data, valueLabel = '', height = 200 }: Props) => {
  const theme = useNivoTheme();
  const route = cssVar('--color-route', '#378add');

  if (!data.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data}
        keys={['value']}
        indexBy="label"
        margin={{ top: 8, right: 8, bottom: 24, left: 32 }}
        padding={0.3}
        colors={[route]}
        theme={theme}
        borderRadius={2}
        enableLabel={false}
        enableGridY={true}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        tooltip={({ indexValue, value }) => (
          <span className="tnum font-mono text-xs">
            {indexValue} · {value}
            {valueLabel}
          </span>
        )}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  );
};
