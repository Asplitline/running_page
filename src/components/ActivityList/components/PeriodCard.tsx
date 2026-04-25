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

interface PeriodCardProps {
  summary: PeriodSummary;
  scaleLabel: string;
  tooltipLabelFormatter?: (value: string | number) => string;
}

const PeriodCard = ({
  summary,
  scaleLabel,
  tooltipLabelFormatter,
}: PeriodCardProps) => {
  const chartData = summary.chartValues.map((distance, index) => ({
    label: index + 1,
    distance: Number(distance.toFixed(2)),
  }));

  const maxDistance = Math.max(...summary.chartValues, 0);
  const yAxisMax = Math.max(5, Math.ceil(maxDistance / 5) * 5);

  return (
    <article className={styles.periodCard}>
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
            {summary.totalDistance.toFixed(1)} {DIST_UNIT}
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
              tick={{ fill: 'var(--ui-text-secondary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--ui-text-secondary)', fontSize: 11 }}
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
              cursor={{ fill: 'var(--ui-highlight-soft)' }}
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
