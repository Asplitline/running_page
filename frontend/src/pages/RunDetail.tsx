import { useParams, Link } from 'react-router-dom';
import { getActivityById } from '@/data/activities';
import { toKm, paceFromSpeed, formatDuration, formatDateDots } from '@/lib/format';
import { SplitPaceChart } from '@/components/charts/SplitPaceChart';
import { SplitHrChart } from '@/components/charts/SplitHrChart';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { estimateHrMax } from '@/design/tokens';

// 站点 owner 参考年龄 (spec-design):29 → HRmax 191。无个人 max 时用估算。
const OWNER_AGE = 29;

// 单次跑步详情页 — S6 首个真实页面。森林绿意 + 真实数据。

const Kpi = ({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: 'pace' | 'hr' }) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4">
    <div className="font-mono text-[11px] tracking-wide text-[var(--color-ink-3)] uppercase">{label}</div>
    <div
      className="tnum mt-2 flex items-baseline gap-0.5 text-3xl font-bold tracking-tight"
      style={{
        color:
          tone === 'pace'
            ? 'var(--color-route)'
            : tone === 'hr'
              ? 'var(--color-accent)'
              : 'var(--color-ink)',
      }}
    >
      {value}
      {unit && <span className="text-xs font-normal text-[var(--color-ink-3)]">{unit}</span>}
    </div>
  </div>
);

const Card = ({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const activity = id ? getActivityById(Number(id)) : undefined;

  if (!activity) {
    return (
      <main className="w-full px-6 py-16 sm:px-10 lg:px-16">
        <p className="eyebrow">Not Found</p>
        <h1 className="text-2xl font-bold">未找到这次跑步</h1>
        <Link
          to="/"
          className="mt-4 inline-block text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          ← 返回
        </Link>
      </main>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="w-full px-6 py-12 sm:px-10 lg:px-16">
        <Link to="/" className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]">
          ← 返回
        </Link>

        <header className="mt-4">
          <p className="tnum font-mono text-xs tracking-wide text-[var(--color-ink-3)] uppercase">
            {formatDateDots(activity.start_date_local)}
          </p>
          <h1
            className="mt-2 text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {activity.name}
          </h1>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Distance" value={String(toKm(activity.distance))} unit="km" />
          <Kpi label="Time" value={formatDuration(activity.moving_time)} />
          <Kpi label="Avg Pace" value={paceFromSpeed(activity.average_speed)} unit="/km" tone="pace" />
          <Kpi
            label="Avg HR"
            value={activity.average_heartrate ? String(Math.round(activity.average_heartrate)) : '--'}
            unit="bpm"
            tone="hr"
          />
        </div>

        <Card eyebrow={`逐公里配速 · ${activity.split_paces?.length ?? 0} km`}>
          <SplitPaceChart splits={activity.split_paces ?? []} />
        </Card>

        <Card eyebrow="逐公里心率">
          <SplitHrChart
            splits={activity.split_heart_rates ?? []}
            hrMax={activity.max_heartrate ?? estimateHrMax(OWNER_AGE)}
          />
        </Card>

        {activity.cadence_trend && (
          <Card eyebrow="步频趋势">
            <div className="flex items-center gap-8">
              <div>
                <div className="font-mono text-[11px] text-[var(--color-ink-3)]">前半程</div>
                <div className="tnum text-2xl font-bold">{activity.cadence_trend.first_half}</div>
              </div>
              <div className="text-[var(--color-ink-3)]">→</div>
              <div>
                <div className="font-mono text-[11px] text-[var(--color-ink-3)]">后半程</div>
                <div className="tnum text-2xl font-bold">{activity.cadence_trend.second_half}</div>
              </div>
              <div className="ml-auto rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-3 py-1 font-mono text-xs text-[var(--color-ink-2)]">
                {activity.cadence_trend.direction}
              </div>
            </div>
          </Card>
        )}
      </main>
    </TooltipProvider>
  );
};

export default RunDetail;
