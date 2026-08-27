import { Link } from 'react-router-dom';
import type { LifetimeLog } from '@/lib/trainingLog';
import {
  formatClock,
  formatDateDots,
  formatKm,
  formatPace,
  toKm,
} from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';
import { Tooltip } from '@/components/ui/Tooltip';

// 总 (Lifetime) 视图 — 对齐老前端 LifetimePeriodCard：
// Hero(总里程 + 里程碑文案) → 3 项指标 → 生涯 PB → 历年柱状图 (峰值年高亮) → 峰值年说明。
// 本组件同时被 YearLogPanel 的右列复用 (内容同源，避免重复实现)。

interface Props {
  lifetime: LifetimeLog;
}

export const TotalLogPanel = ({ lifetime }: Props) => {
  if (lifetime.count === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">🏆 生涯累计</p>
        <span className="font-mono text-xs text-[var(--color-ink-3)]">
          {lifetime.count} 次跑步
        </span>
      </div>

      <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
        累计总里程
      </p>
      <div>
        <span
          className="tnum text-[clamp(40px,6vw,60px)] font-extrabold tracking-tight text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatKm(lifetime.distanceKm)}
        </span>
        <span className="ml-1 text-sm text-[var(--color-ink-3)]">km</span>
      </div>
      <p className="mt-1 font-mono text-xs text-[var(--color-accent)]">
        ✨ {lifetime.milestoneText}
      </p>

      {/* 不再重复「总距离」——上方大字已是同一个值 */}
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
            平均配速
          </div>
          <div className="tnum mt-1 text-sm font-semibold">
            {formatPace(lifetime.avgPaceSec)}/km
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
            最长单次
          </div>
          <div className="tnum mt-1 text-sm font-semibold">
            {lifetime.maxDistanceKm}km
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
            总时长
          </div>
          <div className="tnum mt-1 text-sm font-semibold">
            {formatClock(lifetime.totalSeconds)}
          </div>
        </div>
      </div>

      {lifetime.personalRecords.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {lifetime.personalRecords.map((pb) => (
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
                className="block rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-3 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  {pb.label}
                </div>
                <div className="tnum mt-1 text-lg font-bold tracking-tight">
                  {formatClock(pb.seconds)}
                </div>
                <div className="tnum mt-1 font-mono text-[10px] text-[var(--color-ink-3)]">
                  {toKm(pb.activity.distance)}km
                </div>
              </Link>
            </Tooltip>
          ))}
        </div>
      )}

      <div className="mt-5">
        <BarChart
          data={lifetime.yearlyTrend.map((y) => ({
            label: String(y.year),
            value: y.km,
          }))}
          valueLabel="km"
          height={160}
          highlightLabel={
            lifetime.peakYear ? String(lifetime.peakYear.year) : undefined
          }
        />
      </div>

      <p className="mt-4 font-mono text-xs text-[var(--color-ink-2)]">
        🔥 {lifetime.peakYearText}
      </p>
    </div>
  );
};
