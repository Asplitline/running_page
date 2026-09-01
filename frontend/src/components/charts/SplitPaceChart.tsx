import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SplitHeartRate, SplitPace } from '@/data/types';
import type { HrZone } from '@/design/tokens';
import { formatPace } from '@/lib/format';
import { paceChartDomain } from '@/lib/chartScale';
import { axisProps, chartColors, ChartEmpty, ChartTooltipBox } from './theme';
import type { ChartTooltipProps } from './theme';

// 逐公里配速柱。
//
// Y 轴倒序 (domain 首项是慢端)，所以柱越高 = 跑得越快，与直觉一致 ——
// 原实现直接用配速秒数当柱高，"高柱"其实是最慢的那一公里。
// 传入 resolveZone 时柱按该公里心率所属分区着色，一根柱同时回答"多快"和"多累"。

const NEUTRAL = '#94a099';

interface Row extends SplitPace {
  hr: number | null;
  capped: boolean; // 超出量程被截顶 (含暂停的离群段)
  // 实际画柱用的值。Recharts 会自动扩 Y 轴去容纳超出 domain 的数据点，
  // 光设 domain 挡不住离群段 (实测单段 44897 秒会把其余 25 根柱压成一条线)，
  // 必须把值本身钳到 cap；真实值只在 tooltip 里给。
  plotted: number;
}

interface Props {
  splits: SplitPace[];
  splitHeartRates?: SplitHeartRate[] | null;
  resolveZone?: (hr: number) => HrZone | null;
}

export const SplitPaceChart = ({
  splits,
  splitHeartRates,
  resolveZone,
}: Props) => {
  const c = useMemo(chartColors, []);
  const axis = axisProps(c);

  if (!splits?.length) return <ChartEmpty text="无分段数据" />;

  const scale = paceChartDomain(splits.map((s) => s.pace_seconds));
  if (!scale) return <ChartEmpty text="无分段数据" />;
  const [slow, fast] = scale.domain;

  // 心率按 km 关联 (两个数组长度可能不一致，以配速为主序)
  const hrByKm = new Map((splitHeartRates ?? []).map((h) => [h.km, h.avg_hr]));
  const rows: Row[] = splits.map((s) => ({
    ...s,
    hr: hrByKm.get(s.km) ?? null,
    capped: s.pace_seconds > scale.cap,
    plotted: Math.min(s.pace_seconds, slow),
  }));

  // 全程均配速 = 总秒数 / 段数，作参考线区分快慢于均速的公里
  const avgPace = Math.round(
    splits.reduce((sum, s) => sum + s.pace_seconds, 0) / splits.length
  );

  const barColor = (r: Row): string => {
    if (!resolveZone || r.hr == null) return c.route;
    return resolveZone(r.hr)?.color ?? NEUTRAL;
  };

  // 段数多时抽稀 X 轴标签，避免重叠 (实测有 96 段的间歇跑)
  const tickInterval = Math.max(0, Math.ceil(splits.length / 10) - 1);

  const renderTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload as Row;
    const z = resolveZone && r.hr != null ? resolveZone(r.hr) : null;
    return (
      <ChartTooltipBox>
        {r.km}km · {formatPace(r.pace_seconds)}/km
        {r.hr != null && ` · ${r.hr}bpm`}
        {z && ` · Z${z.zone} ${z.label}`}
        {r.capped && ' · 含暂停'}
      </ChartTooltipBox>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={170}>
        {/* right 留 56px 给均速参考线标签，否则被裁掉 */}
        <BarChart
          data={rows}
          margin={{ top: 8, right: 56, bottom: 0, left: -8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke={c.line}
            strokeDasharray="2 4"
          />
          <XAxis dataKey="km" interval={tickInterval} {...axis} />
          <YAxis
            domain={[slow, fast]}
            allowDataOverflow
            width={46}
            tickFormatter={(v: number) => formatPace(v)}
            {...axis}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ fill: c.card2, opacity: 0.6 }}
          />
          <ReferenceLine
            y={avgPace}
            stroke={c.ink3}
            strokeDasharray="4 4"
            label={{
              value: `均 ${formatPace(avgPace)}`,
              position: 'right',
              fill: c.ink3,
              fontSize: 10,
              fontFamily: c.mono,
            }}
          />
          <Bar dataKey="plotted" radius={[3, 3, 0, 0]} maxBarSize={48}>
            {rows.map((r) => (
              <Cell
                key={r.km}
                fill={barColor(r)}
                fillOpacity={r.capped ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 font-mono text-[10px] text-[var(--color-ink-3)]">
        柱越高 = 跑得越快
        {resolveZone && ' · 颜色 = 该公里心率所属分区'}
      </p>
    </div>
  );
};
