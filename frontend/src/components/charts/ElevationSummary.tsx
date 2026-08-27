import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 海拔汇总 (详情页用)。数据只有单次跑步的汇总统计(无逐点轨迹)，
// 因此不画逐米剖面曲线，改用海拔区间刻度 + 爬升/下降对比柱。

interface Props {
  minElevation: number | null;
  maxElevation: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
}

export const ElevationSummary = ({
  minElevation,
  maxElevation,
  elevationGain,
  elevationLoss,
}: Props) => {
  const c = useMemo(chartColors, []);
  const hasRange = minElevation != null && maxElevation != null;
  const hasUpDown = elevationGain != null || elevationLoss != null;

  if (!hasRange && !hasUpDown) return <ChartEmpty text="无海拔数据" />;

  const bars = [
    { name: '爬升', value: Math.round(elevationGain ?? 0), color: c.route },
    { name: '下降', value: Math.round(elevationLoss ?? 0), color: c.accent },
  ];

  const renderTooltip = ({
    active,
    payload,
  }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as (typeof bars)[number];
    return (
      <ChartTooltipBox>
        {d.name} {d.value}m
      </ChartTooltipBox>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {hasRange && (
        <div>
          <div className="flex justify-between font-mono text-[11px] text-[var(--color-ink-3)]">
            <span>最低 {Math.round(minElevation)}m</span>
            <span>最高 {Math.round(maxElevation)}m</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--color-card-2)]">
            <div
              className="h-full w-full rounded-full"
              style={{ background: c.route }}
            />
          </div>
        </div>
      )}
      {hasUpDown && (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={bars}
            margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
          >
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.ink3, fontSize: 11, fontFamily: c.mono }}
            />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              content={renderTooltip}
              cursor={{ fill: c.card2, opacity: 0.6 }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {bars.map((b) => (
                <Cell key={b.name} fill={b.color} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                offset={6}
                formatter={(v: unknown) => `${v}m`}
                fill={c.ink}
                fontSize={13}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
