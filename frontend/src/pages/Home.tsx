import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { activeDays } from '@/lib/stats';
import { TooltipProvider } from '@/components/ui/Tooltip';
import HeroBanner from '@/components/dashboard/HeroBanner';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import PrSnapshot from '@/components/dashboard/PrSnapshot';
import RecentRuns from '@/components/dashboard/RecentRuns';

// 首页成就仪表盘 (M3)。金字塔布局：英雄区 (顶) → 坚持 + 峰值双栏 (中) → 最近列表 (折叠线下)。

// 数据里最新年份 (不依赖当前时间，保证可复现)
const latestYear = (): number =>
  activities.reduce((max, a) => Math.max(max, Number(a.start_date_local.slice(0, 4))), 0);

const Home = () => {
  const year = latestYear();
  const days = activeDays(activities, year);

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

        <HeroBanner activities={activities} year={year} />

        {/* 金字塔中层：坚持 + 峰值双栏 */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* 坚持栏 — 主角：全年活跃天数，热力日历退为背景纹理 */}
          <section className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="eyebrow">坚持 · 全年热力</p>
            <div className="mt-3 mb-6 flex items-end gap-3 leading-[0.85]">
              <span
                className="tnum text-[clamp(48px,7vw,84px)] font-extrabold tracking-tighter text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {days}
              </span>
              <span className="mb-2 text-base font-semibold text-[var(--color-ink-3)]">
                天活跃 · {year}
              </span>
            </div>
            <div className="mt-auto">
              <HeatmapCalendar activities={activities} year={year} />
            </div>
          </section>

          {/* 峰值栏 — 主角：最长距离档 PB */}
          <section className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="eyebrow">峰值 · 个人最佳</p>
            <div className="mt-3 flex-1">
              <PrSnapshot activities={activities} />
            </div>
          </section>
        </div>

        {/* 折叠线下：最近跑步退为落脚点，去等权卡壳弱化 */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">最近跑步</p>
            <span className="font-mono text-[11px] text-[var(--color-ink-3)]">近 20 次</span>
          </div>
          <RecentRuns />
        </section>
      </main>
    </TooltipProvider>
  );
};

export default Home;
