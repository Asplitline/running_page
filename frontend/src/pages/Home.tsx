import { Link } from 'react-router-dom';
import { activitiesByDateDesc } from '@/data/activities';
import { toKm, paceFromSpeed, formatDateDots } from '@/lib/format';

// S6 临时首页：最近跑步列表，点击进详情页。M3 起重构为仪表盘。

const Home = () => {
  const recent = activitiesByDateDesc().slice(0, 20);

  return (
    <main className="w-full px-6 py-12 sm:px-10 lg:px-16">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Running Page</p>
        <Link
          to="/analysis"
          className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          训练分析 →
        </Link>
      </div>
      <h1
        className="text-4xl font-extrabold tracking-tight"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        最近跑步
      </h1>

      <ul className="mt-8 flex flex-col gap-2">
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
                <div className="text-[var(--color-ink-3)]">{paceFromSpeed(a.average_speed)}/km</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Home;
