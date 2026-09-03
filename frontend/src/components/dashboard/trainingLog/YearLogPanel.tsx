import { Link } from 'react-router-dom';
import type { YearLog, LifetimeLog } from '@/lib/trainingLog';
import { formatClock, formatDateDots, formatPace, toKm } from '@/lib/format';
import { MultiYearTrend } from '@/components/charts/MultiYearTrend';
import { Tooltip } from '@/components/ui/Tooltip';

// 年视图 — 重点是「跨月趋势与里程碑」。
// 顶部一张多年叠加折线承担同期对比(当年 vs 往年),不必上下滚动比两张柱图;
// 下方按年列出指标与 PB。各年不再单独画 12 月柱图 —— 已被顶部对比图取代。
// 生涯累计不在此重复展示(那是「总」Tab 的内容)。

interface Props {
  years: YearLog[];
  lifetime: LifetimeLog;
}

const YearCard = ({
  year,
  lifetimeBestSeconds,
}: {
  year: YearLog;
  lifetimeBestSeconds: Map<string, number>;
}) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-4 sm:p-5">
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

    {year.personalRecords.length > 0 && (
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-4 sm:grid-cols-5">
        {year.personalRecords.map((pb) => {
          const isLifetimeBest = lifetimeBestSeconds.get(pb.key) === pb.seconds;
          return (
            <Tooltip
              key={pb.key}
              content={
                <span className="tnum font-mono text-xs">
                  {isLifetimeBest && '生涯最好成绩 · '}
                  {formatDateDots(pb.activity.start_date_local)} ·{' '}
                  {formatPace(pb.seconds / (pb.activity.distance / 1000))}/km
                </span>
              }
            >
              <Link
                to={`/runs/${pb.activity.run_id}`}
                className="relative block rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-3 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  <span>{pb.label}</span>
                  {/* PB 标记 — 卡面保持中性,仅以字距与色点一笔 */}
                  {isLifetimeBest && (
                    <span className="font-semibold tracking-[0.18em] text-[var(--color-accent)]">
                      PB
                    </span>
                  )}
                </div>
                {/* PB 提权 / 非 PB 降权 — 对比靠双向拉开,不靠卡面上色 */}
                <div
                  className={`tnum mt-1 text-lg tracking-tight ${
                    isLifetimeBest
                      ? 'font-extrabold text-[var(--color-accent)]'
                      : 'font-semibold'
                  }`}
                >
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
    <div className="flex flex-col gap-4">
      {/* 同期对比图 — 一张图看完所有年份的逐月走势 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-4 sm:p-5">
        <p className="eyebrow">逐月里程 · 同期对比</p>
        <div className="hidden sm:block">
          <MultiYearTrend years={years} height={260} />
        </div>
        <div className="sm:hidden">
          <MultiYearTrend years={years} height={200} compact />
        </div>
        <p className="mt-2 font-mono text-[11px] text-[var(--color-ink-3)]">
          实线为最新年份，虚线为往年。同月份纵向比较即同期增减。
        </p>
      </div>

      {ordered.map((y) => (
        <YearCard
          key={y.year}
          year={y}
          lifetimeBestSeconds={lifetimeBestSeconds}
        />
      ))}
    </div>
  );
};
