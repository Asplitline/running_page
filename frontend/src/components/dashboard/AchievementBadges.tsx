import type { Activity } from '@/data/types';
import { achievements } from '@/lib/achievements';
import { formatDateDots } from '@/lib/format';

// 成就徽章行 — 已解锁成就按达成时间倒序展示 (最新解锁在前)。
// 无成就(数据太少)时不渲染整个区块，交给 Home.tsx 判空。

interface Props {
  activities: Activity[];
}

const AchievementBadges = ({ activities }: Props) => {
  const list = achievements(activities);
  if (list.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((a, i) => (
        <div
          key={a.key}
          className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-card-2)] px-3 py-1.5"
          style={i === 0 ? { borderColor: 'var(--color-accent)' } : undefined}
        >
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {a.label}
          </span>
          <span className="tnum font-mono text-[10px] text-[var(--color-ink-3)]">
            {formatDateDots(a.achievedDate)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AchievementBadges;
