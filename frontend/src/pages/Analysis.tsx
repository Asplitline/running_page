import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { personalRecords, efficiencyByMonth } from '@/lib/analytics';
import { formatClock, formatDateDots, toKm } from '@/lib/format';
import { EfficiencyTrend } from '@/components/charts/EfficiencyTrend';
import { TooltipProvider } from '@/components/ui/Tooltip';

// 分析页 — PB 榜 + 有氧效率趋势 (M2)。

const Card = ({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const Analysis = () => {
  const pbs = personalRecords(activities);
  const effPoints = efficiencyByMonth(activities);

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
            <p className="text-sm text-[var(--color-ink-3)]">暂无符合距离档的记录</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pbs.map((pb) => (
                <Link
                  key={pb.key}
                  to={`/runs/${pb.activity.run_id}`}
                  className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">
                    {pb.label}
                  </div>
                  <div className="tnum mt-2 text-2xl font-bold tracking-tight">
                    {formatClock(pb.seconds)}
                  </div>
                  <div className="tnum mt-1 font-mono text-[11px] text-[var(--color-ink-3)]">
                    {toKm(pb.activity.distance)}km · {formatDateDots(pb.activity.start_date_local)}
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
      </main>
    </TooltipProvider>
  );
};

export default Analysis;
