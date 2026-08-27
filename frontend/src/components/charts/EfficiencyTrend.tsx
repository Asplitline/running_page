import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EfficiencyPoint } from '@/lib/analytics';
import { axisProps, chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 有氧效率月趋势。上行 = 进步 (同心率跑更快)。
// Y 轴按数据范围自适应 (效率值变化幅度小，从 0 起会压平曲线)。

interface Props {
  points: EfficiencyPoint[];
}

export const EfficiencyTrend = ({ points }: Props) => {
  const c = useMemo(chartColors, []);
  const axis = axisProps(c);

  if (points.length < 2) {
    return <ChartEmpty text="数据不足，至少需要两个月" />;
  }

  const renderTooltip = ({
    active,
    payload,
  }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as EfficiencyPoint;
    return (
      <ChartTooltipBox>
        {p.month} · 效率 {p.value} · {p.count} 次
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="effFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.route} stopOpacity={0.18} />
            <stop offset="100%" stopColor={c.route} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} width={44} domain={['dataMin', 'dataMax']} />
        <Tooltip
          content={renderTooltip}
          cursor={{ stroke: c.line, strokeDasharray: '2 4' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={c.route}
          strokeWidth={2}
          fill="url(#effFill)"
          dot={{ r: 3.5, fill: c.route, stroke: c.card, strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: c.route, stroke: c.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
