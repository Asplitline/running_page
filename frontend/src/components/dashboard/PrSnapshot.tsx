import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { personalRecords } from '@/lib/analytics';
import { formatClock, formatDateDots, toKm } from '@/lib/format';

// PB 快照 — 5K/10K/半马/全马 最佳成绩，复用 personalRecords。

interface Props {
  activities: Activity[];
}

const PrSnapshot = ({ activities }: Props) => {
  const pbs = personalRecords(activities);
  if (pbs.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无符合距离档的记录</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {pbs.map((pb) => (
        <Link
          key={pb.key}
          to={`/runs/${pb.activity.run_id}`}
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4 transition-colors hover:border-[var(--color-accent)]"
        >
          <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">
            {pb.label}
          </div>
          <div className="tnum mt-2 text-2xl font-bold tracking-tight">
            {formatClock(pb.seconds)}
          </div>
          <div className="tnum mt-1 font-mono text-[11px] text-[var(--color-ink-3)]">
            {toKm(pb.activity.distance)}km · {formatDateDots(pb.activity.start_date_local)}
          </div>
        </Link>
      ))}
    </div>
  );
};

export default PrSnapshot;
