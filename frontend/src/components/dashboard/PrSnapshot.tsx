import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { personalRecords, PB_DISTANCES } from '@/lib/analytics';
import { formatClock, formatDateDots, formatPace, toKm } from '@/lib/format';
import type { PersonalRecord } from '@/lib/analytics';

// PB 快照 — 主角档布局：最长距离档提为大号主角，其余档收小竖排撑满。
// 主角 = pbs 里距离最长的档 (PB_DISTANCES 升序，取匹配到的最靠后 key)。
// 每档带配速 (峰值栏语义 = 多快)，配速 = 用时 / 距离，零新数据。

interface Props {
  activities: Activity[];
}

// 各档距离序 (越大越靠后)，用于选主角
const distanceRank = (key: string): number =>
  PB_DISTANCES.findIndex((d) => d.key === key);

// PB 配速 (秒/km)
const pbPace = (pb: PersonalRecord): string =>
  formatPace(pb.seconds / (pb.activity.distance / 1000));

const PrSnapshot = ({ activities }: Props) => {
  const pbs = personalRecords(activities);
  if (pbs.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-3)]">暂无符合距离档的记录</p>
    );
  }

  // 最长距离档为主角，其余按距离降序收小
  const hero = pbs.reduce((a, b) =>
    distanceRank(b.key) > distanceRank(a.key) ? b : a
  );
  const rest = pbs
    .filter((p) => p.key !== hero.key)
    .sort((a, b) => distanceRank(b.key) - distanceRank(a.key));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 主角：最长距离档 */}
      <Link
        to={`/runs/${hero.activity.run_id}`}
        className="group rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 transition-colors hover:border-[var(--color-accent)]"
      >
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
            {hero.label} 最佳
          </span>
          <span className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">
            {formatDateDots(hero.activity.start_date_local)}
          </span>
        </div>
        <div
          className="tnum mt-2 text-[clamp(40px,6vw,60px)] font-extrabold leading-none tracking-tight text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatClock(hero.seconds)}
        </div>
        <div className="mt-2 flex gap-4 font-mono text-[11px] text-[var(--color-ink-3)]">
          <span className="tnum">{toKm(hero.activity.distance)} km</span>
          <span className="tnum">
            配速{' '}
            <b className="font-semibold text-[var(--color-ink-2)]">
              {pbPace(hero)}
            </b>
            /km
          </span>
        </div>
      </Link>

      {/* 其余档收小竖排，撑满剩余高度对齐左栏 */}
      {rest.length > 0 && (
        <div className="grid flex-1 grid-cols-3 gap-3">
          {rest.map((pb) => (
            <Link
              key={pb.key}
              to={`/runs/${pb.activity.run_id}`}
              className="flex flex-col justify-center rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-3 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                {pb.label}
              </div>
              <div className="tnum mt-1.5 text-lg font-bold tracking-tight">
                {formatClock(pb.seconds)}
              </div>
              <div className="tnum mt-1 font-mono text-[10px] text-[var(--color-ink-3)]">
                {pbPace(pb)}/km
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrSnapshot;
