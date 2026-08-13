import type { EfficiencyPoint } from '@/lib/analytics';
import { Tooltip } from '@/components/ui/Tooltip';

// 有氧效率月趋势 (SVG 折线)。上行 = 进步 (同心率跑更快)。

interface Props {
  points: EfficiencyPoint[];
}

const W = 800;
const H = 160;
const PAD = 12;

export const EfficiencyTrend = ({ points }: Props) => {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--color-ink-3)]">
        数据不足，至少需要两个月
      </p>
    );
  }

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((p.value - min) / range) * (H - PAD * 2);
    return { x, y, ...p };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <path d={area} fill="var(--color-route)" opacity="0.08" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-route)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {pts.map((p) => (
        <Tooltip
          key={p.month}
          content={
            <span className="tnum font-mono">
              {p.month} · 效率 {p.value} · {p.count} 次
            </span>
          }
        >
          <circle
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="var(--color-route)"
            stroke="var(--color-card)"
            strokeWidth="1.5"
            className="cursor-pointer"
          />
        </Tooltip>
      ))}
    </svg>
  );
};
