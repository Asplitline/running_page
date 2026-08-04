import type { SplitPace } from '@/data/types';
import { formatPace } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';

// 逐公里配速柱 — 统一轨迹蓝 (单序列，快慢靠柱高区分)。
// 用 CSS bar，不引图表库 (单序列不需要 Recharts)。

interface Props {
  splits: SplitPace[];
}

export const SplitPaceChart = ({ splits }: Props) => {
  if (!splits?.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">无分段数据</p>;
  }

  const paces = splits.map((s) => s.pace_seconds);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const range = max - min || 1;

  return (
    <div>
      <div className="flex h-24 items-end gap-[2px]">
        {splits.map((s) => {
          const heightPct = 25 + ((s.pace_seconds - min) / range) * 75;
          return (
            <Tooltip
              key={s.km}
              content={
                <span className="tnum font-mono">
                  {s.km}km · {formatPace(s.pace_seconds)}/km
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
      <div className="tnum mt-2 flex justify-between font-mono text-[10px] text-[var(--color-ink-3)]">
        <span>1</span>
        <span>{Math.round(splits.length / 2)}</span>
        <span>{splits.length}</span>
      </div>
    </div>
  );
};
