import { Link } from 'react-router-dom';
import { activitiesByDateDesc } from '@/data/activities';
import { toKm, paceFromSpeed, formatDateDots } from '@/lib/format';
import { splitRunName, markHighlights } from '@/lib/recentRuns';

// 最近 20 次跑步 — 首页仪表盘落脚点。
// 单列时间线:数据按日期倒序,横向切多列会把一条时间线剪成几段并排,
// 追"最近这段跑得怎么样"时视线得走 Z 字,故保持纵向连续。
// 20 条同构记录用分隔线而非 20 圈边框,减少容器噪音、便于纵向扫描比较。

// 列表与右侧汇总栏共用同一批数据,条数在此单点定义
export const RECENT_COUNT = 20;

const RecentRuns = () => {
  const rows = markHighlights(activitiesByDateDesc().slice(0, RECENT_COUNT));

  return (
    <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)]">
      {rows.map(({ activity: a, isLongest, isFastest }) => {
        const { place, workout } = splitRunName(a.name);
        return (
          <li key={a.run_id}>
            <Link
              to={`/runs/${a.run_id}`}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--color-card-2)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{place}</span>
                  {workout && (
                    <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-ink-2)]">
                      {workout}
                    </span>
                  )}
                </div>
                <div className="tnum font-mono text-xs text-[var(--color-ink-3)]">
                  {formatDateDots(a.start_date_local)}
                </div>
              </div>

              <div className="tnum shrink-0 text-right font-mono text-sm">
                <div className="font-bold">
                  <span
                    className={
                      isLongest
                        ? 'rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-1.5 py-0.5 text-white'
                        : ''
                    }
                  >
                    {toKm(a.distance)} km
                  </span>
                </div>
                <div
                  className={
                    isFastest
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-ink-3)]'
                  }
                >
                  {paceFromSpeed(a.average_speed)}/km
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default RecentRuns;
