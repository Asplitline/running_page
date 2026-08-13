import { Link } from 'react-router-dom';
import { activitiesByDateDesc } from '@/data/activities';
import { toKm, paceFromSpeed, formatDateDots } from '@/lib/format';

// 最近 20 次跑步列表 — 从旧 Home 抽出，作为仪表盘落脚点。

const RecentRuns = () => {
  const recent = activitiesByDateDesc().slice(0, 20);

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {recent.map((a) => (
        <li key={a.run_id}>
          <Link
            to={`/runs/${a.run_id}`}
            className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] px-5 py-4 transition-colors hover:border-[var(--color-accent)]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{a.name}</div>
              <div className="tnum font-mono text-xs text-[var(--color-ink-3)]">
                {formatDateDots(a.start_date_local)}
              </div>
            </div>
            <div className="tnum text-right font-mono text-sm">
              <div className="font-bold">{toKm(a.distance)} km</div>
              <div className="text-[var(--color-ink-3)]">
                {paceFromSpeed(a.average_speed)}/km
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default RecentRuns;
