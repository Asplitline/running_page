import type { Activity } from '@/data/types';
import { nextGoals } from '@/lib/nextGoals';
import { formatClock, formatKm } from '@/lib/format';

// 「还差多少」面板 — 首页成就区讲未来。
//
// 为什么不再讲"已达成":这批里程碑在分析页的「里程碑」时间轴里已有更完整的
// 版本 (可跳转对应那次跑步、带成绩与后续 PB 刷新链)。首页再铺一遍等于
// 同一件事讲两遍，且首页版本更弱。改讲"还差多少"后两处形成时态分工。
//
// 左主右次：主角是下一个累计里程档 (唯一大号数字)，右侧是各距离档离
// 整十分钟目标的差距 —— 后者按差距升序，"触手可及"的排最前。

interface Props {
  activities: Activity[];
}

// 秒 → 差距文案。60 秒内说秒 (更有紧迫感)，超过则说分。
const formatGap = (seconds: number): string => {
  // 1 分内报到秒 —— 差几十秒时秒数本身就是动力
  if (seconds < 60) return `${seconds} 秒`;
  // 2 分内保留秒，让"1 分 30 秒"这类仍可感知
  if (seconds < 120) {
    const s = seconds % 60;
    return s === 0 ? '1 分' : `1 分 ${s} 秒`;
  }
  // 更远的目标只报分:差 361 秒时说"6 分"，而非"6 分 1 秒"的伪精确
  return `${Math.round(seconds / 60)} 分`;
};

const NextGoalsPanel = ({ activities }: Props) => {
  const { distance, count, pbs } = nextGoals(activities);

  // 全都没有可推进的目标 (数据太少或全部达成) 时不渲染整块
  if (!distance && !count && pbs.length === 0) return null;

  return (
    // 卡壳与英雄区 / 最近跑步同一套 (card 底 + line 描边 + radius-card)。
    // 无壳时内容直接压在 paper 上，与页面底色贴太近、可读性差。
    // 两栏之间用 border 分隔而非留白 —— 和 LatestRunPanel 的分栏方式一致。
    <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] lg:grid-cols-[1.5fr_1fr]">
      {/* 主角：下一个累计里程档 */}
      {distance && (
        <div className="flex flex-col p-6 sm:p-7">
          <p className="eyebrow">下一个里程碑</p>
          <div className="mb-2 mt-3 flex items-baseline gap-2 leading-[0.9]">
            <span
              className="tnum text-[clamp(38px,5vw,52px)] font-extrabold tracking-tight"
              style={{
                color: 'light-dark(var(--color-heat-5), var(--color-accent))',
              }}
            >
              {distance.remainKm}
            </span>
            <span className="text-[15px] font-semibold text-[var(--color-ink-2)]">
              km 到 {distance.target}
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-ink-2)]">
            当前{' '}
            <b className="font-bold text-[var(--color-ink)]">
              {formatKm(distance.current)} km
            </b>
            {distance.weeksToGo !== null && (
              <>
                {' '}
                · 按近 8 周节奏 (周均 {distance.weeklyKm}km) 约{' '}
                {distance.weeksToGo} 周后达成
              </>
            )}
          </p>

          {/* 进度条按「占目标的百分比」读，两端标 0 与目标值 —— 与英雄区
              年度目标环同一口径，避免两处进度含义不一致 */}
          <div className="mt-4">
            <div
              className="h-[5px] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-line)]"
              role="progressbar"
              aria-valuenow={distance.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`距离 ${distance.target}km 的进度`}
            >
              <div
                className="h-full rounded-[var(--radius-pill)] bg-[var(--color-accent)]"
                style={{ width: `${distance.progressPct}%` }}
              />
            </div>
            <div className="tnum mt-[7px] flex justify-between font-mono text-[10px] text-[var(--color-ink-2)]">
              <span>0</span>
              <span>{distance.progressPct}%</span>
              <span>{distance.target}</span>
            </div>
          </div>
        </div>
      )}

      {/* 次要：触手可及的突破 */}
      {(pbs.length > 0 || count) && (
        // 右栏底色用 card-2 与左栏拉开层次，窄屏改为顶部描边分隔
        // (窄屏两栏纵向堆叠，左描边会变成悬空竖线)
        <div className="border-t border-[var(--color-line)] bg-[var(--color-card-2)] p-6 sm:p-7 lg:border-l lg:border-t-0">
          <p className="eyebrow">触手可及的突破</p>
          <div className="flex flex-col gap-px overflow-hidden rounded-lg bg-[var(--color-line-2)]">
            {pbs.map((pb) => (
              <div
                key={pb.key}
                className="flex items-baseline gap-2 bg-[var(--color-card)] px-3 py-2.5"
              >
                <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">
                  {pb.label}
                </span>
                {/* 只写目标，不重复当前 PB —— 各档 PB 用时在分析页有完整版本，
                    这里的视角是"还差多少"，写成绩就偏题了 */}
                <span className="tnum font-mono text-[10.5px] text-[var(--color-ink-2)]">
                  破 {formatClock(pb.targetSeconds)}
                </span>
                <span className="tnum ml-auto font-mono text-[11px] font-bold text-[var(--color-ink)]">
                  −{formatGap(pb.gapSeconds)}
                </span>
              </div>
            ))}
            {count && (
              <div className="flex items-baseline gap-2 bg-[var(--color-card)] px-3 py-2.5">
                <span className="text-[12.5px] font-semibold text-[var(--color-ink)]">
                  累计次数
                </span>
                <span className="tnum font-mono text-[10.5px] text-[var(--color-ink-2)]">
                  {count.current} → {count.target}
                </span>
                <span className="tnum ml-auto font-mono text-[11px] font-bold text-[var(--color-ink)]">
                  还差 {count.remain}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default NextGoalsPanel;
