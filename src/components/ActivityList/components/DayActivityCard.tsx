import { DIST_UNIT } from '@/utils/utils';
import {
  getHeartRateZone,
  getRunIntensityLabelFromAvgHr,
  getRunIntensityTooltipFromAvgHr,
  IS_CHINESE,
} from '@/utils/const';
import {
  formatDateLong,
  formatPaceCompact,
  formatSplitPace,
  formatTimeShort,
} from '../helpers';
import { RunActivity } from '../types';
import styles from '../style.module.css';

interface DayActivityCardProps {
  activity: RunActivity;
  currentPage: number;
  onPageChange: (runId: number, nextPage: number) => void;
}

const SPLIT_PAGE_SIZE = 5;

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

const getZoneBadgeClass = (zone: ReturnType<typeof getHeartRateZone>) => {
  if (zone === 'z1') return styles.runZoneBadgeZ1;
  if (zone === 'z2') return styles.runZoneBadgeZ2;
  if (zone === 'z3') return styles.runZoneBadgeZ3;
  if (zone === 'z4') return styles.runZoneBadgeZ4;
  return styles.runZoneBadgeZ5;
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
  const intensity = getRunIntensityLabelFromAvgHr(activity.average_heartrate);
  const intensityTooltip = getRunIntensityTooltipFromAvgHr(
    activity.average_heartrate
  );
  const totalSplitCount = allSplitRows.length;
  const totalPages = Math.max(1, Math.ceil(totalSplitCount / SPLIT_PAGE_SIZE));
  const splitRows = allSplitRows.slice(
    currentPage * SPLIT_PAGE_SIZE,
    currentPage * SPLIT_PAGE_SIZE + SPLIT_PAGE_SIZE
  );

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
          {intensity && intensityTooltip ? (
            <span className={styles.runZoneTooltipWrap}>
              <span
                className={`${styles.runZoneBadge} ${getZoneBadgeClass(intensity.zone)}`}
                tabIndex={0}
                role="note"
                aria-label={intensityTooltip}
              >
                {intensity.label}
              </span>
              <span className={styles.runZoneTooltip} aria-hidden="true">
                {intensityTooltip}
              </span>
            </span>
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
      {splitRows.length > 0 ? (
        <div className={styles.splitBlock}>
          <div className={styles.splitHeader}>
            <span>{IS_CHINESE ? '公里' : 'KM'}</span>
            <span>{IS_CHINESE ? '配速' : 'Pace'}</span>
            <span>{IS_CHINESE ? '心率' : 'HR'}</span>
          </div>
          <div className={styles.splitList}>
            {splitRows.map((split) => (
              <div key={split.km} className={styles.splitRow}>
                <span className={styles.splitKm}>{split.km}K</span>
                <span className={styles.splitValue}>
                  {formatSplitPace(split.pace)}
                </span>
                <span
                  className={`${styles.splitValue} ${getHeartRateToneClass(split.heartRate)}`}
                >
                  {split.heartRate ? `${split.heartRate} bpm` : '--'}
                </span>
              </div>
            ))}
          </div>
          {totalPages > 1 ? (
            <div className={styles.splitPagination}>
              <button
                type="button"
                className={styles.splitPageButton}
                onClick={() =>
                  onPageChange(activity.run_id, Math.max(0, currentPage - 1))
                }
                disabled={currentPage === 0}
                aria-label={IS_CHINESE ? '上一页分段' : 'Previous split page'}
              >
                ←
              </button>
              <span className={styles.splitPageStatus}>
                {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.splitPageButton}
                onClick={() =>
                  onPageChange(
                    activity.run_id,
                    Math.min(totalPages - 1, currentPage + 1)
                  )
                }
                disabled={currentPage >= totalPages - 1}
                aria-label={IS_CHINESE ? '下一页分段' : 'Next split page'}
              >
                →
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export default DayActivityCard;
