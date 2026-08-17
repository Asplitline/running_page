import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import {
  toKm,
  paceFromSpeed,
  formatDuration,
  formatDateDots,
  formatPace,
} from '@/lib/format';
import { SplitTable } from '@/components/charts/SplitTable';
import { Tooltip } from '@/components/ui/Tooltip';
import { hrZoneOf, estimateHrMax, type HrZone } from '@/design/tokens';

// 日视图卡片 — 对齐老前端 ActivityList 日视图的六项指标：
// 配速/用时/最快配速/平均心率/峰值心率/步频，附逐公里分段表格(表格+分页，对齐老前端)。

const OWNER_AGE = 29; // 参考 RunDetail.tsx 的站点 owner 年龄约定

interface Props {
  activity: Activity;
}

const fastestPaceSeconds = (activity: Activity): number | null => {
  if (!activity.split_paces?.length) return null;
  return Math.min(...activity.split_paces.map((s) => s.pace_seconds));
};

// 心率强度标签的判读依据文案，对齐老前端 getRunIntensityTooltipFromAvgHr。
const zoneTooltipText = (
  avgHr: number,
  hrMax: number,
  zone: HrZone
): string => {
  const pct = Math.round((avgHr / hrMax) * 100);
  const rangeText = `${Math.round(zone.pctMin * 100)}%~${
    zone.pctMax >= 1 ? '' : Math.round(zone.pctMax * 100) + '%'
  } HRmax`;
  return `标签依据：本次平均心率\n估算 HRmax：220 − 年龄（约 ${hrMax} bpm）\n本次平均：${Math.round(avgHr)} bpm（约 ${pct}% HRmax）\n结果：${zone.label}（${rangeText}）`;
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
  const hrMax = estimateHrMax(OWNER_AGE);
  const avgHrZone = activity.average_heartrate
    ? hrZoneOf(activity.average_heartrate, hrMax)
    : null;
  const maxHrZone = activity.max_heartrate
    ? hrZoneOf(activity.max_heartrate, hrMax)
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
          {avgHrZone && activity.average_heartrate && (
            <Tooltip
              content={
                <span className="whitespace-pre-line font-mono text-[11px]">
                  {zoneTooltipText(activity.average_heartrate, hrMax, avgHrZone)}
                </span>
              }
            >
              <span
                className="rounded-[var(--radius-pill)] px-2 py-0.5 font-mono text-[10px] text-white"
                style={{ background: avgHrZone.color }}
              >
                {avgHrZone.label}
              </span>
            </Tooltip>
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
          value={fastest != null ? formatPace(fastest) : '--'}
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
          tone={avgHrZone?.color}
        />
        <Metric
          label="峰值心率"
          value={
            activity.max_heartrate
              ? String(Math.round(activity.max_heartrate))
              : '--'
          }
          unit="bpm"
          tone={maxHrZone?.color}
        />
        <Metric
          label="步频"
          value={
            activity.average_cadence
              ? String(Math.round(activity.average_cadence))
              : '--'
          }
          unit="spm"
        />
      </div>

      {activity.split_paces && activity.split_paces.length > 0 && (
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          <SplitTable
            splitPaces={activity.split_paces}
            splitHeartRates={activity.split_heart_rates}
            hrMax={hrMax}
          />
        </div>
      )}
    </Link>
  );
};
