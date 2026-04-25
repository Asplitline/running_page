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
import HeartRateZoneTag from './HeartRateZoneTag';

interface PeriodCardProps {
  summary: PeriodSummary;
  scaleLabel: string;
  periodType?: 'week' | 'month';
  tooltipLabelFormatter?: (value: string | number) => string;
  className?: string;
}

const PeriodCard = ({
  summary,
  scaleLabel,
  periodType = 'month',
  tooltipLabelFormatter,
  className,
}: PeriodCardProps) => {
  const chartData = summary.chartValues.map((distance, index) => ({
    label: summary.chartLabels?.[index] ?? index + 1,
    distance: Number(distance.toFixed(2)),
  }));

  const maxDistance = Math.max(...summary.chartValues, 0);
  const yAxisMax = Math.max(5, Math.ceil(maxDistance / 5) * 5);
  const isWeek = periodType === 'week';

  return (
    <article className={`${styles.periodCard} ${className ?? ''}`}>
      <div className={styles.periodCardHeader}>
        <div>
          <p className={styles.periodKicker}>{scaleLabel}</p>
          <h3 className={styles.periodTitle}>{summary.label}</h3>
        </div>
        <p className={styles.periodCount}>
          {summary.count} {IS_CHINESE ? '次跑步' : 'runs'}
        </p>
      </div>

      <div className={styles.periodStats}>
        <div>
          <span>{ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</span>
          <strong>
            {summary.totalDistance.toFixed(2)} {DIST_UNIT}
          </strong>
        </div>
        <div>
          <span>
            {isWeek
              ? IS_CHINESE
                ? '跑步天数'
                : 'Run Days'
              : ACTIVITY_TOTAL.AVERAGE_SPEED_TITLE}
          </span>
          <strong>
            {isWeek
              ? summary.activeDays ?? 0
              : summary.totalDistance > 0
                ? formatPaceSeconds(
                    Math.round(summary.totalTime / summary.totalDistance)
                  )
                : `0:00 min/${DIST_UNIT}`}
          </strong>
        </div>
        <div>
          <span>
            {isWeek
              ? IS_CHINESE
                ? '最长长跑'
                : 'Longest Run'
              : ACTIVITY_TOTAL.MAX_DISTANCE_TITLE}
          </span>
          <strong>
            {summary.maxDistance.toFixed(1)} {DIST_UNIT}
          </strong>
        </div>
        <div>
          <span>
            {isWeek
              ? IS_CHINESE
                ? '周总时长'
                : 'Weekly Time'
              : ACTIVITY_TOTAL.TOTAL_TIME_TITLE}
          </span>
          <strong>{formatTime(summary.totalTime)}</strong>
        </div>
      </div>

      {isWeek ? (
        <div className={styles.periodIntensityStats}>
          <HeartRateZoneTag zone="z1" count={summary.z1Runs ?? 0} compact />
          <HeartRateZoneTag zone="z2" count={summary.z2Runs ?? 0} compact />
          <HeartRateZoneTag zone="z3" count={summary.z3Runs ?? 0} compact />
          <HeartRateZoneTag zone="z4" count={summary.z4Runs ?? 0} compact />
          <HeartRateZoneTag zone="z5" count={summary.z5Runs ?? 0} compact />
        </div>
      ) : null}

      <div className={styles.periodChart}>
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

export default PeriodCard;
