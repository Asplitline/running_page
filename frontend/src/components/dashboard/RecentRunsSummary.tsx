import { activitiesByDateDesc } from '@/data/activities';
import { formatPace } from '@/lib/format';
import { summarizeRuns, splitRunName } from '@/lib/recentRuns';
import { RECENT_COUNT } from './RecentRuns';

// 最近 N 次的汇总栏 — 列表左侧是逐条流水,这里回答"这批整体跑得怎么样"。
// 与列表同源同批次,不另取数据。

const RecentRunsSummary = () => {
  const recent = activitiesByDateDesc().slice(0, RECENT_COUNT);
  const s = summarizeRuns(recent);
  if (!s) return null;

  // 训练类型构成:有课表意图的跑步(名称带 "地点 - 类型")按类型计数
  const workoutCounts = new Map<string, number>();
  for (const a of recent) {
    const { workout } = splitRunName(a.name);
    if (workout) workoutCounts.set(workout, (workoutCounts.get(workout) ?? 0) + 1);
  }
  const workouts = [...workoutCounts.entries()].sort((a, b) => b[1] - a[1]);
  const plainCount = recent.length - workouts.reduce((n, [, c]) => n + c, 0);

  const avgKm = Math.round((s.totalKm / s.count) * 10) / 10;

  return (
    <aside className="self-start rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 lg:sticky lg:top-6">
      <p className="eyebrow">这批 · 汇总</p>

      <div className="mt-3 flex items-end gap-2 leading-[0.85]">
        <span className="tnum text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
          {s.totalKm}
        </span>
        <span className="text-sm font-semibold text-[var(--color-ink-3)]">
          km
        </span>
      </div>
      <p className="mt-2 font-mono text-xs text-[var(--color-ink-3)]">
        {s.count} 次 · 跨 {s.spanDays} 天
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
            平均单次
          </dt>
          <dd className="tnum mt-1 font-mono text-base font-bold">{avgKm} km</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
            平均配速
          </dt>
          <dd className="tnum mt-1 font-mono text-base font-bold">
            {s.avgPaceSecPerKm ? `${formatPace(s.avgPaceSecPerKm)}/km` : '--'}
          </dd>
        </div>
      </dl>

      {(workouts.length > 0 || plainCount > 0) && (
        <div className="mt-6 border-t border-[var(--color-line)] pt-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
            训练构成
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {workouts.map(([name, count]) => (
              <li
                key={name}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="truncate text-[var(--color-ink-2)]">
                  {name}
                </span>
                <span className="tnum shrink-0 font-mono text-xs text-[var(--color-ink-3)]">
                  {count}
                </span>
              </li>
            ))}
            {plainCount > 0 && (
              <li className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-[var(--color-ink-3)]">
                  常规跑
                </span>
                <span className="tnum shrink-0 font-mono text-xs text-[var(--color-ink-3)]">
                  {plainCount}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default RecentRunsSummary;
