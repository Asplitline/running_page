import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import {
  personalRecords,
  efficiencyByMonth,
  paceHrScatter,
} from '@/lib/analytics';
import { acwr } from '@/lib/stats';
import { formatClock, formatDateDots, toKm } from '@/lib/format';
import { EfficiencyTrend } from '@/components/charts/EfficiencyTrend';
import { PaceHrScatter } from '@/components/charts/PaceHrScatter';
import { TooltipProvider } from '@/components/ui/Tooltip';

// 分析页 — PB 榜 + 有氧效率趋势 + 配速心率散点 + 训练负荷 (M2)。

// ACWR 区间判读: <0.8 负荷不足, 0.8~1.3 理想, 1.3~1.5 偏高, >1.5 风险升高
const acwrTone = (value: number): { label: string; color: string } => {
  if (value < 0.8) return { label: '负荷不足', color: 'var(--color-ink-3)' };
  if (value <= 1.3) return { label: '理想区间', color: 'var(--color-route)' };
  if (value <= 1.5) return { label: '负荷偏高', color: 'var(--color-accent)' };
  return { label: '受伤风险升高', color: 'var(--color-accent)' };
};

const Card = ({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const Analysis = () => {
  const pbs = personalRecords(activities);
  const effPoints = efficiencyByMonth(activities);
  const scatterPoints = paceHrScatter(activities);
  const acwrValue = acwr(activities);

  return (
    <TooltipProvider delayDuration={100}>
      <main className="w-full px-6 py-12 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          ← 首页
        </Link>

        <header className="mt-4">
          <p className="eyebrow">Analysis</p>
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            训练分析
          </h1>
        </header>

        <Card eyebrow="最佳成绩 · Personal Records">
          {pbs.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-3)]">
              暂无符合距离档的记录
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pbs.map((pb) => (
                <Link
                  key={pb.key}
                  to={`/runs/${pb.activity.run_id}`}
                  className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-ink-3)]">
                    {pb.label}
                  </div>
                  <div className="tnum mt-2 text-2xl font-bold tracking-tight">
                    {formatClock(pb.seconds)}
                  </div>
                  <div className="tnum mt-1 font-mono text-[11px] text-[var(--color-ink-3)]">
                    {toKm(pb.activity.distance)}km ·{' '}
                    {formatDateDots(pb.activity.start_date_local)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card eyebrow="有氧效率趋势 · 上行 = 进步">
          <EfficiencyTrend points={effPoints} />
          <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
            效率 = 速度 ÷ 心率 × 100。同心率下跑得更快，曲线上行。
          </p>
        </Card>

        <Card eyebrow="配速 · 心率散点">
          <PaceHrScatter points={scatterPoints} />
          <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
            越靠右 = 配速越快，越靠上 = 心率越高。点越大代表单次距离越长。
          </p>
        </Card>

        {acwrValue != null && (
          <Card eyebrow="训练负荷 · ACWR">
            <div className="flex items-baseline gap-3">
              <span
                className="tnum text-4xl font-bold tracking-tight"
                style={{ color: acwrTone(acwrValue).color }}
              >
                {acwrValue.toFixed(2)}
              </span>
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-3 py-1 font-mono text-xs text-[var(--color-ink-2)]">
                {acwrTone(acwrValue).label}
              </span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
              急慢性负荷比 = 近1周跑量 ÷ 近4周周均跑量。理想区间 0.8~1.3，超过
              1.5 提示受伤风险升高。
            </p>
          </Card>
        )}
      </main>
    </TooltipProvider>
  );
};

export default Analysis;
