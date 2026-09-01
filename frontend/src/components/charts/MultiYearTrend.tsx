import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisProps, chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 多年月度里程叠加折线 — 年视图的同期对比图。
// 每年一条线共用 1~12 月的 X 轴,当年粗实线、往年细淡线,
// 免去"上下滚动比较两张独立柱图"。

interface Props {
  // 已按年份升序;每项是该年 12 个月的里程
  years: {
    year: number;
    monthlyChartValues: { month: number; km: number }[];
  }[];
  height?: number;
  // 移动端只标 1/4/7/10 月,避免 12 个刻度挤成一团
  compact?: boolean;
}

const MONTH_TICKS_COMPACT = [1, 4, 7, 10];

export const MultiYearTrend = ({
  years,
  height = 240,
  compact = false,
}: Props) => {
  const c = useMemo(chartColors, []);
  const axis = axisProps(c);

  // 12 行,每行含各年该月里程:{ month: 1, "2024": 30, "2025": 45, ... }
  const data = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const row: Record<string, number> = { month };
        for (const y of years) {
          const hit = y.monthlyChartValues.find((m) => m.month === month);
          row[String(y.year)] = hit?.km ?? 0;
        }
        return row;
      }),
    [years]
  );

  if (!years.length) return <ChartEmpty />;

  const latestYear = years[years.length - 1].year;

  const renderTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <ChartTooltipBox>
        {label} 月
        {payload.map((p) => (
          <span key={String(p.name)} className="ml-2">
            {String(p.name)} {p.value}km
          </span>
        ))}
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
      >
        <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="2 4" />
        <XAxis
          dataKey="month"
          {...axis}
          ticks={compact ? MONTH_TICKS_COMPACT : undefined}
          tickFormatter={(m: number) => `${m}月`}
        />
        <YAxis {...axis} width={44} />
        <Tooltip content={renderTooltip} cursor={{ stroke: c.line }} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="plainline"
          wrapperStyle={{ fontFamily: c.mono, fontSize: 11, color: c.ink3 }}
        />
        {years.map((y) => {
          const isLatest = y.year === latestYear;
          return (
            <Line
              key={y.year}
              type="monotone"
              dataKey={String(y.year)}
              // 当年用强调色粗线,往年淡化 —— 视觉主次即"今年 vs 往年"
              stroke={isLatest ? c.accent : c.ink3}
              strokeWidth={isLatest ? 2.5 : 1.25}
              strokeOpacity={isLatest ? 1 : 0.5}
              strokeDasharray={isLatest ? undefined : '3 3'}
              dot={false}
              activeDot={isLatest ? { r: 4 } : { r: 3 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};
