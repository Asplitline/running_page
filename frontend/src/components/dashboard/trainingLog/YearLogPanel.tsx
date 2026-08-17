import { Link } from 'react-router-dom';
import type { YearLog, LifetimeLog } from '@/lib/trainingLog';
import { formatClock, formatDateDots, formatPace, toKm } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { Tooltip } from '@/components/ui/Tooltip';
import { TotalLogPanel } from './TotalLogPanel';

// 年视图 — 对齐老前端两列布局 (style.module.css:1029-1042)：
// 左窄列 = 当年卡(突出) + 历年卡纵向堆叠；右宽列 = 累计卡(与"总"Tab 内容同源)。

interface Props {
  years: YearLog[];
  lifetime: LifetimeLog;
}

const YearCard = ({
  year,
  featured,
  lifetimeBestSeconds,
}: {
  year: YearLog;
  featured: boolean;
  lifetimeBestSeconds: Map<string, number>;
}) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5">
    <div className="flex items-baseline justify-between">
      <p className="eyebrow">{year.year}</p>
      <span className="font-mono text-xs text-[var(--color-ink-3)]">
        {year.count} 次跑步
      </span>
    </div>

    <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
          总距离
        </div>
        <div className="tnum mt-1 text-lg font-bold tracking-tight">
          {year.distanceKm}km
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
          平均配速
        </div>
        <div className="tnum mt-1 text-sm font-semibold">
          {formatPace(year.avgPaceSec)}/km
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
          最长单次
        </div>
        <div className="tnum mt-1 text-sm font-semibold">
          {year.maxDistanceKm}km
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
          总时长
        </div>
        <div className="tnum mt-1 text-sm font-semibold">
          {formatClock(year.totalSeconds)}
        </div>
      </div>
    </div>

    <div className="mt-4">
      <BarChart
        data={year.monthlyChartValues.map((m) => ({
          label: `${m.month}月`,
          value: m.km,
        }))}
        valueLabel="km"
        height={featured ? 180 : 140}
      />
    </div>

    {year.personalRecords.length > 0 && (
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {year.personalRecords.map((pb) => {
          const isLifetimeBest = lifetimeBestSeconds.get(pb.key) === pb.seconds;
          return (
            <Tooltip
              key={pb.key}
              content={
                <span className="tnum font-mono text-xs">
                  {formatDateDots(pb.activity.start_date_local)} ·{' '}
                  {formatPace(pb.seconds / (pb.activity.distance / 1000))}/km
                </span>
              }
            >
              <Link
                to={`/runs/${pb.activity.run_id}`}
                className="block rounded-[var(--radius-card)] border p-3 transition-colors hover:border-[var(--color-accent)]"
                style={{
                  borderColor: isLifetimeBest
                    ? 'var(--color-accent)'
                    : 'var(--color-line)',
                  background: isLifetimeBest
                    ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-card-2))'
                    : 'var(--color-card-2)',
                }}
              >
                <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  {pb.label}
                  {isLifetimeBest && (
                    <span className="text-[var(--color-accent)]">★</span>
                  )}
                </div>
                <div className="tnum mt-1 text-lg font-bold tracking-tight">
                  {formatClock(pb.seconds)}
                </div>
                <div className="tnum mt-1 font-mono text-[10px] text-[var(--color-ink-3)]">
                  {toKm(pb.activity.distance)}km
                </div>
              </Link>
            </Tooltip>
          );
        })}
      </div>
    )}
  </div>
);

export const YearLogPanel = ({ years, lifetime }: Props) => {
  if (!years.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  const ordered = [...years].reverse(); // 最新年在前
  const lifetimeBestSeconds = new Map(
    lifetime.personalRecords.map((pb) => [pb.key, pb.seconds])
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,760px)_1fr] lg:items-start">
      <div className="flex flex-col gap-4">
        {ordered.map((y, i) => (
          <YearCard
            key={y.year}
            year={y}
            featured={i === 0}
            lifetimeBestSeconds={lifetimeBestSeconds}
          />
        ))}
      </div>
      <TotalLogPanel lifetime={lifetime} />
    </div>
  );
};
