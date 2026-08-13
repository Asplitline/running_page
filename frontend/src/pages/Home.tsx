import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import { latestDailyMetric } from '@/data/dailyMetrics';
import {
  activeDays,
  weeklyVolume,
  thisWeekKm,
  tracksWithPolylineCount,
} from '@/lib/stats';
import { formatKm } from '@/lib/format';
import { TooltipProvider } from '@/components/ui/Tooltip';
import HeroBanner from '@/components/dashboard/HeroBanner';
import HeatmapCalendar from '@/components/dashboard/HeatmapCalendar';
import PrSnapshot from '@/components/dashboard/PrSnapshot';
import RecentRuns from '@/components/dashboard/RecentRuns';
import AchievementBadges from '@/components/dashboard/AchievementBadges';
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

        {/* 成就徽章行：里程碑(累计里程/次数) + 距离档首次达成，无成就时组件自身不渲染 */}
        <div className="mt-6">
          <AchievementBadges activities={activities} />
        </div>

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

        {/* 地图板块降权为卡片：无真实地图渲染(新前端零 mapbox 依赖)，
            用轨迹覆盖率代替"城市数"——location_country 因 CI 同步时
            SKIP_REVERSE_GEOCODE 恒为空，不可用 */}
        <section className="mt-6 flex items-center gap-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex-1">
            <p className="eyebrow">轨迹 · 足迹地图</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="tnum text-4xl font-extrabold tracking-tight text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {tracksWithPolylineCount(activities)}
              </span>
              <span className="text-sm text-[var(--color-ink-3)]">
                次跑步留下了完整 GPS 轨迹
              </span>
            </div>
          </div>
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            className="shrink-0 opacity-60"
            aria-hidden="true"
          >
            {[
              [12, 20],
              [24, 12],
              [38, 26],
              [50, 16],
              [58, 32],
              [44, 44],
              [30, 40],
              [18, 52],
              [40, 58],
              [56, 54],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={i % 3 === 0 ? 4 : 2.5}
                fill="var(--color-route)"
              />
            ))}
          </svg>
        </section>

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
