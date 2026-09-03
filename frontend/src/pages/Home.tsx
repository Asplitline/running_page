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
import HeatLegend from '@/components/dashboard/HeatLegend';
import LatestRunPanel from '@/components/dashboard/LatestRunPanel';
import NextGoalsPanel from '@/components/dashboard/NextGoalsPanel';
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
// 撑不起一整块卡片)。
//
// L2 这层曾是「坚持 1.4fr / 峰值 1fr」双栏，两个问题：
//   1. 热力图固有宽约 760px，1.4fr 轨道在 1440px 以下装不下，靠 overflow-x
//      静默裁掉年末月份 —— 用户既看不到数据，也没有可滚动的提示。
//   2. PB 已在分析页有全档版本，而英雄区数据条里还有一个「全马 PB」格，
//      右栏那组卡片是同一页内的第三次复述，撑出约 210px 空白。
// 现在热力图提为满宽横幅 (满宽后 1024px 以上都能单行画完整年)，PB 栏移除，
// 下方两卡讲「最近节律」与「下一个目标」—— 后者是首页独有、分析页没有的视角。

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

        {/* L2 — 坚持横幅：热力图满宽。去 shadow/去卡壳，仅用 border 划区，
            整体密度低于英雄区，视觉上退为支撑材料。
            满宽是热力图的物理需求：单行画完整年需约 760px，塞进任何分栏轨道
            都会在常见视宽下装不下。组件内部按容器宽度自适应分段，不再溢出。 */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="eyebrow">坚持 · 全年热力</p>
              <span className="flex items-end gap-2.5 leading-[0.9]">
                <span className="tnum text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">
                  {days}
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink-3)]">
                  天活跃 · {year}
                </span>
              </span>
            </div>
            {/* 图例移到标题行：原先埋在热力图下方紧贴分割线，9px 字读不到 */}
            <HeatLegend />
          </div>
          <div className="mt-4">
            <HeatmapCalendar
              activities={activities}
              year={year}
              throughDate={throughDate}
            />
          </div>
        </section>

        {/* 节律 + 目标。原「峰值 · 个人最佳」栏已移除：PB 在分析页有全档，
            英雄区数据条也有一格全马 PB，此处是同页第三次复述。
            腾出的位置给「还差多少」——首页独有视角，分析页只讲已发生的事。
            目标面板内部自带双栏(主目标 + 触手可及的突破)，所以给它更宽的
            轨道；它也自带描边与内边距，外层不再重复包一层卡壳。 */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <section className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="eyebrow">节律 · 近 8 周</p>
              <span className="whitespace-nowrap font-mono text-[11px] text-[var(--color-ink-3)]">
                本周{' '}
                <b className="tnum text-[15px] font-bold text-[var(--color-ink)]">
                  {formatKm(thisWeekKm(activities))}
                </b>
                km
              </span>
            </div>
            <WeeklyVolumeChart weeks={weeklyVolume(activities)} />
          </section>

          <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)]">
            <NextGoalsPanel activities={activities} />
          </div>
        </div>

        {/* L3 — 折叠线下：最近跑步退为落脚点。
            原先铺 20 条流水 + 汇总卡，占掉全页最大一块面积却只在"想点进某一次"时
            才有用 —— 而那个用途不需要摊开 20 条。现在只讲最近一次，并给它两个
            参照系 (同类型历史、周节律),三段等宽。全部记录走 /analysis。 */}
        <section className="mt-12 border-t border-[var(--color-line)] pt-8">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">最近跑步</p>
            <Link
              to="/analysis"
              className="font-mono text-[11px] text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
            >
              全部记录 →
            </Link>
          </div>
          <div className="mt-4">
            <LatestRunPanel activities={activities} />
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
};

export default Home;
