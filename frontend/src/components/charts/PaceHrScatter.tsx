import { useMemo } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { PaceHrPoint } from '@/lib/analytics';
import { formatPace } from '@/lib/format';
import { axisProps, chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 配速-心率散点。X = 配速(越靠右越快，轴已反转)，Y = 心率(越靠上越高)。
// 点大小按距离区分 (ZAxis)，颜色统一心率色。

interface Props {
  points: PaceHrPoint[];
}

export const PaceHrScatter = ({ points }: Props) => {
  const c = useMemo(chartColors, []);
  const axis = axisProps(c);

  if (points.length < 2) {
    return <ChartEmpty text="数据不足，至少需要两次带心率的跑步" />;
  }

  const renderTooltip = ({
    active,
    payload,
  }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as PaceHrPoint;
    return (
      <ChartTooltipBox>
        {formatPace(p.paceSecPerKm)}/km · {p.hr}bpm · {p.distanceKm}km
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={c.line} strokeDasharray="2 4" />
        <XAxis
          type="number"
          dataKey="paceSecPerKm"
          domain={['dataMin - 10', 'dataMax + 10']}
          reversed
          tickFormatter={(v: number) => formatPace(v)}
          {...axis}
        />
        <YAxis
          type="number"
          dataKey="hr"
          domain={['dataMin - 5', 'dataMax + 5']}
          width={44}
          {...axis}
        />
        <ZAxis type="number" dataKey="distanceKm" range={[36, 200]} />
        <Tooltip
          content={renderTooltip}
          cursor={{ stroke: c.line, strokeDasharray: '2 4' }}
        />
        <Scatter
          data={points}
          fill={c.accent}
          fillOpacity={0.55}
          stroke={c.card}
          strokeWidth={1}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};
