import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { latestDailyMetric } from '@/data/dailyMetrics';
import { activeDays, weeklyVolume, thisWeekKm } from '@/lib/stats';
import { formatKm } from '@/lib/format';
import { TooltipProvider } from '@/components/ui/Tooltip';
import HeroBanner from '@/components/dashboard/HeroBanner';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import PrSnapshot from '@/components/dashboard/PrSnapshot';
import RecentRuns from '@/components/dashboard/RecentRuns';
import { WeeklyVolumeChart } from '@/components/charts/WeeklyVolumeChart';

// 首页成就仪表盘 (M3)。金字塔布局：英雄区 (顶) → 坚持 + 峰值双栏 (中) → 最近列表 (折叠线下)。

// 数据里最新年份 (不依赖当前时间，保证可复现)
const latestYear = (): number =>
  activities.reduce(
    (max, a) => Math.max(max, Number(a.start_date_local.slice(0, 4))),
    0
  );

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

        {/* 近期状态：本周跑量 + 近 8 周趋势 + VO2max/训练状态(有数据才显示) */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">近期 · 本周跑量</p>
            <span className="tnum text-2xl font-bold text-[var(--color-ink)]">
              {formatKm(thisWeekKm(activities))}
              <span className="ml-1 text-sm font-normal text-[var(--color-ink-3)]">
                km
              </span>
            </span>
          </div>
          <div className="mt-4">
            <WeeklyVolumeChart weeks={weeklyVolume(activities)} />
          </div>

          {(latestDailyMetric?.vo2max != null ||
            latestDailyMetric?.training_status_label != null) && (
            <div className="mt-6 flex gap-8 border-t border-[var(--color-line)] pt-4">
              {latestDailyMetric?.vo2max != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    VO2Max
                  </div>
                  <div className="tnum text-xl font-bold">
                    {latestDailyMetric.vo2max}
                  </div>
                </div>
              )}
              {latestDailyMetric?.training_status_label != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    训练状态
                  </div>
                  <div className="text-xl font-bold capitalize">
                    {latestDailyMetric.training_status_label}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 金字塔中层：坚持 + 峰值双栏 */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* 坚持栏 — 主角：全年活跃天数，热力日历退为背景纹理 */}
          <section className="flex flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="eyebrow">坚持 · 全年热力</p>
            <div className="mb-6 mt-3 flex items-end gap-3 leading-[0.85]">
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
            <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
              近 20 次
            </span>
          </div>
          <RecentRuns />
        </section>
      </main>
    </TooltipProvider>
  );
};

export default Home;
