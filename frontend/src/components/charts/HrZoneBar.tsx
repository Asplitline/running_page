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
import type { HrZoneSeconds } from '@/data/types';
import { HR_ZONES } from '@/design/tokens';
import { ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 心率区间时长分布。横向堆叠条，Z1-Z5 色 (语义强制:绿=恢复→红=极限)。
// 每个分区是一个独立 Bar，共用 stackId 堆成单条。

interface Props {
  zones: HrZoneSeconds[];
}

const formatMinutes = (seconds: number): string =>
  `${Math.round(seconds / 60)}min`;

export const HrZoneBar = ({ zones }: Props) => {
  const total = useMemo(
    () => zones.reduce((s, z) => s + z.seconds, 0),
    [zones]
  );

  if (!zones.length || total <= 0) {
    return <ChartEmpty text="无心率区间数据" />;
  }

  const byZone = new Map(zones.map((z) => [z.zone, z]));
  const active = HR_ZONES.filter((d) => (byZone.get(d.zone)?.seconds ?? 0) > 0);

  // Recharts 堆叠需要单行记录:每个分区一列
  const row = Object.fromEntries(
    active.map((d) => [d.key, byZone.get(d.zone)!.seconds])
  );

  const renderTooltip = ({
    active: isActive,
    payload,
  }: ChartTooltipProps) => {
    if (!isActive || !payload?.length) return null;
    const hovered = payload[0];
    const def = active.find((d) => d.key === hovered.dataKey);
    if (!def) return null;
    const seconds = Number(hovered.value ?? 0);
    return (
      <ChartTooltipBox>
        Z{def.zone} {def.label} · {formatMinutes(seconds)} ·{' '}
        {Math.round((seconds / total) * 100)}%
      </ChartTooltipBox>
    );
  };

  return (
    <div>
      <div className="overflow-hidden rounded-[var(--radius-pill)]">
        <ResponsiveContainer width="100%" height={32}>
          <BarChart
            layout="vertical"
            data={[row]}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={0}
          >
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" hide />
            <Tooltip content={renderTooltip} cursor={false} />
            {active.map((def) => (
              <Bar
                key={def.key}
                dataKey={def.key}
                stackId="hr"
                isAnimationActive={false}
              >
                <Cell fill={def.color} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--color-ink-3)]">
        {active.map((def) => (
          <span key={def.key} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: def.color }}
            />
            Z{def.zone} {def.label} {formatMinutes(byZone.get(def.zone)!.seconds)}
          </span>
        ))}
      </div>
    </div>
  );
};
