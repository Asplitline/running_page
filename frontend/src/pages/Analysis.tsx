import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { activities } from '@/data/activities';
import {
  personalRecords,
  efficiencyByMonth,
  paceHrScatter,
} from '@/lib/analytics';
import { acwr } from '@/lib/stats';
import {
  dailyActivities,
  monthlyLog,
  yearlyLog,
  lifetimeLog,
} from '@/lib/trainingLog';
import { formatClock, formatDateDots, formatPace, toKm } from '@/lib/format';
import { EfficiencyTrend } from '@/components/charts/EfficiencyTrend';
import { PaceHrScatter } from '@/components/charts/PaceHrScatter';
import { DayLogCard } from '@/components/dashboard/trainingLog/DayLogCard';
import { MonthLogPanel } from '@/components/dashboard/trainingLog/MonthLogPanel';
import { YearLogPanel } from '@/components/dashboard/trainingLog/YearLogPanel';
import { TotalLogPanel } from '@/components/dashboard/trainingLog/TotalLogPanel';
import TimelinePanel from '@/components/dashboard/timeline/TimelinePanel';
import { Tabs } from '@/components/ui/Tabs';
import { TooltipProvider } from '@/components/ui/Tooltip';

// 分析页 — 训练档案 (日/月/年/总多视图) + 里程碑时间轴 + 深度分析 (PB/效率趋势/散点/ACWR)。

// ACWR 区间判读：<0.8 负荷不足，0.8~1.3 理想，1.3~1.5 偏高，>1.5 风险升高
const acwrTone = (value: number): { label: string; color: string } => {
  if (value < 0.8) return { label: '负荷不足', color: 'var(--color-ink-3)' };
  if (value <= 1.3) return { label: '理想区间', color: 'var(--color-route)' };
  if (value <= 1.5) return { label: '负荷偏高', color: 'var(--color-accent)' };
  return { label: '受伤风险升高', color: 'var(--color-accent)' };
};

// 页头指标条 — 单项「大数 + 小标签」，把标题行的空白换成真实信息。
const HeaderMetric = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <div className="flex items-baseline gap-1.5">
    <span
      className="tnum text-lg font-bold leading-none tracking-tight"
      style={color ? { color } : undefined}
    >
      {value}
    </span>
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
      {label}
    </span>
  </div>
);

const Card = ({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const TRAINING_LOG_TABS = [
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'total', label: '总' },
];

const TrainingLog = () => {
  const [logView, setLogView] = useState('day');
  const days = dailyActivities(activities);
  const months = monthlyLog(activities);
  const years = yearlyLog(activities);
  const lifetime = lifetimeLog(activities);

  return (
    <Tabs
      items={TRAINING_LOG_TABS}
      value={logView}
      onValueChange={setLogView}
      ariaLabel="训练档案视图切换"
      variant="underline"
    >
      <Tabs.Panel value="day">
        {days.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-3)]">暂无跑步记录</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((a) => (
              <DayLogCard key={a.run_id} activity={a} />
            ))}
          </div>
        )}
      </Tabs.Panel>
      <Tabs.Panel value="month">
        <MonthLogPanel months={months} />
      </Tabs.Panel>
      <Tabs.Panel value="year">
        <YearLogPanel years={years} lifetime={lifetime} />
      </Tabs.Panel>
      <Tabs.Panel value="total">
        <TotalLogPanel lifetime={lifetime} />
      </Tabs.Panel>
    </Tabs>
  );
};

const DeepAnalysis = () => {
  const pbs = personalRecords(activities);
  const effPoints = efficiencyByMonth(activities);
  const scatterPoints = paceHrScatter(activities);
  const acwrValue = acwr(activities);

  return (
    <>
      <Card eyebrow="最佳成绩 · Personal Records">
        {pbs.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-3)]">
            暂无符合距离档的记录
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pbs.map((pb) => (
              <Link
                key={pb.key}
                to={`/runs/${pb.activity.run_id}`}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  {pb.label}
                </div>
                <div className="tnum mt-2 text-2xl font-bold tracking-tight">
                  {formatClock(pb.seconds)}
                </div>
                <div className="tnum mt-1 font-mono text-[11px] text-[var(--color-ink-3)]">
                  {toKm(pb.activity.distance)}km ·{' '}
                  {formatDateDots(pb.activity.start_date_local)}
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
          这里取「单次跑步的总距离」落在距离档 ±3%
          以内的最好成绩，所以没跑过的距离档不会出现。训练档案里的 PB
          是另一套口径：从分段里找最快的连续 N 公里，两者不可直接比较。
        </p>
      </Card>

      <Card eyebrow="有氧效率趋势 · 上行 = 进步">
        <EfficiencyTrend points={effPoints} />
        <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
          效率 = 速度 ÷ 心率 × 100。同心率下跑得更快，曲线上行。
        </p>
      </Card>

      <Card eyebrow="配速 · 心率散点">
        <PaceHrScatter points={scatterPoints} />
        <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
          越靠右 = 配速越快，越靠上 = 心率越高。点越大代表单次距离越长。
        </p>
      </Card>

      {acwrValue != null && (
        <Card eyebrow="训练负荷 · ACWR">
          <div className="flex items-baseline gap-3">
            <span
              className="tnum text-4xl font-bold tracking-tight"
              style={{ color: acwrTone(acwrValue).color }}
            >
              {acwrValue.toFixed(2)}
            </span>
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-3 py-1 font-mono text-xs text-[var(--color-ink-2)]">
              {acwrTone(acwrValue).label}
            </span>
          </div>
          <p className="mt-3 font-mono text-[11px] text-[var(--color-ink-3)]">
            急慢性负荷比 = 近 1 周跑量 ÷ 近 4 周周均跑量。理想区间 0.8~1.3，超过
            1.5 提示受伤风险升高。
          </p>
        </Card>
      )}
    </>
  );
};

const SECTION_TABS = [
  { value: 'log', label: '训练档案' },
  { value: 'timeline', label: '里程碑' },
  { value: 'deep', label: '深度分析' },
];

const Analysis = () => {
  const [section, setSection] = useState('log');

  const lifetime = lifetimeLog(activities);
  const acwrValue = acwr(activities);

  return (
    <TooltipProvider delayDuration={100}>
      <main className="w-full px-6 py-8 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          ← 首页
        </Link>

        <Tabs
          items={SECTION_TABS}
          value={section}
          onValueChange={setSection}
          ariaLabel="分析页分区切换"
          className="mt-3"
          listRowClassName="flex flex-wrap items-end justify-between gap-x-8 gap-y-3"
          leading={
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <h1
                className="text-3xl font-extrabold tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                训练分析
              </h1>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <HeaderMetric label="RUNS" value={String(lifetime.count)} />
                <HeaderMetric
                  label="KM"
                  value={lifetime.distanceKm.toFixed(0)}
                />
                <HeaderMetric
                  label="AVG"
                  value={formatPace(lifetime.avgPaceSec)}
                />
                {acwrValue !== null && (
                  <HeaderMetric
                    label="ACWR"
                    value={acwrValue.toFixed(2)}
                    color={
                      acwrValue > 1.3 || acwrValue < 0.8
                        ? 'var(--color-accent)'
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          }
        >
          <Tabs.Panel value="log">
            <TrainingLog />
          </Tabs.Panel>
          <Tabs.Panel value="timeline">
            <TimelinePanel activities={activities} />
          </Tabs.Panel>
          <Tabs.Panel value="deep">
            <DeepAnalysis />
          </Tabs.Panel>
        </Tabs>
      </main>
    </TooltipProvider>
  );
};

export default Analysis;
