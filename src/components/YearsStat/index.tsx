import { useMemo } from 'react';
import YearStat from '@/components/YearStat';
import useActivities from '@/hooks/useActivities';
import { INFO_MESSAGE } from '@/utils/const';
import styles from './style.module.css';

const YearsStat = ({
  year,
  onClick,
}: {
  year: string;
  onClick: (_year: string) => void;
}) => {
  const { years } = useActivities();

  const yearsArrayUpdate = useMemo(() => {
    return [...years, 'Total'];
  }, [years]);

  const infoMessage = useMemo(() => {
    return INFO_MESSAGE(years.length, year);
  }, [years.length, year]);

  return (
    <div className={styles.root}>
      <section className={styles.intro}>
        <p className={styles.introText}>{infoMessage}</p>
      </section>
      <div className={styles.divider} role="presentation" />
      <div className={styles.yearList}>
        {yearsArrayUpdate.map((yearItem) => (
          <YearStat
            key={yearItem}
            year={yearItem}
            onClick={onClick}
            isActive={yearItem === year}
          />
        ))}
      </div>
    </div>
  );
};

export default YearsStat;
