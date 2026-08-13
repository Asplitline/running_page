import { Link } from 'react-router-dom';
import type { LifetimeLog } from '@/lib/trainingLog';
import { formatClock, formatDateDots, formatKm, toKm } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';

// 总(Lifetime)视图 — 生涯累计里程/次数 + 历年趋势柱状图 + 累计里程碑 + 生涯 PB。

interface Props {
  lifetime: LifetimeLog;
}

export const TotalLogPanel = ({ lifetime }: Props) => {
  if (lifetime.totalRuns === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
        <p className="eyebrow">生涯累计</p>
        <div className="mt-2 flex items-baseline gap-6">
          <div>
            <span
              className="tnum text-[clamp(40px,6vw,60px)] font-extrabold tracking-tight text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatKm(lifetime.totalKm)}
            </span>
            <span className="ml-1 text-sm text-[var(--color-ink-3)]">km</span>
          </div>
          <div>
            <span className="tnum text-2xl font-bold">
              {lifetime.totalRuns}
            </span>
            <span className="ml-1 text-sm text-[var(--color-ink-3)]">次</span>
          </div>
        </div>
        {lifetime.milestoneText && (
          <p className="mt-3 font-mono text-xs text-[var(--color-accent)]">
            {lifetime.milestoneText}
          </p>
        )}

        <div className="mt-5">
          <BarChart
            data={lifetime.yearlyTrend.map((y) => ({
              label: String(y.year),
              value: y.km,
            }))}
            valueLabel="km"
            height={160}
          />
        </div>
      </div>

      {lifetime.personalRecords.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5">
          <p className="eyebrow">生涯最佳</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {lifetime.personalRecords.map((pb) => (
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
        </div>
      )}
    </div>
  );
};
