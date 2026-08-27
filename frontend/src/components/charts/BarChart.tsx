import { useMemo } from 'react';
import {
  Bar,
  BarChart as RcBarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  axisProps,
  chartColors,
  ChartEmpty,
  ChartTooltipBox,
} from './theme';
import type { ChartTooltipProps } from './theme';

// Recharts BarChart 薄封装。单序列柱状图 (月度日里程 / 年度月里程 / 生涯年里程)。

export interface BarDatum {
  label: string; // X 轴刻度文本
  value: number;
}

interface Props {
  data: BarDatum[];
  valueLabel?: string; // tooltip 里数值的单位文案，如 "km"
  height?: number;
  highlightLabel?: string; // 指定某个 label 用强调色高亮(如峰值年份柱)
}

export const BarChart = ({
  data,
  valueLabel = '',
  height = 200,
  highlightLabel,
}: Props) => {
  const c = useMemo(chartColors, []);
  const axis = axisProps(c);

  if (!data.length) return <ChartEmpty />;

  const renderTooltip = ({
    active,
    payload,
    label,
  }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
      <ChartTooltipBox>
        {label} · {payload[0].value}
        {valueLabel}
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RcBarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid
          vertical={false}
          stroke={c.line}
          strokeDasharray="2 4"
        />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip
          content={renderTooltip}
          cursor={{ fill: c.card2, opacity: 0.6 }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={48}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={
                highlightLabel && d.label === highlightLabel ? c.accent : c.route
              }
            />
          ))}
        </Bar>
      </RcBarChart>
    </ResponsiveContainer>
  );
};
