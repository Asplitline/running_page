import type { MonthLog } from '@/lib/trainingLog';
import { streakStats } from '@/lib/trainingLog';
import { formatPace, formatClock } from '@/lib/format';
import { MonthHeatGrid } from '@/components/charts/MonthHeatGrid';

// 月视图 — 重点是「训练节奏与规律性」:哪几天跑了、连了几天、断了多久。
// 主图形用日历热力网格而非柱状图:柱图把休息日画成空白(2/3 面积无信息),
// 且每月 Y 轴独立缩放导致跨月无法比较。
// 跨月对比作为辅助信息,由所有月共用同一标尺的里程条承担。

interface Props {
  months: MonthLog[];
}

// 环比文案:相对上月的增减。
// 上月基数过低时百分比会放大成无意义的数字(如 14.9→92.3 显示 +519%),
// 这类情况改报里程差值。
const LOW_BASE_KM = 30;

const deltaText = (km: number, prev: number | null): string | null => {
  if (prev === null || prev <= 0) return null;
  const diff = km - prev;
  if (Math.abs(diff) < 0.05) return '与上月持平';
  const sign = diff > 0 ? '+' : '−';
  if (prev < LOW_BASE_KM) {
    return `${sign}${Math.abs(diff).toFixed(1)}km vs 上月`;
  }
  return `${sign}${Math.abs(Math.round((diff / prev) * 100))}% vs 上月`;
};

export const MonthLogPanel = ({ months }: Props) => {
  if (!months.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  // 所有月共用同一标尺,让里程条可横向比较
  const maxKm = Math.max(...months.map((m) => m.distanceKm), 1);
  const ordered = [...months].reverse(); // 最新月在前

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ordered.map((m) => {
        const { longestRun, longestGap } = streakStats(m.dailyChartValues);
        const delta = deltaText(m.distanceKm, m.prevMonthKm);

        return (
          <div
            key={m.month}
            className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-4 sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="eyebrow !mb-0">{m.month}</p>
              <span className="font-mono text-xs text-[var(--color-ink-3)]">
                {m.count} 次跑步
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="tnum text-2xl font-bold leading-none">
                {m.distanceKm}
                <span className="ml-1 text-sm font-normal text-[var(--color-ink-3)]">
                  km
                </span>
              </span>
              {delta && (
                <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  {delta}
                </span>
              )}
            </div>

            {/* 跨月对比条:所有月共用 maxKm 标尺,横向可比 */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-card-2)]">
              <div
                className="h-full rounded-[var(--radius-pill)] bg-[var(--color-accent)]"
                style={{ width: `${(m.distanceKm / maxKm) * 100}%` }}
              />
            </div>

            <div className="mt-4">
              <MonthHeatGrid
                days={m.dailyChartValues}
                firstWeekday={m.firstWeekday}
                month={m.month}
              />
            </div>

            {/* 节奏摘要 — 日历图形的文字兜底,也是这个视图的结论行 */}
            <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
              最长连跑 {longestRun} 天 · 最长间隔 {longestGap} 天
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[var(--color-line)] pt-3">
              <div>
                <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
                  平均配速
                </div>
                <div className="tnum mt-1 text-sm font-semibold">
                  {formatPace(m.avgPaceSec)}/km
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
                  最长单次
                </div>
                <div className="tnum mt-1 text-sm font-semibold">
                  {m.maxDistanceKm}km
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-[var(--color-ink-3)]">
                  总时长
                </div>
                <div className="tnum mt-1 text-sm font-semibold">
                  {formatClock(m.totalSeconds)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
