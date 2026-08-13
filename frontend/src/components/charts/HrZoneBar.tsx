import type { HrZoneSeconds } from '@/data/types';
import { HR_ZONES } from '@/design/tokens';
import { Tooltip } from '@/components/ui/Tooltip';

// 心率区间时长分布 (详情页用)。横向堆叠条，Z1-Z5 色 (spec-design 强制语义:绿=恢复→红=极限)。

interface Props {
  zones: HrZoneSeconds[];
}

const formatMinutes = (seconds: number): string => {
  const m = Math.round(seconds / 60);
  return `${m}min`;
};

export const HrZoneBar = ({ zones }: Props) => {
  const total = zones.reduce((s, z) => s + z.seconds, 0);
  if (!zones.length || total <= 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">无心率区间数据</p>;
  }

  const byZone = new Map(zones.map((z) => [z.zone, z]));

  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-[var(--radius-pill)]">
        {HR_ZONES.map((def) => {
          const z = byZone.get(def.zone);
          const seconds = z?.seconds ?? 0;
          if (seconds <= 0) return null;
          const pct = (seconds / total) * 100;
          return (
            <Tooltip
              key={def.zone}
              content={
                <span className="tnum font-mono">
                  Z{def.zone} {def.label} · {formatMinutes(seconds)} ·{' '}
                  {Math.round(pct)}%
                </span>
              }
            >
              <div
                className="h-full cursor-pointer"
                style={{ width: `${pct}%`, background: def.color }}
              />
            </Tooltip>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--color-ink-3)]">
        {HR_ZONES.map((def) => {
          const z = byZone.get(def.zone);
          if (!z || z.seconds <= 0) return null;
          return (
            <span key={def.zone} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: def.color }}
              />
              Z{def.zone} {def.label} {formatMinutes(z.seconds)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
