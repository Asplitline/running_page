import useActivities from '@/hooks/useActivities';
import { formatPace } from '@/utils/utils';
import { IS_CHINESE, SHOW_ELEVATION_GAIN } from '@/utils/const';
import { DIST_UNIT, M_TO_DIST, M_TO_ELEV } from '@/utils/utils';
import styles from './style.module.css';

const YearStat = ({
  year,
  onClick,
  isActive,
}: {
  year: string;
  onClick: (_year: string) => void;
  isActive?: boolean;
}) => {
  let { activities: runs, years } = useActivities();

  if (years.includes(year)) {
    runs = runs.filter((run) => run.start_date_local.slice(0, 4) === year);
  }

  let sumDistance = 0;
  let streak = 0;
  let sumElevationGain = 0;
  let heartRate = 0;
  let heartRateNullCount = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;

  runs.forEach((run) => {
    sumDistance += run.distance || 0;
    sumElevationGain += run.elevation_gain || 0;

    if (run.average_speed) {
      totalMetersAvail += run.distance || 0;
      totalSecondsAvail += (run.distance || 0) / run.average_speed;
    }

    if (run.average_heartrate) {
      heartRate += run.average_heartrate;
    } else {
      heartRateNullCount++;
    }

    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
  });

  sumDistance = parseFloat((sumDistance / M_TO_DIST).toFixed(1));
  const sumElevationGainStr = (sumElevationGain * M_TO_ELEV).toFixed(0);
  const avgPaceStr =
    totalSecondsAvail > 0
      ? formatPace(totalMetersAvail / totalSecondsAvail)
      : null;
  const hasHeartRate = heartRate > 0;
  const avgHeartRate =
    runs.length - heartRateNullCount > 0
      ? (heartRate / (runs.length - heartRateNullCount)).toFixed(0)
      : null;

  const yearHeadValue = IS_CHINESE && year === 'Total' ? '合计' : year;
  const titleText = IS_CHINESE
    ? year === 'Total'
      ? '总跑步总览'
      : `${yearHeadValue} 年跑步总览`
    : year === 'Total'
      ? 'All-time running overview'
      : `${yearHeadValue} running overview`;
  const runsText = `${runs.length} runs`;
  const distanceUnit = DIST_UNIT;
  const paceLabel = IS_CHINESE ? '平均配速' : 'avg pace';
  const heartLabel = IS_CHINESE ? '平均心率' : 'avg HR';
  const streakLabel = IS_CHINESE ? '连续跑步' : 'streak';
  const paceText = avgPaceStr != null ? `${avgPaceStr}/${DIST_UNIT}` : '—';
  const heartText = hasHeartRate && avgHeartRate ? `${avgHeartRate} bpm` : '—';
  const streakText = `${streak} days`;
  const elevLabel = IS_CHINESE ? '总爬升' : 'elevation';
  const elevText =
    SHOW_ELEVATION_GAIN && sumElevationGainStr
      ? `${sumElevationGainStr} m`
      : null;

  return (
    <div
      className={`${styles.block} ${isActive ? styles.blockActive : ''}`}
      onClick={() => onClick(year)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(year);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <section className={styles.stats}>
        <div className={styles.topLine}>
          <p className={styles.titleText}>{titleText}</p>
          <p className={styles.runsText}>{runsText}</p>
        </div>
        <div className={styles.mainMetric}>
          <span className={styles.mainValue}>{sumDistance}</span>
          <span className={styles.mainUnit}>{distanceUnit}</span>
        </div>
        <div className={styles.subMetrics}>
          <div className={styles.subItem}>
            <span className={styles.subLabel}>{paceLabel}</span>
            <span className={styles.subValue}>{paceText}</span>
          </div>
          <div className={styles.subItem}>
            <span className={styles.subLabel}>{heartLabel}</span>
            <span className={styles.subValue}>{heartText}</span>
          </div>
          <div className={styles.subItem}>
            <span className={styles.subLabel}>{streakLabel}</span>
            <span className={styles.subValue}>{streakText}</span>
          </div>
          {SHOW_ELEVATION_GAIN && elevText ? (
            <div className={styles.subItem}>
              <span className={styles.subLabel}>{elevLabel}</span>
              <span className={styles.subValue}>{elevText}</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default YearStat;
