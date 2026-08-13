import type { WeekKm } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';

// 近 8 周跑量趋势柱 — 统一轨迹蓝 (单序列)。CSS bar，不引图表库。

interface Props {
  weeks: WeekKm[];
}

export const WeeklyVolumeChart = ({ weeks }: Props) => {
  if (!weeks.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  const max = Math.max(...weeks.map((w) => w.km), 1);

  return (
    <div className="flex h-24 items-end gap-2">
      {weeks.map((w) => {
        const heightPct = w.km <= 0 ? 4 : 12 + (w.km / max) * 88;
        return (
          <Tooltip
            key={w.weekStart}
            content={
              <span className="tnum font-mono">
                {w.weekStart} 周 · {w.km}km
              </span>
            }
          >
            <div
              className="flex-1 rounded-t-[3px] transition-opacity hover:opacity-60"
              style={{
                height: `${heightPct}%`,
                background: 'var(--color-route)',
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
};
