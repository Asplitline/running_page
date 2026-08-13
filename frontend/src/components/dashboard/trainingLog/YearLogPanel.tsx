import { Link } from 'react-router-dom';
import type { YearLog } from '@/lib/trainingLog';
import { formatClock, formatDateDots, toKm } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';

// 年视图 — 逐年柱状图(12个月) + 该年内各距离档 PB。最新年份在前。

interface Props {
  years: YearLog[];
}

export const YearLogPanel = ({ years }: Props) => {
  if (!years.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {[...years].reverse().map((y) => (
        <div
          key={y.year}
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5"
        >
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">{y.year}</p>
            <span className="tnum text-2xl font-bold">
              {y.distanceKm}
              <span className="ml-1 text-sm font-normal text-[var(--color-ink-3)]">
                km
              </span>
            </span>
          </div>

          <div className="mt-4">
            <BarChart
              data={y.monthlyChartValues.map((m) => ({
                label: `${m.month}月`,
                value: m.km,
              }))}
              valueLabel="km"
              height={160}
            />
          </div>

          {y.personalRecords.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {y.personalRecords.map((pb) => (
                <Link
                  key={pb.key}
                  to={`/runs/${pb.activity.run_id}`}
                  className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-3 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                    {pb.label}
                  </div>
                  <div className="tnum mt-1 text-lg font-bold tracking-tight">
                    {formatClock(pb.seconds)}
                  </div>
                  <div className="tnum mt-1 font-mono text-[10px] text-[var(--color-ink-3)]">
                    {toKm(pb.activity.distance)}km ·{' '}
                    {formatDateDots(pb.activity.start_date_local)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
