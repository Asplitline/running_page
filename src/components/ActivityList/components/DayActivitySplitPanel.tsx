import { DIST_UNIT } from '@/utils/utils';
import { getHeartRateZone, IS_CHINESE } from '@/utils/const';
import { formatSplitPace } from '../helpers';
import { SplitRowData } from '../types';
import styles from '../style.module.css';

interface DayActivitySplitPanelProps {
  runId: number;
  splitRows: SplitRowData[];
  currentPage: number;
  onPageChange: (runId: number, nextPage: number) => void;
}

const SPLIT_PAGE_SIZE = 5;

const getHeartRateToneClass = (heartRate?: number | null) => {
  if (!heartRate) return '';
  const zone = getHeartRateZone(heartRate);
  if (zone === 'z1') return styles.heartValueZ1;
  if (zone === 'z2') return styles.heartValueZ2;
  if (zone === 'z3') return styles.heartValueZ3;
  if (zone === 'z4') return styles.heartValueZ4;
  return styles.heartValueZ5;
};

const DayActivitySplitPanel = ({
  runId,
  splitRows,
  currentPage,
  onPageChange,
}: DayActivitySplitPanelProps) => {
  if (!splitRows.length) {
    return null;
  }

  const fastestSplit = splitRows.reduce((best, split) =>
    split.pace < best.pace ? split : best
  );
  const peakHeartRateSplit = splitRows.reduce<SplitRowData | null>(
    (best, split) => {
      if (!split.heartRate) {
        return best;
      }
      if (!best?.heartRate || split.heartRate > best.heartRate) {
        return split;
      }
      return best;
    },
    null
  );
  const totalPages = Math.max(1, Math.ceil(splitRows.length / SPLIT_PAGE_SIZE));
  const pagedSplitRows = splitRows.slice(
    currentPage * SPLIT_PAGE_SIZE,
    currentPage * SPLIT_PAGE_SIZE + SPLIT_PAGE_SIZE
  );

  return (
    <div className={styles.splitBlock}>
      <div className={styles.splitHeader}>
        <span>{IS_CHINESE ? '公里' : 'KM'}</span>
        <span>{IS_CHINESE ? '配速' : 'Pace'}</span>
        <span>{IS_CHINESE ? '心率' : 'HR'}</span>
      </div>
      <div className={styles.splitList}>
        {pagedSplitRows.map((split) => {
          const isFastestPace =
            split.km === fastestSplit.km && split.pace === fastestSplit.pace;
          const isPeakHeartRate =
            peakHeartRateSplit?.km === split.km &&
            peakHeartRateSplit.heartRate === split.heartRate;

          return (
            <div key={split.km} className={styles.splitRow}>
              <span className={styles.splitKm}>{split.km}K</span>
              <span
                className={`${styles.splitValue} ${
                  isFastestPace ? styles.splitValueFast : ''
                }`}
                aria-label={
                  isFastestPace
                    ? IS_CHINESE
                      ? `最快配速，${formatSplitPace(split.pace)}`
                      : `Fastest pace, ${formatSplitPace(split.pace)}`
                    : undefined
                }
              >
                {formatSplitPace(split.pace)}
              </span>
              <span
                className={`${styles.splitValue} ${getHeartRateToneClass(
                  split.heartRate
                )} ${isPeakHeartRate ? styles.splitValuePeakHr : ''}`}
                aria-label={
                  isPeakHeartRate && split.heartRate
                    ? IS_CHINESE
                      ? `最高心率，${split.heartRate} bpm`
                      : `Peak heart rate, ${split.heartRate} bpm`
                    : undefined
                }
              >
                {split.heartRate ? `${split.heartRate} bpm` : '--'}
              </span>
            </div>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <div className={styles.splitPagination}>
          <button
            type="button"
            className={styles.splitPageButton}
            onClick={() => onPageChange(runId, Math.max(0, currentPage - 1))}
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
              onPageChange(runId, Math.min(totalPages - 1, currentPage + 1))
            }
            disabled={currentPage >= totalPages - 1}
            aria-label={IS_CHINESE ? '下一页分段' : 'Next split page'}
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default DayActivitySplitPanel;
