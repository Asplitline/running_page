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
import RecentRunsSummary from '@/components/dashboard/RecentRunsSummary';
import AchievementBadges from '@/components/dashboard/AchievementBadges';
import { WeeklyVolumeChart } from '@/components/charts/WeeklyVolumeChart';

// 首页成就仪表盘 (M3)。
//
// 三层视觉密度，用来保证视线只有一个落点：
//   L1 英雄区  — 满宽 + shadow + 大留白，全页唯一的巨型字号 (总里程)
//   L2 坚持/峰值 — 无 shadow、无独立卡壳，靠 border 分区 + 紧凑 padding
//   L3 最近跑步 — 折叠线下的落脚点，divide-y 列表 + 轻量汇总
//
// 原先 6 个等重白盒各自捧一个巨型数字 (8 个 clamp 40px+ 焦点)，等于没有焦点。
// 现在轨迹覆盖率与身体状态并入英雄区数据条 (它们各自只承载一个数字，
// 撑不起一整块卡片)，本周跑量并入坚持栏 (同属"近期节律"语义)。

// 数据里最新年份 (不依赖当前时间，保证可复现)
const latestYear = (): number =>
  activities.reduce(
    (max, a) => Math.max(max, Number(a.start_date_local.slice(0, 4))),
    0
  );

// 数据锚点日 YYYY-MM-DD (同样不依赖当前时间)。热力图据此把锚点后的格子
// 画成"未来"底色，避免年后半段全空被误读成渲染失败
const latestDate = (): string =>
  activities.reduce(
    (max, a) =>
      a.start_date_local.slice(0, 10) > max
        ? a.start_date_local.slice(0, 10)
        : max,
    ''
  );

const Home = () => {
  const year = latestYear();
  const days = activeDays(activities, year);
  const throughDate = latestDate();

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

        {/* L1 — 全页唯一焦点。轨迹数与身体状态收进它的数据条 */}
        <HeroBanner
          activities={activities}
          year={year}
          tracks={tracksWithPolylineCount(activities)}
          metric={latestDailyMetric}
        />

        {/* 成就徽章行：里程碑(累计里程/次数) + 距离档首次达成，无成就时组件自身不渲染 */}
        <div className="mt-6">
          <AchievementBadges activities={activities} />
        </div>

        {/* L2 — 坚持 + 峰值双栏。去 shadow/去卡壳，仅用 border 划区，
            整体密度低于英雄区，视觉上退为支撑材料 */}
        <div className="mt-10 grid gap-8 border-t border-[var(--color-line)] pt-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
          {/* 坚持栏 — 主角：全年活跃天数，热力日历退为背景纹理。
              本周跑量 + 近 8 周趋势并入此栏：同属"近期节律"语义，
              原先单独占一块卡片只是把同一件事切成两块。
              min-w-0 必需：热力日历是 53 列 inline-grid，固有宽约 740px，
              不加它栅格轨道会被撑到固有宽、把整页顶出横向滚动条 */}
          <section className="flex min-w-0 flex-col">
            <p className="eyebrow">坚持 · 全年热力</p>
            <div className="mb-5 mt-3 flex items-end gap-3 leading-[0.9]">
              <span className="tnum text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
                {days}
              </span>
              <span className="text-sm font-semibold text-[var(--color-ink-3)]">
                天活跃 · {year}
              </span>
            </div>
            <HeatmapCalendar
              activities={activities}
              year={year}
              throughDate={throughDate}
            />

            {/* 近 8 周跑量趋势 — 热力图给全年节律，这里给最近八周的量 */}
            <div className="mt-8 border-t border-[var(--color-line)] pt-5">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow">近 8 周 · 本周跑量</p>
                <span className="tnum text-base font-bold text-[var(--color-ink)]">
                  {formatKm(thisWeekKm(activities))}
                  <span className="ml-1 text-xs font-normal text-[var(--color-ink-3)]">
                    km
                  </span>
                </span>
              </div>
              <div className="mt-3">
                <WeeklyVolumeChart weeks={weeklyVolume(activities)} />
              </div>
            </div>
          </section>

          {/* 峰值栏 — 主角：最长距离档 PB */}
          <section className="self-start lg:border-l lg:border-[var(--color-line)] lg:pl-10">
            <p className="eyebrow">峰值 · 个人最佳</p>
            <div className="mt-3">
              <PrSnapshot activities={activities} />
            </div>
          </section>
        </div>

        {/* L3 — 折叠线下:最近跑步退为落脚点。
            列表保持单列以延续时间序(横向切列会把时间线剪成几段并排),
            右栏放同批次汇总补上"这批跑得怎么样",沿用 L2 的 1.4fr_1fr 节奏。 */}
        <section className="mt-12 border-t border-[var(--color-line)] pt-8">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">最近跑步</p>
            <span className="font-mono text-[11px] text-[var(--color-ink-3)]">
              近 20 次
            </span>
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <RecentRuns />
            <RecentRunsSummary />
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
};

export default Home;
