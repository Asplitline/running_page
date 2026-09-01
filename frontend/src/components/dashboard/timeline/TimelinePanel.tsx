import type { Activity } from '@/data/types';
import { timelineEvents } from '@/lib/timeline';
import { TIER_COLOR_VAR, tierTone } from '@/design/tokens';
import TimelineCard from './TimelineCard';

// 时间轴面板 — 一条贯穿线串起全部高光事件。
//
// 布局两态 (同一条线,只改卡片挂在线的哪一侧):
//   宽屏 (lg+) — 线居中,卡片左右交替挂在两侧,吃满版心宽度
//   窄屏       — 线贴左,卡片全部挂右侧单列
// 交错序号跨年份连续,不按年重排 —— 否则每年都从左边起,节奏会断。
//
// 年份是弱标记:它只是时间流里的刻度,不是分章标题。小号 mono 灰字 + 小灰点,
// 视觉重量必须低于任何一张事件卡,否则读者先看到"2025"而不是"世遗马 -36 分"。

interface Props {
  activities: Activity[];
}

// 色阶图例 — 颜色承载"突破幅度"语义,没有图例就只是装饰
const TIER_LEGEND: { tier: keyof typeof TIER_COLOR_VAR; label: string }[] = [
  { tier: 'minor', label: '微幅 <2%' },
  { tier: 'notable', label: '显著 2–5%' },
  { tier: 'first', label: '首次达成' },
  { tier: 'major', label: '重大 >5%' },
  { tier: 'neutral', label: '训练 / 未达成' },
];

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    {TIER_LEGEND.map((l) => (
      <span key={l.tier} className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: tierTone(l.tier) }}
        />
        <span className="font-mono text-[10px] text-[var(--color-ink-3)]">
          {l.label}
        </span>
      </span>
    ))}
  </div>
);

type Weight = 'heavy' | 'mid' | 'light';

// 节点圆点尺寸按分量分三级,弱事件不抢线上的注意力
const DOT_SIZE: Record<Weight, string> = {
  heavy: 'h-3 w-3 border-2',
  mid: 'h-2.5 w-2.5 border-[1.5px]',
  light: 'h-1.5 w-1.5 border-0',
};

// 圆点水平定位:窄屏按分量微调让圆心落在贴左的线上(线在 left-[6px]),
// 宽屏统一移到居中线上。必须走 class 而非 inline style ——
// inline style 优先级高于类,会让 lg: 断点失效(圆点卡在左边)。
const DOT_POS: Record<Weight, string> = {
  heavy: 'left-[0.5px] lg:left-1/2 lg:-translate-x-1/2',
  mid: 'left-[1px] lg:left-1/2 lg:-translate-x-1/2',
  light: 'left-[3px] lg:left-1/2 lg:-translate-x-1/2',
};

const weightOf = (kind: string, tier: string): Weight =>
  kind === 'workout'
    ? 'light'
    : kind === 'race' || tier === 'major'
      ? 'heavy'
      : 'mid';

// 线上的弱刻度 (年份 / 「尚未达成」分界)。
// 宽屏落在居中线上,窄屏落在左侧线上。
const AxisTick = ({
  label,
  dashed = false,
}: {
  label: string;
  dashed?: boolean;
}) => (
  <div className="relative flex items-center py-1 lg:justify-center">
    <span
      aria-hidden
      className={`absolute left-[3px] h-[6px] w-[6px] rounded-full lg:left-1/2 lg:-translate-x-1/2 ${
        dashed
          ? 'border border-dashed border-[var(--color-ink-3)] bg-[var(--color-card)]'
          : 'bg-[var(--color-line)]'
      }`}
    />
    <span className="pl-7 font-mono text-[10px] tracking-[0.12em] text-[var(--color-ink-3)] lg:pl-0 lg:pr-0">
      <span className="bg-[var(--color-paper)] px-2 lg:px-3">{label}</span>
    </span>
  </div>
);

const TimelinePanel = ({ activities }: Props) => {
  const events = timelineEvents(activities);

  if (events.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--color-ink-3)]">
        暂无可展示的里程碑 —— 需要至少一次跑步记录
      </p>
    );
  }

  const seenYear = new Set<string>();
  let goalDividerShown = false;
  // 交错序号跨年份连续 —— 按段内重排会让每段都从左侧起,节奏断掉
  let flatIndex = -1;

  return (
    <section className="mx-auto mt-4 max-w-[1040px]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="eyebrow">高光时刻 · 颜色 = 突破幅度</p>
        <Legend />
      </div>

      {/* 贯穿线:窄屏 left-[6px] 贴左,宽屏移到 left-1/2 居中 */}
      <div className="relative mt-5">
        <span
          aria-hidden
          className="absolute bottom-4 left-[6px] top-2 w-[1.5px] lg:left-1/2 lg:-translate-x-1/2"
          style={{
            // 两端淡出,避免线头像被截断
            background:
              'linear-gradient(var(--color-line-2), var(--color-line) 4%, var(--color-line) 96%, var(--color-line-2))',
          }}
        />

        <div className="flex flex-col gap-2.5">
          {events.map((e) => {
            const isGoal = e.kind === 'goal';
            const weight = weightOf(e.kind, e.tier);
            const year = e.date.slice(0, 4);
            const showYear = !isGoal && !seenYear.has(year);
            if (showYear) seenYear.add(year);
            const showGoalDivider = isGoal && !goalDividerShown;
            if (showGoalDivider) goalDividerShown = true;

            flatIndex += 1;
            // 宽屏:奇数项挂右侧,偶数项挂左侧
            const onRight = flatIndex % 2 === 1;

            return (
              <div key={e.key}>
                {showYear && <AxisTick label={year} />}
                {showGoalDivider && <AxisTick label="尚未达成" dashed />}

                {/* 事件行:窄屏单列(卡在右),宽屏两列交错。
                    圆点绝对定位到线上,不占栅格轨道。 */}
                <div className="relative pl-7 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:pl-0">
                  <span
                    aria-hidden
                    className={`absolute top-[13px] z-10 rounded-full ${DOT_SIZE[weight]} ${DOT_POS[weight]}`}
                    style={{
                      background:
                        weight === 'light' || (weight === 'heavy' && !isGoal)
                          ? tierTone(e.tier)
                          : 'var(--color-card)',
                      borderColor: tierTone(e.tier),
                      borderStyle: isGoal ? 'dashed' : 'solid',
                      boxShadow:
                        weight === 'heavy'
                          ? `0 0 0 3px color-mix(in srgb, ${tierTone(e.tier)} 18%, transparent)`
                          : undefined,
                    }}
                  />

                  {/* 宽屏左侧卡:右对齐贴向轴心;右侧卡:左对齐贴向轴心 */}
                  {onRight ? (
                    <>
                      <div aria-hidden className="hidden lg:block" />
                      <div className="lg:flex lg:justify-start">
                        <TimelineCard event={e} align="left" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="lg:flex lg:justify-end">
                        <TimelineCard event={e} align="right" />
                      </div>
                      <div aria-hidden className="hidden lg:block" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TimelinePanel;
