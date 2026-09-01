import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { TimelineEvent } from '@/lib/timeline';
import { tierTone } from '@/design/tokens';
import { formatClock, formatDateDots, formatPace } from '@/lib/format';

// 单个时间轴事件卡。按 kind 决定分量、按 tier 决定配色。
//
// 三档分量 (视觉重量递减,保证一屏内只有少数几个落点):
//   heavy — 比赛 / 重大突破 / 顶档里程碑:染色边框 + 淡染底 + 侧色条
//   mid   — 普通 PB / 里程碑 / 月峰值:仅染色边框
//   light — 首次质量课:无卡壳,单行文本
//   goal  — 未达成目标:虚线边框 + 中性灰
//
// 配色全部走 --tone 这一个自定义属性,由 tier 注入,
// 卡内所有元素 (边框/侧条/徽章/大数字/进度条) 都引用它 —— 换档只需换一个值。

interface Props {
  event: TimelineEvent;
  // 卡片贴向轴心的哪一侧 —— 决定侧色条位置与内容对齐方向。
  // 宽屏左列卡传 'right'(内容右对齐贴轴心),右列卡传 'left'。
  // 窄屏全部单列,panel 用 lg: 断点让镜像只在宽屏生效。
  align?: 'left' | 'right';
}

// 秒 → "36 分 12 秒" / "2 分 00 秒"(提升幅度用中文更好读)
const formatGain = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} 秒`;
  return s === 0 ? `${m} 分` : `${m} 分 ${String(s).padStart(2, '0')} 秒`;
};

// 事件 → 徽章文案。比赛带奖牌,PB 带档位描述。
const badgeText = (e: TimelineEvent): string => {
  switch (e.kind) {
    case 'race':
      return e.gainPct ? `🏅 比赛 · ${e.label} PB` : '🏅 比赛';
    case 'pb':
      return e.tier === 'first' ? `首次达成 · ${e.label}` : `${e.label} PB`;
    case 'milestone':
      return '累计里程碑';
    case 'peak':
      return '月度峰值';
    case 'workout':
      return `首次${e.label}`;
    case 'goal':
      return '下一个目标';
  }
};

// 分量档:决定用哪套卡壳样式
const weightOf = (e: TimelineEvent): 'heavy' | 'mid' | 'light' | 'goal' => {
  if (e.kind === 'goal') return 'goal';
  if (e.kind === 'workout') return 'light';
  if (e.kind === 'race') return 'heavy';
  if (e.tier === 'major') return 'heavy';
  return 'mid';
};

const SHELL: Record<string, string> = {
  heavy:
    'inline-block rounded-[10px] border relative overflow-hidden py-2.5 pl-4 pr-4 border-[color-mix(in_srgb,var(--tone)_42%,var(--color-line))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--tone)_9%,var(--color-card)),var(--color-card))]',
  mid: 'inline-block rounded-[10px] border px-3.5 py-2.5 border-[color-mix(in_srgb,var(--tone)_30%,var(--color-line))] bg-[var(--color-card-2)]',
  light: 'flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-0.5',
  goal: 'inline-block rounded-[10px] border border-dashed border-[var(--color-line)] px-3.5 py-2.5',
};

// 大数字 — 里程碑/峰值/目标的主角
const HeroNumber = ({
  value,
  unit,
  size = 'text-[22px]',
  muted = false,
  isRight = false,
}: {
  value: string;
  unit: string;
  size?: string;
  muted?: boolean;
  isRight?: boolean;
}) => (
  <div
    className={`mt-1.5 flex items-baseline gap-1.5${isRight ? ' lg:justify-end' : ''}`}
  >
    <span
      className={`tnum font-extrabold leading-[0.95] tracking-tight ${size}`}
      style={{
        fontFamily: 'var(--font-display)',
        color: muted ? 'var(--color-ink-2)' : 'var(--tone)',
      }}
    >
      {value}
    </span>
    <span className="text-xs font-semibold text-[var(--color-ink-2)]">
      {unit}
    </span>
  </div>
);

// 指标条 — 比赛卡的用时/距离/配速/心率
const MetricRow = ({
  event,
  isRight = false,
}: {
  event: TimelineEvent;
  isRight?: boolean;
}) => {
  const items = [
    event.seconds
      ? { label: '净时间', value: formatClock(event.seconds) }
      : null,
    event.distanceKm ? { label: 'km', value: String(event.distanceKm) } : null,
    event.paceSecPerKm
      ? { label: '配速', value: formatPace(event.paceSecPerKm) }
      : null,
    event.hr ? { label: '心率', value: String(event.hr) } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);
  if (items.length === 0) return null;
  return (
    <div
      className={`mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-1${isRight ? ' lg:justify-end' : ''}`}
    >
      {items.map((m) => (
        <div key={m.label} className="flex flex-col gap-px">
          <span className="tnum font-mono text-[13px] font-semibold text-[var(--color-ink)]">
            {m.value}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-[var(--color-ink-3)]">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// PB 对比 — 旧值删除线 → 新值染色 + 提升幅度
const PbCompare = ({
  event,
  isRight = false,
}: {
  event: TimelineEvent;
  isRight?: boolean;
}) => {
  if (!event.prevSeconds || !event.gainSeconds) return null;
  // 进度条宽度 = 新成绩相对旧成绩的比例 (越短越快,视觉上"追回"了一截)
  const pct = Math.round((event.seconds! / event.prevSeconds) * 100);
  return (
    <>
      <div
        className={`mt-2 h-1 max-w-[200px] overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-line-2)]${isRight ? ' lg:ml-auto' : ''}`}
      >
        <div
          className="h-full rounded-[var(--radius-xs)]"
          style={{ width: `${pct}%`, background: 'var(--tone)' }}
        />
      </div>
      <div
        className={`mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-[10px] text-[var(--color-ink-3)]${isRight ? ' lg:justify-end' : ''}`}
      >
        <s>{formatClock(event.prevSeconds)}</s>
        <span>→</span>
        <b className="font-bold" style={{ color: 'var(--tone)' }}>
          {formatClock(event.seconds!)}
        </b>
        <span className="font-semibold" style={{ color: 'var(--tone)' }}>
          ↓ {event.gainPct}% · 快 {formatGain(event.gainSeconds)}
        </span>
      </div>
    </>
  );
};

// PB 阶梯 — 连续刷新 ≥3 次时用柱状图呈现整条进步曲线。
// 柱高 = 成绩 (越低越快),柱色 = 该次提升幅度档位。
const PbSteps = ({
  steps,
  isRight = false,
}: {
  steps: NonNullable<TimelineEvent['steps']>;
  isRight?: boolean;
}) => {
  const fastest = Math.min(...steps.map((s) => s.seconds));
  const slowest = Math.max(...steps.map((s) => s.seconds));
  const span = slowest - fastest;
  // 柱高按"距最快成绩的差距"归一化 —— 直接用 seconds/max 会让 55:49 与 53:23
  // 只差 7%、柱子几乎等高,进步看不出来。这里把差距拉满整个高度区间。
  const heightOf = (sec: number): number =>
    span === 0 ? 100 : Math.round(28 + ((sec - fastest) / span) * 72);
  return (
    <>
      <div
        className={`mt-2 flex h-[34px] items-end gap-1${isRight ? ' lg:justify-end' : ''}`}
      >
        {steps.map((s, i) => {
          const isLatest = i === steps.length - 1;
          return (
            <div
              key={s.date}
              className="w-[24px] rounded-t-[var(--radius-xs)]"
              style={{
                height: `${heightOf(s.seconds)}%`,
                // 首条是基线(灰),最新一条用档位色,中间过渡色
                background:
                  i === 0
                    ? 'var(--color-line)'
                    : isLatest
                      ? 'var(--tone)'
                      : 'color-mix(in srgb, var(--tone) 45%, var(--color-line))',
              }}
            />
          );
        })}
      </div>
      <div className={`mt-0.5 flex gap-1${isRight ? ' lg:justify-end' : ''}`}>
        {steps.map((s, i) => (
          <span
            key={s.date}
            className="tnum w-[24px] text-center font-mono text-[8px] leading-tight"
            style={{
              color:
                i === steps.length - 1 ? 'var(--tone)' : 'var(--color-ink-3)',
              fontWeight: i === steps.length - 1 ? 600 : 400,
            }}
          >
            {formatClock(s.seconds)}
          </span>
        ))}
      </div>
    </>
  );
};

// 目标进度条 — 中性灰,与已达成事件区分
const GoalProgress = ({
  event,
  isRight = false,
}: {
  event: TimelineEvent;
  isRight?: boolean;
}) => (
  <>
    <div
      className={`mt-2 h-1 max-w-[200px] overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-line-2)]${isRight ? ' lg:ml-auto' : ''}`}
    >
      <div
        className="h-full rounded-[var(--radius-xs)] bg-[var(--color-ink-3)]"
        style={{ width: `${event.progressPct}%` }}
      />
    </div>
    <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-3)]">
      已完成 {event.progressPct}%
    </p>
  </>
);

const TimelineCard = ({ event, align = 'left' }: Props) => {
  const weight = weightOf(event);
  const isRight = align === 'right';

  const body = (
    <div
      className={`${SHELL[weight]}${isRight ? (weight === 'light' ? ' lg:justify-end lg:text-right' : ' lg:text-right') : ''}`}
      style={{ '--tone': tierTone(event.tier) } as CSSProperties}
    >
      {/* heavy 卡的侧色条 — 交错布局下贴向轴心那一侧 */}
      {/* 侧色条贴向轴心那一侧:窄屏卡片统一在轴右侧 → 条在左;
          宽屏左列卡 (isRight) 贴轴心在右 → 条翻到右。
          必须走 lg: 类 —— inline style 会让断点失效、窄屏也翻到右边。 */}
      {weight === 'heavy' && (
        <span
          aria-hidden
          className={`absolute inset-y-2 left-0 w-[2.5px] rounded-r-[2px] bg-[var(--tone)]${
            isRight
              ? ' lg:left-auto lg:right-0 lg:rounded-l-[2px] lg:rounded-r-none'
              : ''
          }`}
        />
      )}

      {weight === 'light' ? (
        // 轻量:徽章 + 标题 + 日期挤成一行
        <>
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-card-2)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-ink-2)]">
            {badgeText(event)}
          </span>
          <span className="text-[13px] font-semibold text-[var(--color-ink)]">
            {event.title}
          </span>
          <span className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">
            {event.distanceKm}km · {formatDateDots(event.date)}
          </span>
        </>
      ) : (
        <>
          <div
            className={`flex flex-wrap items-center gap-2${isRight ? ' lg:justify-end' : ''}`}
          >
            <span
              className="rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em]"
              style={
                event.kind === 'goal'
                  ? {
                      border: '1px dashed var(--color-line)',
                      color: 'var(--color-ink-3)',
                    }
                  : {
                      background:
                        'color-mix(in srgb, var(--tone) 16%, transparent)',
                      color: 'var(--tone)',
                    }
              }
            >
              {badgeText(event)}
            </span>
            {event.kind !== 'goal' && (
              <span className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">
                {formatDateDots(event.date)}
              </span>
            )}
          </div>

          {/* 比赛:标题 + 四指标 */}
          {event.kind === 'race' && (
            <>
              <p
                className="mt-1.5 text-[14px] font-bold tracking-tight text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {event.title}
              </p>
              <MetricRow event={event} isRight={isRight} />
              <PbCompare event={event} isRight={isRight} />
            </>
          )}

          {/* PB:成绩大数 + 对比/阶梯 */}
          {event.kind === 'pb' && (
            <>
              <HeroNumber
                value={formatClock(event.seconds!)}
                unit={
                  event.tier === 'first' ? `首个${event.label}成绩` : '新纪录'
                }
                size="text-[19px]"
                isRight={isRight}
              />
              {event.steps && event.steps.length >= 3 ? (
                <PbSteps steps={event.steps} isRight={isRight} />
              ) : (
                <PbCompare event={event} isRight={isRight} />
              )}
            </>
          )}

          {/* 里程碑:里程大数 */}
          {event.kind === 'milestone' && (
            <HeroNumber
              value={String(event.km)}
              unit="km 达成"
              isRight={isRight}
            />
          )}

          {/* 月峰值:里程大数 + 次数 */}
          {event.kind === 'peak' && (
            <>
              <HeroNumber
                value={String(event.km)}
                unit={`km · ${event.monthRuns} 次`}
                size="text-[19px]"
                isRight={isRight}
              />
              {event.note && (
                <p className="mt-1.5 font-mono text-[10px] text-[var(--color-ink-3)]">
                  {event.note}
                </p>
              )}
            </>
          )}

          {/* 目标:剩余量 + 进度 */}
          {event.kind === 'goal' && (
            <>
              <HeroNumber
                value={
                  event.seconds ? formatClock(event.seconds) : String(event.km)
                }
                unit={
                  event.remainKm != null
                    ? `km · 还差 ${event.remainKm}km`
                    : `· 还差 ${formatGain(event.remainSeconds!)}`
                }
                size="text-[19px]"
                muted
                isRight={isRight}
              />
              <GoalProgress event={event} isRight={isRight} />
            </>
          )}

          {event.kind !== 'peak' && event.note && (
            <p className="mt-1.5 font-mono text-[10px] text-[var(--color-ink-3)]">
              {event.note}
            </p>
          )}
        </>
      )}
    </div>
  );

  // 有 runId 的事件可跳详情页;目标/峰值没有对应单次跑步,不做链接
  return event.runId ? (
    <Link
      to={`/runs/${event.runId}`}
      className="inline-block max-w-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    >
      {body}
    </Link>
  ) : (
    body
  );
};

export default TimelineCard;
