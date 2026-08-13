import type { SplitHeartRate } from '@/data/types';
import { Tooltip } from '@/components/ui/Tooltip';
import { hrZoneOf } from '@/design/tokens';

// 逐公里心率折线 (SVG)。按 Z1-Z5 分区着色：每点用其心率所属分区色，
// 线段用相邻两点分区色渐变，一眼看出强度分布。

interface Props {
  splits: SplitHeartRate[];
  hrMax: number;
}

const W = 800;
const H = 120;
const PAD = 8;
const NEUTRAL = 'var(--color-ink-3)';

const zoneColor = (hr: number, hrMax: number): string =>
  hrZoneOf(hr, hrMax)?.color ?? NEUTRAL;
const zoneLabel = (hr: number, hrMax: number): string => {
  const z = hrZoneOf(hr, hrMax);
  return z ? `Z${z.zone} ${z.label}` : '';
};

export const SplitHrChart = ({ splits, hrMax }: Props) => {
  if (!splits?.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">无分段心率数据</p>;
  }

  const hrs = splits.map((s) => s.avg_hr);
  const min = Math.min(...hrs);
  const max = Math.max(...hrs);
  const range = max - min || 1;

  const pts = splits.map((s, i) => {
    const x = (i / (splits.length - 1 || 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((s.avg_hr - min) / range) * (H - PAD * 2);
    return { x, y, color: zoneColor(s.avg_hr, hrMax), ...s };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <defs>
        {pts.slice(0, -1).map((p, i) => {
          const next = pts[i + 1];
          return (
            <linearGradient
              key={i}
              id={`hrseg-${i}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={p.color} />
              <stop offset="1" stopColor={next.color} />
            </linearGradient>
          );
        })}
      </defs>

      {/* 分区渐变线段 */}
      {pts.slice(0, -1).map((p, i) => {
        const next = pts[i + 1];
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={next.x}
            y2={next.y}
            stroke={`url(#hrseg-${i})`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}

      {/* 分区色圆点 + tooltip */}
      {pts.map((p) => (
        <Tooltip
          key={p.km}
          content={
            <span className="tnum font-mono">
              {p.km}km · {p.avg_hr} bpm · {zoneLabel(p.avg_hr, hrMax)}
            </span>
          }
        >
          <circle
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill={p.color}
            stroke="var(--color-card)"
            strokeWidth="1.5"
            className="cursor-pointer"
          />
        </Tooltip>
      ))}
    </svg>
  );
};
