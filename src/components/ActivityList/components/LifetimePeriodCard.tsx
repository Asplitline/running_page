import {
  Bar,
  BarChart,
  Cell,
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

interface LifetimePeriodCardProps {
  summary: PeriodSummary;
  scaleLabel: string;
  tooltipLabelFormatter?: (value: string | number) => string;
  className?: string;
}

const LIFETIME_CHART_ID = 'lifetime-distance-gradient';

const getLifetimeMilestoneText = (
  totalDistance: number,
  peakYearLabel: string | null
) => {
  const LIFETIME_MILESTONE_DISTANCE = 2000;
  const roundedDistance = Math.floor(totalDistance);
  const milestoneText =
    roundedDistance >= LIFETIME_MILESTONE_DISTANCE
      ? IS_CHINESE
        ? `已突破 ${LIFETIME_MILESTONE_DISTANCE} km 里程碑`
        : `Past ${LIFETIME_MILESTONE_DISTANCE} km milestone`
      : IS_CHINESE
        ? `累计 ${roundedDistance} km，继续冲刺`
        : `${roundedDistance} km total and climbing`;

  const peakYearText = peakYearLabel
    ? IS_CHINESE
      ? `${peakYearLabel} 是你的跑量峰值年`
      : `${peakYearLabel} is your peak mileage year`
    : IS_CHINESE
      ? '继续积累你的年度峰值'
      : 'Keep building toward your next peak year';

  return {
    milestoneText,
    peakYearText,
  };
};

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

const getPersonalBestTagLabel = (isLifetimeBest?: boolean) => {
  if (isLifetimeBest) {
    return 'PB';
  }
  return 'PB';
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

const LifetimePeriodCard = ({
  summary,
  scaleLabel,
  tooltipLabelFormatter,
  className,
}: LifetimePeriodCardProps) => {
  const chartData = summary.chartValues.map((distance, index) => ({
    label: summary.chartLabels?.[index] ?? index + 1,
    distance: Number(distance.toFixed(2)),
  }));

  const maxDistance = Math.max(...summary.chartValues, 0);
  const yAxisMax = Math.max(5, Math.ceil(maxDistance / 5) * 5);
  const peakDistance = Math.max(...summary.chartValues, 0);
  const peakYearIndex = summary.chartValues.findIndex(
    (distance) => distance === peakDistance
  );
  const peakYearLabel =
    peakYearIndex >= 0
      ? String(
          summary.chartLabels?.[peakYearIndex] ??
            chartData[peakYearIndex]?.label ??
            ''
        )
      : null;
  const lifetimeMilestone = getLifetimeMilestoneText(
    summary.totalDistance,
    peakYearLabel
  );

  return (
    <article
      className={`${styles.periodCard} ${styles.periodCardLifetime} ${className ?? ''}`}
    >
      <div className={styles.periodCardHeader}>
        <div>
          <p className={styles.periodKicker}>{scaleLabel}</p>
          <h3 className={`${styles.periodTitle} ${styles.periodTitleLifetime}`}>
            <span className={styles.periodLifetimeTrophy}>🏆</span>
            {summary.label}
          </h3>
        </div>
        <p className={styles.periodCount}>
          {summary.count} {IS_CHINESE ? '次跑步' : 'runs'}
        </p>
      </div>

      <section className={styles.lifetimeHero}>
        <p className={styles.lifetimeHeroLabel}>
          {IS_CHINESE ? '累计总里程' : 'Total Distance'}
        </p>
        <h4 className={styles.lifetimeHeroNumber}>
          {summary.totalDistance.toFixed(2)} <small>{DIST_UNIT}</small>
        </h4>
        <div className={styles.lifetimeHeroNote}>
          ✨ {lifetimeMilestone.milestoneText}
        </div>
      </section>

      <div className={`${styles.periodStats} ${styles.periodStatsLifetime}`}>
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
          className={`${styles.periodPersonalBests} ${styles.periodPersonalBestsLifetime}`}
        >
          {summary.personalBests.map((pb) => (
            <div
              key={pb.key}
              className={`${styles.periodPersonalBestCard} ${
                pb.isLifetimeBest ? styles.periodPersonalBestCardLifetime : ''
              } ${styles.periodPersonalBestCardInLifetime} ${
                pb.isLifetimeBest
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
                  className={`${styles.periodPersonalBestTag} ${styles.total}`}
                >
                  {getPersonalBestTagLabel(pb.isLifetimeBest)}
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

      <div className={`${styles.periodChart} ${styles.periodChartLifetime}`}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={LIFETIME_CHART_ID}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(209, 250, 229, 0.22)"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: 'rgba(209, 250, 229, 0.74)',
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: 'rgba(209, 250, 229, 0.74)',
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
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(167, 243, 208, 0.24)',
                borderRadius: '16px',
                color: '#ecfeff',
              }}
              cursor={{
                fill: 'rgba(255, 255, 255, 0.07)',
              }}
            />
            <Bar
              dataKey="distance"
              radius={[10, 10, 0, 0]}
              fill={`url(#${LIFETIME_CHART_ID})`}
            >
              {chartData.map((entry) => (
                <Cell
                  key={String(entry.label)}
                  fill={
                    entry.distance === peakDistance
                      ? 'url(#lifetime-peak-gradient)'
                      : `url(#${LIFETIME_CHART_ID})`
                  }
                />
              ))}
            </Bar>
            <defs>
              <linearGradient
                id="lifetime-peak-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="52%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.lifetimeMilestone}>
        <div className={styles.lifetimeMilestoneIcon}>🔥</div>
        <div>
          <strong>{lifetimeMilestone.peakYearText}</strong>
          <span>
            {IS_CHINESE
              ? '累计卡用深色和高亮峰值柱，强化生涯成就感。'
              : 'Dark theme and highlighted peak year reinforce the career achievement tone.'}
          </span>
        </div>
      </div>
    </article>
  );
};

export default LifetimePeriodCard;
