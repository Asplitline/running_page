import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import styles from '../style.module.css';
import { DIST_UNIT } from '@/utils/utils';
import { ACTIVITY_TOTAL, IS_CHINESE } from '@/utils/const';
import { formatPaceSeconds, formatTime } from '../helpers';
import { PeriodSummary } from '../types';

interface YearPeriodCardProps {
  summary: PeriodSummary;
  scaleLabel: string;
  isLifetime?: boolean;
  tooltipLabelFormatter?: (value: string | number) => string;
  className?: string;
}

const formatPersonalBestTime = (seconds: number | null) => {
  if (seconds === null) {
    return '--';
  }

  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatPersonalBestDate = (dateString?: string | null) => {
  if (!dateString) {
    return IS_CHINESE ? '日期未知' : 'Date unknown';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return IS_CHINESE ? '日期未知' : 'Date unknown';
  }

  if (IS_CHINESE) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

const getPersonalBestTagLabel = (
  isLifetimeCard: boolean,
  isLifetimeBest?: boolean
) => {
  if (isLifetimeCard) {
    return 'PB';
  }

  if (isLifetimeBest) {
    return IS_CHINESE ? 'PB' : 'PB';
  }

  return IS_CHINESE ? '年度PB' : 'Year PB';
};

const PERSONAL_BEST_DISTANCE_KM: Record<string, number> = {
  '1k': 1,
  '5k': 5,
  '10k': 10,
  half: 21.0975,
  full: 42.195,
};

const formatPersonalBestPace = (pbKey: string, seconds: number | null) => {
  if (seconds === null) {
    return `-- min/${DIST_UNIT}`;
  }

  const distance = PERSONAL_BEST_DISTANCE_KM[pbKey];
  if (!distance) {
    return `-- min/${DIST_UNIT}`;
  }

  return formatPaceSeconds(Math.round(seconds / distance));
};

const YearPeriodCard = ({
  summary,
  scaleLabel,
  isLifetime = false,
  tooltipLabelFormatter,
  className,
}: YearPeriodCardProps) => {
  const chartData = summary.chartValues.map((distance, index) => ({
    label: summary.chartLabels?.[index] ?? index + 1,
    distance: Number(distance.toFixed(2)),
  }));

  const maxDistance = Math.max(...summary.chartValues, 0);
  const yAxisMax = Math.max(5, Math.ceil(maxDistance / 5) * 5);

  return (
    <article
      className={`${styles.periodCard} ${className ?? ''} ${
        isLifetime ? styles.periodCardLifetime : ''
      }`}
    >
      <div className={styles.periodCardHeader}>
        <div>
          <p className={styles.periodKicker}>{scaleLabel}</p>
          <h3
            className={`${styles.periodTitle} ${isLifetime ? styles.periodTitleLifetime : ''}`}
          >
            {isLifetime ? (
              <>
                <span className={styles.periodLifetimeTrophy}>🏆</span>
                {summary.label}
              </>
            ) : (
              summary.label
            )}
          </h3>
        </div>
        <p className={styles.periodCount}>
          {summary.count} {IS_CHINESE ? '次跑步' : 'runs'}
        </p>
      </div>

      <div
        className={`${styles.periodStats} ${isLifetime ? styles.periodStatsLifetime : ''}`}
      >
        <div>
          <span>{ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</span>
          <strong>
            {summary.totalDistance.toFixed(2)} {DIST_UNIT}
          </strong>
        </div>
        <div>
          <span>{ACTIVITY_TOTAL.AVERAGE_SPEED_TITLE}</span>
          <strong>
            {summary.totalDistance > 0
              ? formatPaceSeconds(
                  Math.round(summary.totalTime / summary.totalDistance)
                )
              : `0:00 min/${DIST_UNIT}`}
          </strong>
        </div>
        <div>
          <span>{ACTIVITY_TOTAL.MAX_DISTANCE_TITLE}</span>
          <strong>
            {summary.maxDistance.toFixed(1)} {DIST_UNIT}
          </strong>
        </div>
        <div>
          <span>{ACTIVITY_TOTAL.TOTAL_TIME_TITLE}</span>
          <strong>{formatTime(summary.totalTime)}</strong>
        </div>
      </div>

      {summary.personalBests?.length ? (
        <div
          className={`${styles.periodPersonalBests} ${
            isLifetime ? styles.periodPersonalBestsLifetime : ''
          }`}
        >
          {summary.personalBests.map((pb) => (
            <div
              key={pb.key}
              className={`${styles.periodPersonalBestCard} ${
                pb.isLifetimeBest ? styles.periodPersonalBestCardLifetime : ''
              } ${isLifetime ? styles.periodPersonalBestCardInLifetime : ''} ${
                pb.isLifetimeBest && isLifetime
                  ? styles.periodPersonalBestCardLifetimeFeatured
                  : ''
              }`}
            >
              <span className={styles.periodPersonalBestLabel}>{pb.label}</span>
              <strong className={styles.periodPersonalBestValue}>
                {formatPersonalBestTime(pb.seconds)}
              </strong>
              <div className={styles.periodPersonalBestTagWrap}>
                <span
                  className={`${styles.periodPersonalBestTag} ${
                    !isLifetime && !pb.isLifetimeBest
                      ? styles.periodPersonalBestTagYear
                      : ''
                  }`}
                >
                  {getPersonalBestTagLabel(isLifetime, pb.isLifetimeBest)}
                </span>
                <span className={styles.periodPersonalBestTooltip}>
                  {IS_CHINESE ? '日期：' : 'Date: '}
                  {formatPersonalBestDate(pb.achievedAt)}
                  <br />
                  {IS_CHINESE ? '配速：' : 'Pace: '}
                  {formatPersonalBestPace(pb.key, pb.seconds)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={`${styles.periodChart} ${isLifetime ? styles.periodChartLifetime : ''}`}
      >
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--ui-border-soft)"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: 'var(--ui-text-secondary)',
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: 'var(--ui-text-secondary)',
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              domain={[0, yAxisMax]}
              ticks={[0, yAxisMax / 2, yAxisMax]}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value} ${DIST_UNIT}`,
                IS_CHINESE ? '距离' : 'Distance',
              ]}
              labelFormatter={(value) =>
                tooltipLabelFormatter
                  ? tooltipLabelFormatter(value)
                  : `${scaleLabel} ${typeof value === 'number' ? value : String(value)}`
              }
              contentStyle={{
                backgroundColor: 'var(--ui-surface)',
                border: '1px solid var(--ui-border)',
                borderRadius: '16px',
                color: 'var(--ui-text)',
              }}
              cursor={{
                fill: 'var(--ui-highlight-soft)',
              }}
            />
            <Bar
              dataKey="distance"
              radius={[10, 10, 0, 0]}
              fill="var(--ui-accent-primary)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export default YearPeriodCard;
