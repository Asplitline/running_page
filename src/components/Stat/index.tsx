import { intComma } from '@/utils/utils';
import styles from './style.module.css';

interface IStatProperties {
  value: string | number;
  description?: string;
  className?: string;
  citySize?: number;
  onClick?: () => void;
  emphasis?: 'primary' | 'secondary' | 'meta';
}

const Stat = ({
  value,
  description,
  className,
  citySize,
  onClick,
  emphasis = 'secondary',
}: IStatProperties) => {
  const valueClass = citySize === 3 ? styles.valueCity : styles.valueDefault;
  const emphasisClass =
    emphasis === 'primary'
      ? styles.valuePrimary
      : emphasis === 'meta'
        ? styles.valueMeta
        : styles.valueSecondary;

  return (
    <div
      className={[styles.stat, className].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={`${styles.value} ${valueClass} ${emphasisClass}`}>
        {intComma(value.toString())}
      </span>
      {description ? <span className={styles.desc}>{description}</span> : null}
    </div>
  );
};

export default Stat;
