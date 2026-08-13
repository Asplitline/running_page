import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import {
  toKm,
  paceFromSpeed,
  formatDuration,
  formatDateDots,
} from '@/lib/format';
import { SplitPaceChart } from '@/components/charts/SplitPaceChart';
import { hrZoneOf, estimateHrMax } from '@/design/tokens';

// 日视图卡片 — 对齐老前端 ActivityList 日视图的六项指标：
// 配速/用时/最快配速/平均心率/峰值心率/步频，附逐公里分段图。

const OWNER_AGE = 29; // 参考 RunDetail.tsx 的站点 owner 年龄约定

interface Props {
  activity: Activity;
}

const fastestPaceSeconds = (activity: Activity): number | null => {
  if (!activity.split_paces?.length) return null;
  return Math.min(...activity.split_paces.map((s) => s.pace_seconds));
};

const Metric = ({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) => (
  <div>
    <div className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
      {label}
    </div>
    <div
      className="tnum mt-1 text-lg font-bold tracking-tight"
      style={tone ? { color: tone } : undefined}
    >
      {value}
      {unit && (
        <span className="ml-0.5 text-xs font-normal text-[var(--color-ink-3)]">
          {unit}
        </span>
      )}
    </div>
  </div>
);

export const DayLogCard = ({ activity }: Props) => {
  const fastest = fastestPaceSeconds(activity);
  const hrZone = activity.average_heartrate
    ? hrZoneOf(activity.average_heartrate, estimateHrMax(OWNER_AGE))
    : null;

  return (
    <Link
      to={`/runs/${activity.run_id}`}
      className="block rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-5 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">
            {formatDateDots(activity.start_date_local)}
          </p>
          <h3 className="mt-0.5 text-base font-semibold">{activity.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {hrZone && (
            <span
              className="rounded-[var(--radius-pill)] px-2 py-0.5 font-mono text-[10px] text-white"
              style={{ background: hrZone.color }}
            >
              {hrZone.label}
            </span>
          )}
          <span className="tnum text-xl font-bold">
            {toKm(activity.distance)}
            <span className="ml-0.5 text-xs font-normal text-[var(--color-ink-3)]">
              km
            </span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
        <Metric
          label="配速"
          value={paceFromSpeed(activity.average_speed)}
          unit="/km"
        />
        <Metric label="用时" value={formatDuration(activity.moving_time)} />
        <Metric
          label="最快配速"
          value={fastest != null ? `${Math.floor(fastest / 60)}:${String(Math.round(fastest % 60)).padStart(2, '0')}` : '--'}
          unit="/km"
        />
        <Metric
          label="平均心率"
          value={
            activity.average_heartrate
              ? String(Math.round(activity.average_heartrate))
              : '--'
          }
          unit="bpm"
          tone={hrZone?.color}
        />
        <Metric
          label="峰值心率"
          value={
            activity.max_heartrate ? String(Math.round(activity.max_heartrate)) : '--'
          }
          unit="bpm"
        />
        <Metric
          label="步频"
          value={
            activity.average_cadence ? String(Math.round(activity.average_cadence)) : '--'
          }
          unit="spm"
        />
      </div>

      {activity.split_paces && activity.split_paces.length > 0 && (
        <div className="mt-4">
          <SplitPaceChart splits={activity.split_paces} />
        </div>
      )}
    </Link>
  );
};
