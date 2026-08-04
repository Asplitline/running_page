import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { TooltipProvider } from '@/components/ui/Tooltip';
import StatsBar from '@/components/dashboard/StatsBar';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import PrSnapshot from '@/components/dashboard/PrSnapshot';
import RecentRuns from '@/components/dashboard/RecentRuns';

// 首页成就仪表盘 (M3)。总览 + 热力日历 + PB 快照 + 最近活动。

// 数据里最新年份 (不依赖当前时间，保证可复现)
const latestYear = (): number =>
  activities.reduce((max, a) => Math.max(max, Number(a.start_date_local.slice(0, 4))), 0);

const Card = ({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const Home = () => {
  const year = latestYear();

  return (
    <TooltipProvider delayDuration={100}>
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
          跑步档案
        </h1>

        <div className="mt-8">
          <StatsBar activities={activities} year={year} />
        </div>

        <Card eyebrow={`活跃日历 · ${year}`}>
          <HeatmapCalendar activities={activities} year={year} />
        </Card>

        <Card eyebrow="最佳成绩 · Personal Records">
          <PrSnapshot activities={activities} />
        </Card>

        <Card eyebrow="最近跑步">
          <RecentRuns />
        </Card>
      </main>
    </TooltipProvider>
  );
};

export default Home;
