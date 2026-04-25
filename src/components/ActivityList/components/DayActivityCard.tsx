import { DIST_UNIT } from '@/utils/utils';
import {
  getHeartRateZone,
  getRunIntensityTooltipFromAvgHr,
  IS_CHINESE,
} from '@/utils/const';
import { formatDateLong, formatPaceCompact, formatTimeShort } from '../helpers';
import { RunActivity } from '../types';
import DayActivitySplitPanel from './DayActivitySplitPanel';
import HeartRateZoneTag from './HeartRateZoneTag';
import styles from '../style.module.css';

interface DayActivityCardProps {
  activity: RunActivity;
  currentPage: number;
  onPageChange: (runId: number, nextPage: number) => void;
}

function normalizeSplitArray<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const getHeartRateToneClass = (heartRate?: number | null) => {
  if (!heartRate) return '';
  const zone = getHeartRateZone(heartRate);
  if (zone === 'z1') return styles.heartValueZ1;
  if (zone === 'z2') return styles.heartValueZ2;
  if (zone === 'z3') return styles.heartValueZ3;
  if (zone === 'z4') return styles.heartValueZ4;
  return styles.heartValueZ5;
};

const DayActivityCard = ({
  activity,
  currentPage,
  onPageChange,
}: DayActivityCardProps) => {
  const splitHeartRates = normalizeSplitArray<{
    km: number;
    avg_hr: number | null;
  }>(activity.split_heart_rates);
  const splitPaces = normalizeSplitArray<{
    km: number;
    pace_seconds: number;
  }>(activity.split_paces);
  const allSplitRows = splitPaces.map((split) => {
    const km = Number(split.km);
    const hrRow = splitHeartRates.find((item) => Number(item.km) === km);
    return {
      km: split.km,
      pace: split.pace_seconds,
      heartRate: hrRow?.avg_hr ?? null,
    };
  });
  const intensityZone = activity.average_heartrate
    ? getHeartRateZone(activity.average_heartrate)
    : null;
  const intensityTooltip = getRunIntensityTooltipFromAvgHr(
    activity.average_heartrate
  );
  const fastestSplitPace =
    allSplitRows.length > 0
      ? Math.min(...allSplitRows.map((split) => split.pace))
      : null;

  return (
    <article className={`${styles.recentCard} ${styles.dayCard}`}>
      <div className={styles.recentCardHeader}>
        <div>
          <p className={styles.recentDate}>
            {formatDateLong(activity.parsedDate)}
          </p>
          <h3 className={styles.recentTitle}>
            {activity.name || (IS_CHINESE ? '跑步' : 'Run')}
          </h3>
          {intensityZone && intensityTooltip ? (
            <HeartRateZoneTag
              zone={intensityZone}
              tooltipText={intensityTooltip}
            />
          ) : null}
        </div>
        <span className={styles.recentDistance}>
          {activity.distanceValue.toFixed(2)} {DIST_UNIT}
        </span>
      </div>
      <dl className={styles.recentMeta}>
        <div>
          <dt>{IS_CHINESE ? '配速' : 'Pace'}</dt>
          <dd>{formatPaceCompact(activity.average_speed)}</dd>
        </div>
        <div>
          <dt>{IS_CHINESE ? '用时' : 'Time'}</dt>
          <dd>{formatTimeShort(activity.totalSeconds)}</dd>
        </div>
        <div>
          <dt>{IS_CHINESE ? '最快配速' : 'Best Pace'}</dt>
          <dd>
            {fastestSplitPace != null
              ? formatTimeShort(fastestSplitPace)
              : '--'}
            {fastestSplitPace != null ? `/${DIST_UNIT}` : ''}
          </dd>
        </div>
        <div>
          <dt>{IS_CHINESE ? '心率' : 'HR'}</dt>
          <dd>
            {activity.average_heartrate ? (
              <span
                className={getHeartRateToneClass(activity.average_heartrate)}
              >
                {activity.average_heartrate} bpm
              </span>
            ) : (
              '--'
            )}
          </dd>
        </div>
        <div>
          <dt>{IS_CHINESE ? '峰值心率' : 'Peak HR'}</dt>
          <dd>
            {activity.max_heartrate ? (
              <span className={getHeartRateToneClass(activity.max_heartrate)}>
                {activity.max_heartrate} bpm
              </span>
            ) : (
              '--'
            )}
          </dd>
        </div>
        <div>
          <dt>{IS_CHINESE ? '步频' : 'Cadence'}</dt>
          <dd>
            {activity.average_cadence
              ? `${activity.average_cadence} spm`
              : '--'}
          </dd>
        </div>
      </dl>
      <DayActivitySplitPanel
        runId={activity.run_id}
        splitRows={allSplitRows}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
    </article>
  );
};

export default DayActivityCard;
