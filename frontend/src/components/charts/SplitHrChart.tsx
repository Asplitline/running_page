import { useMemo } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SplitHeartRate } from '@/data/types';
import type { HrZone } from '@/design/tokens';
import { chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 逐公里心率折线。按 Z1-Z5 分区着色：折线用沿 X 轴的渐变，
// 各公里位置取该点心率所属分区色，一眼看出强度分布。

interface Props {
  splits: SplitHeartRate[];
  // 分区判定器由调用方用 makeZoneResolver 构造。
  // 收判定器而非裸 hrMax，是为了让"拿本次最高心率当分母"这个错法在类型上就写不出来。
  resolveZone: (hr: number) => HrZone | null;
}

const NEUTRAL = '#94a099';

export const SplitHrChart = ({ splits, resolveZone }: Props) => {
  const zoneColor = (hr: number): string => resolveZone(hr)?.color ?? NEUTRAL;
  const zoneLabel = (hr: number): string => {
    const z = resolveZone(hr);
    return z ? `Z${z.zone} ${z.label}` : '低于 Z1';
  };

  const c = useMemo(chartColors, []);

  if (!splits?.length) return <ChartEmpty text="无分段心率数据" />;

  // 沿 X 轴的分区色渐变:每个数据点在其 X 百分比位置放一个色标
  const stops = splits.map((s, i) => ({
    offset: splits.length > 1 ? (i / (splits.length - 1)) * 100 : 0,
    color: zoneColor(s.avg_hr),
  }));

  // v3 的 dot 回调参数类型 (DotItemDotProps) 未从包根导出，用结构化类型接收
  const renderDot = (props: {
    cx?: number;
    cy?: number;
    payload?: SplitHeartRate;
  }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return <g key="empty" />;
    return (
      <circle
        key={payload.km}
        cx={cx}
        cy={cy}
        r={3.5}
        fill={zoneColor(payload.avg_hr)}
        stroke={c.card}
        strokeWidth={1.5}
      />
    );
  };

  const renderTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const s = payload[0].payload as SplitHeartRate;
    return (
      <ChartTooltipBox>
        {s.km}km · {s.avg_hr} bpm · {zoneLabel(s.avg_hr)}
      </ChartTooltipBox>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart
        data={splits}
        margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
      >
        <defs>
          <linearGradient id="hrZoneLine" x1="0" y1="0" x2="1" y2="0">
            {stops.map((s, i) => (
              <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <XAxis dataKey="km" hide />
        <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
        <Tooltip
          content={renderTooltip}
          cursor={{ stroke: c.line, strokeDasharray: '2 4' }}
        />
        <Line
          type="monotone"
          dataKey="avg_hr"
          stroke="url(#hrZoneLine)"
          strokeWidth={2.5}
          strokeLinecap="round"
          dot={renderDot}
          activeDot={{ r: 5, stroke: c.card, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
