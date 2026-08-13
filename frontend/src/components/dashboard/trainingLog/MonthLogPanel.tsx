import type { MonthLog } from '@/lib/trainingLog';
import { formatPace, formatClock } from '@/lib/format';
import { BarChart } from '@/components/charts/BarChart';

// 月视图 — 最近 N 个月，每月一张卡片：柱状图(当月每日里程) + 四项指标。

interface Props {
  months: MonthLog[];
}

export const MonthLogPanel = ({ months }: Props) => {
  if (!months.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">暂无数据</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {[...months].reverse().map((m) => (
        <div
          key={m.month}
          className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5"
        >
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">{m.month}</p>
            <span className="tnum text-2xl font-bold">
              {m.distanceKm}
              <span className="ml-1 text-sm font-normal text-[var(--color-ink-3)]">
                km
              </span>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-4">
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

          <div className="mt-4">
            <BarChart
              data={m.dailyChartValues.map((d) => ({
                label: String(d.day),
                value: d.km,
              }))}
              valueLabel="km"
              height={140}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
