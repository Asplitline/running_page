import type { Activity } from '@/data/types';
import { overallStats } from '@/lib/stats';
import { formatKm } from '@/lib/format';

// 总览数字条 — 累计 km / 总次数 / 今年 km / 最长单次。

interface Props {
  activities: Activity[];
  year: number;
}

const Stat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4">
    <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">
      {label}
    </div>
    <div
      className="tnum mt-2 flex items-baseline gap-1 text-3xl font-bold tracking-tight"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {value}
      {unit && <span className="text-xs font-normal text-[var(--color-ink-3)]">{unit}</span>}
    </div>
  </div>
);

const StatsBar = ({ activities, year }: Props) => {
  const s = overallStats(activities, year);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total" value={formatKm(s.totalDistanceKm)} unit="km" />
      <Stat label="Runs" value={String(s.totalRuns)} unit="次" />
      <Stat label={`${year}`} value={formatKm(s.thisYearKm)} unit="km" />
      <Stat label="Longest" value={formatKm(s.longestRunKm)} unit="km" />
    </div>
  );
};

export default StatsBar;
