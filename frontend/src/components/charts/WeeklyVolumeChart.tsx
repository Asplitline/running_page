import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeekKm } from '@/lib/stats';
import { axisProps, chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 近 8 周跑量趋势柱 — 强调色单序列，本周实心、历史周降透明度。
// 用 accent 而非 route(轨迹蓝)：首页这块的标签点、热力梯度都是暖色系，
// 蓝柱是页面里唯一一处冷色，读起来像是默认色没改。

interface Props {
  weeks: WeekKm[];
}

// "2026-08-24" → "8/24"，X 轴短标签
const shortDate = (iso: string): string => {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}`;
};

export const WeeklyVolumeChart = ({ weeks }: Props) => {
  const c = useMemo(chartColors, []);

  if (!weeks.length) return <ChartEmpty />;

  const lastIndex = weeks.length - 1;

  const renderTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const w = payload[0].payload as WeekKm;
    return (
      <ChartTooltipBox>
        {w.weekStart} 周 · {w.km}km
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={132}>
      <BarChart data={weeks} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="weekStart"
          {...axisProps(c)}
          tickFormatter={shortDate}
          interval="preserveStartEnd"
          minTickGap={24}
          height={18}
        />
        <YAxis hide domain={[0, 'dataMax']} />
        <Tooltip
          content={renderTooltip}
          cursor={{ fill: c.card2, opacity: 0.6 }}
        />
        <Bar dataKey="km" radius={[4, 4, 0, 0]} minPointSize={3}>
          {weeks.map((w, i) => (
            <Cell
              key={w.weekStart}
              fill={c.accent}
              // 历史周降透明度，让"本周"这个前提在图里也成立
              fillOpacity={i === lastIndex ? 1 : 0.42}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
