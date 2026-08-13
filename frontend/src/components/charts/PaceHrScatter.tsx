import type { PaceHrPoint } from '@/lib/analytics';
import { formatPace } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';

// 配速-心率散点 (分析页用)。X = 配速(越靠右越快)，Y = 心率(越靠上越高)。
// 点大小按距离区分，颜色统一心率色 (--color-accent)。

interface Props {
  points: PaceHrPoint[];
}

const W = 800;
const H = 220;
const PAD = 16;

export const PaceHrScatter = ({ points }: Props) => {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--color-ink-3)]">
        数据不足，至少需要两次带心率的跑步
      </p>
    );
  }

  const paces = points.map((p) => p.paceSecPerKm);
  const hrs = points.map((p) => p.hr);
  // X 轴配速越小越快，视觉上希望"越快越靠右" → 反转映射
  const paceMin = Math.min(...paces);
  const paceMax = Math.max(...paces);
  const paceRange = paceMax - paceMin || 1;
  const hrMin = Math.min(...hrs);
  const hrMax = Math.max(...hrs);
  const hrRange = hrMax - hrMin || 1;

  const dists = points.map((p) => p.distanceKm);
  const distMax = Math.max(...dists) || 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      {points.map((p) => {
        const x =
          W - PAD - ((p.paceSecPerKm - paceMin) / paceRange) * (W - PAD * 2);
        const y = H - PAD - ((p.hr - hrMin) / hrRange) * (H - PAD * 2);
        const r = 3 + (p.distanceKm / distMax) * 5;
        return (
          <Tooltip
            key={p.runId}
            content={
              <span className="tnum font-mono">
                {formatPace(p.paceSecPerKm)}/km · {p.hr}bpm · {p.distanceKm}km
              </span>
            }
          >
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="var(--color-accent)"
              opacity="0.55"
              stroke="var(--color-card)"
              strokeWidth="1"
              className="cursor-pointer"
            />
          </Tooltip>
        );
      })}
    </svg>
  );
};
