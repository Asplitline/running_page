import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SplitPace } from '@/data/types';
import { formatPace } from '@/lib/format';
import { chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 逐公里配速柱 — 统一轨迹蓝 (单序列，快慢靠柱高区分)。
// 配速值越小越快，Y 轴不从 0 起，用 dataMin 留白放大差异。

interface Props {
  splits: SplitPace[];
}

export const SplitPaceChart = ({ splits }: Props) => {
  const c = useMemo(chartColors, []);

  if (!splits?.length) return <ChartEmpty text="无分段数据" />;

  const renderTooltip = ({
    active,
    payload,
  }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const s = payload[0].payload as SplitPace;
    return (
      <ChartTooltipBox>
        {s.km}km · {formatPace(s.pace_seconds)}/km
      </ChartTooltipBox>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={96}>
        <BarChart
          data={splits}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis dataKey="km" hide />
          <YAxis
            hide
            domain={[
              (min: number) => min - (min > 0 ? min * 0.15 : 0),
              'dataMax',
            ]}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ fill: c.card2, opacity: 0.6 }}
          />
          <Bar
            dataKey="pace_seconds"
            fill={c.route}
            radius={[3, 3, 0, 0]}
            minPointSize={3}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="tnum mt-2 flex justify-between font-mono text-[10px] text-[var(--color-ink-3)]">
        <span>1</span>
        <span>{Math.round(splits.length / 2)}</span>
        <span>{splits.length}</span>
      </div>
    </div>
  );
};
