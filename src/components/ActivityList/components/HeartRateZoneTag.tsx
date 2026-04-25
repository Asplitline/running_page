import {
  getHeartRateZoneSummaryTooltip,
  getHeartRateZoneTooltip,
  getRunIntensityLabelFromZone,
  HeartRateZone,
} from '@/utils/const';
import styles from '../style.module.css';

interface HeartRateZoneTagProps {
  zone: HeartRateZone;
  count?: number;
  compact?: boolean;
  tooltipText?: string;
}

const getZoneBadgeClass = (zone: HeartRateZone) => {
  if (zone === 'z1') return styles.runZoneBadgeZ1;
  if (zone === 'z2') return styles.runZoneBadgeZ2;
  if (zone === 'z3') return styles.runZoneBadgeZ3;
  if (zone === 'z4') return styles.runZoneBadgeZ4;
  return styles.runZoneBadgeZ5;
};

const HeartRateZoneTag = ({
  zone,
  count,
  compact = false,
  tooltipText,
}: HeartRateZoneTagProps) => {
  const intensity = getRunIntensityLabelFromZone(zone);
  const compactLabel = intensity.label.replace(/^Z\d+\s*/, '');
  const tooltip =
    tooltipText ??
    (typeof count === 'number'
      ? getHeartRateZoneSummaryTooltip(zone, count)
      : getHeartRateZoneTooltip(zone));

  return (
    <span
      className={`${styles.runZoneTooltipWrap} ${
        compact ? styles.runZoneTooltipWrapCompact : ''
      }`}
    >
      <span
        className={`${styles.runZoneBadge} ${getZoneBadgeClass(zone)} ${
          compact ? styles.runZoneBadgeCompact : ''
        }`}
        tabIndex={0}
        role="note"
        aria-label={tooltip}
      >
        {compact ? (
          <span className={styles.runZoneLabelMeta}>
            <span className={styles.runZoneLabelShort}>
              {zone.toUpperCase()}
            </span>
            <span className={styles.runZoneLabelFull}>{compactLabel}</span>
          </span>
        ) : (
          intensity.label
        )}
        {typeof count === 'number' ? (
          <strong
            className={`${styles.runZoneCount} ${
              count === 0 ? styles.runZoneCountMuted : ''
            }`}
          >
            {count}
          </strong>
        ) : null}
      </span>
      <span className={styles.runZoneTooltip} aria-hidden="true">
        {tooltip}
      </span>
    </span>
  );
};

export default HeartRateZoneTag;
