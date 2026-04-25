import NavBrand from '@/components/NavBrand';
import StickyHeader from '@/components/StickyHeader';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import activities from '@/static/activities.json';
import { getHeartRateZone, IS_CHINESE } from '@/utils/const';
import { Activity, M_TO_DIST } from '@/utils/utils';
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import DayActivityCard from './components/DayActivityCard';
import PeriodCard from './components/PeriodCard';
import ViewButton from './components/ViewButton';
import YearPeriodCard from './components/YearPeriodCard';
import LifetimePeriodCard from './components/LifetimePeriodCard';
import { SUMMARY_PAGE_TITLE, VIEW_LABELS } from './constants';
import { getActivitySeconds, getWeekKey, isRunningActivity } from './helpers';
import styles from './style.module.css';
import {
  PeriodPersonalBest,
  PeriodSummary,
  RunActivity,
  ViewMode,
} from './types';

const YEARLY_PB_SPECS: Array<{
  key: PeriodPersonalBest['key'];
  label: string;
  distance: number;
}> = [
  { key: '1k', label: '1km', distance: 1 },
  { key: '5k', label: '5km', distance: 5 },
  { key: '10k', label: '10km', distance: 10 },
  { key: 'half', label: IS_CHINESE ? '半马' : 'Half', distance: 21.0975 },
  { key: 'full', label: IS_CHINESE ? '全马' : 'Full', distance: 42.195 },
];

const getFastestSplitWindow = (
  splitPaces: RunActivity['split_paces'],
  windowSize: number
) => {
  if (!splitPaces || splitPaces.length < windowSize) {
    return null;
  }

  const sortedPaces = [...splitPaces]
    .sort((a, b) => a.km - b.km)
    .map((split) => split.pace_seconds);

  if (sortedPaces.some((pace) => typeof pace !== 'number')) {
    return null;
  }

  let bestWindow: number | null = null;

  for (
    let startIndex = 0;
    startIndex <= sortedPaces.length - windowSize;
    startIndex += 1
  ) {
    const windowTotal = sortedPaces
      .slice(startIndex, startIndex + windowSize)
      .reduce((total, pace) => total + pace, 0);

    if (bestWindow === null || windowTotal < bestWindow) {
      bestWindow = windowTotal;
    }
  }

  return bestWindow;
};

const getIsMatchingRaceDistance = (
  distanceValue: number,
  targetDistance: number
) => {
  const lowerBound = targetDistance * 0.985;
  const upperBound = targetDistance * 1.05;
  return distanceValue >= lowerBound && distanceValue <= upperBound;
};

type PersonalBestEntry = {
  seconds: number | null;
  achievedAt: string | null;
};

type PersonalBestRecord = Record<PeriodPersonalBest['key'], PersonalBestEntry>;

const createYearlyPbRecord = (): PersonalBestRecord => ({
  '1k': { seconds: null, achievedAt: null },
  '5k': { seconds: null, achievedAt: null },
  '10k': { seconds: null, achievedAt: null },
  half: { seconds: null, achievedAt: null },
  full: { seconds: null, achievedAt: null },
});

const updatePersonalBest = (
  record: PersonalBestRecord,
  key: PeriodPersonalBest['key'],
  nextSeconds: number,
  achievedAt: string
) => {
  const current = record[key];
  if (current.seconds === null || nextSeconds < current.seconds) {
    record[key] = {
      seconds: nextSeconds,
      achievedAt,
    };
  }
};

const applyActivityToYearlyPbs = (
  activity: RunActivity,
  yearlyPbs: PersonalBestRecord
) => {
  const achievedAt = activity.parsedDate.toISOString();
  const fastestSingleKm = getFastestSplitWindow(activity.split_paces, 1);
  if (fastestSingleKm !== null) {
    updatePersonalBest(yearlyPbs, '1k', fastestSingleKm, achievedAt);
  }

  const fastestFiveKm = getFastestSplitWindow(activity.split_paces, 5);
  if (fastestFiveKm !== null) {
    updatePersonalBest(yearlyPbs, '5k', fastestFiveKm, achievedAt);
  }

  const fastestTenKm = getFastestSplitWindow(activity.split_paces, 10);
  if (fastestTenKm !== null) {
    updatePersonalBest(yearlyPbs, '10k', fastestTenKm, achievedAt);
  }

  if (getIsMatchingRaceDistance(activity.distanceValue, 21.0975)) {
    updatePersonalBest(yearlyPbs, 'half', activity.totalSeconds, achievedAt);
  }

  if (getIsMatchingRaceDistance(activity.distanceValue, 42.195)) {
    updatePersonalBest(yearlyPbs, 'full', activity.totalSeconds, achievedAt);
  }
};

const getPersonalBestsFromRecord = (
  yearlyPbs: PersonalBestRecord,
  compareRecord?: PersonalBestRecord
) =>
  YEARLY_PB_SPECS.map((spec) => ({
    key: spec.key,
    label: spec.label,
    seconds: yearlyPbs[spec.key].seconds,
    achievedAt: yearlyPbs[spec.key].achievedAt,
    isLifetimeBest:
      yearlyPbs[spec.key].seconds !== null &&
      compareRecord?.[spec.key].seconds !== null &&
      yearlyPbs[spec.key].seconds === compareRecord?.[spec.key].seconds,
  }));

const getMonthlyScaleLabel = (key: string) => {
  const [year, month] = key.split('-');
  const monthNumber = Number(month);

  if (!year || Number.isNaN(monthNumber)) {
    return IS_CHINESE ? '月度拆解' : 'Monthly Breakdown';
  }

  if (IS_CHINESE) {
    return `${year}年${monthNumber}月`;
  }

  const date = new Date(Number(year), monthNumber - 1, 1);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(date);
};

const getYearlyScaleLabel = (year: string) => {
  if (!year) {
    return IS_CHINESE ? '月份分布' : 'Monthly Spread';
  }

  return IS_CHINESE ? `${year}年` : `Months of ${year}`;
};

const getMonthlyTooltipLabel = (key: string, value: string | number) => {
  const [, month] = key.split('-');
  const day = typeof value === 'number' ? value : Number(value);
  const monthNumber = Number(month);

  if (Number.isNaN(monthNumber) || Number.isNaN(day)) {
    return `${key}-${String(value)}`;
  }

  return IS_CHINESE ? `${monthNumber}月${day}日` : `${monthNumber}/${day}`;
};

const getYearlyTooltipLabel = (year: string, value: string | number) => {
  const month = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(month)) {
    return String(value);
  }
  return IS_CHINESE
    ? `${year}年${month}月`
    : `${year}-${String(month).padStart(2, '0')}`;
};

const getAllTimeTooltipLabel = (value: string | number) => {
  return String(value);
};

const getISOWeekMonday = (weekKey: string) => {
  const [yearPart, weekPart] = weekKey.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null;
  }

  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getWeeklyTooltipLabel = (weekKey: string, value: string | number) => {
  const dayOrder = typeof value === 'number' ? value : Number(value);
  const monday = getISOWeekMonday(weekKey);

  if (!monday || Number.isNaN(dayOrder)) {
    return `${weekKey}-${String(value)}`;
  }

  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (dayOrder - 1));

  if (IS_CHINESE) {
    return `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;
  }

  return `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
};

const getWeeklyScaleLabel = (weekKey: string) => {
  const monday = getISOWeekMonday(weekKey);

  if (!monday) {
    return IS_CHINESE ? '周内分布' : 'Week Breakdown';
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  if (IS_CHINESE) {
    return `${monday.getMonth() + 1}月${monday.getDate()}日 - ${sunday.getMonth() + 1}月${sunday.getDate()}日`;
  }

  return `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`;
};

const ActivityList: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [splitPages, setSplitPages] = useState<Record<number, number>>({});

  const runningActivities = useMemo<RunActivity[]>(
    () =>
      (activities as Activity[])
        .filter(isRunningActivity)
        .map((activity) => {
          const parsedDate = new Date(activity.start_date_local);
          return {
            ...activity,
            parsedDate,
            totalSeconds: getActivitySeconds(activity.moving_time),
            distanceValue: activity.distance / M_TO_DIST,
          };
        })
        .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()),
    []
  );

  const dailyActivities = useMemo(
    () => runningActivities.slice(0, 20),
    [runningActivities]
  );

  const weeklySummaries = useMemo<PeriodSummary[]>(() => {
    const summaryMap = new Map<string, PeriodSummary>();

    runningActivities.forEach((activity) => {
      const key = getWeekKey(activity.parsedDate);

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          key,
          label: key,
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          maxDistance: 0,
          activeDays: 0,
          z1Runs: 0,
          z2Runs: 0,
          z3Runs: 0,
          z4Runs: 0,
          z5Runs: 0,
          chartValues: Array.from({ length: 7 }, () => 0),
        });
      }

      const summary = summaryMap.get(key)!;
      summary.count += 1;
      summary.totalDistance += activity.distanceValue;
      summary.totalTime += activity.totalSeconds;
      summary.maxDistance = Math.max(
        summary.maxDistance,
        activity.distanceValue
      );
      const dayIndex = (activity.parsedDate.getDay() + 6) % 7;
      summary.chartValues[dayIndex] += activity.distanceValue;

      if (activity.average_heartrate) {
        const zone = getHeartRateZone(activity.average_heartrate);
        if (zone === 'z1') summary.z1Runs = (summary.z1Runs ?? 0) + 1;
        if (zone === 'z2') summary.z2Runs = (summary.z2Runs ?? 0) + 1;
        if (zone === 'z3') summary.z3Runs = (summary.z3Runs ?? 0) + 1;
        if (zone === 'z4') summary.z4Runs = (summary.z4Runs ?? 0) + 1;
        if (zone === 'z5') summary.z5Runs = (summary.z5Runs ?? 0) + 1;
      }
    });

    return Array.from(summaryMap.values())
      .map((summary) => ({
        ...summary,
        activeDays: summary.chartValues.filter((distance) => distance > 0)
          .length,
      }))
      .slice(0, 8);
  }, [runningActivities]);

  const monthlySummaries = useMemo<PeriodSummary[]>(() => {
    const summaryMap = new Map<string, PeriodSummary>();

    runningActivities.forEach((activity) => {
      const year = activity.parsedDate.getFullYear();
      const month = activity.parsedDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!summaryMap.has(key)) {
        const daysInMonth = new Date(year, month, 0).getDate();
        summaryMap.set(key, {
          key,
          label: key,
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          maxDistance: 0,
          chartValues: Array.from({ length: daysInMonth }, () => 0),
        });
      }

      const summary = summaryMap.get(key)!;
      summary.count += 1;
      summary.totalDistance += activity.distanceValue;
      summary.totalTime += activity.totalSeconds;
      summary.maxDistance = Math.max(
        summary.maxDistance,
        activity.distanceValue
      );
      summary.chartValues[activity.parsedDate.getDate() - 1] +=
        activity.distanceValue;
    });

    return Array.from(summaryMap.values()).slice(0, 6);
  }, [runningActivities]);

  const allTimePersonalBestRecord = useMemo(() => {
    const allTimePbs = createYearlyPbRecord();

    runningActivities.forEach((activity) => {
      applyActivityToYearlyPbs(activity, allTimePbs);
    });

    return allTimePbs;
  }, [runningActivities]);

  const yearlySummaries = useMemo<PeriodSummary[]>(() => {
    const summaryMap = new Map<string, PeriodSummary>();
    const yearlyPbMap = new Map<string, PersonalBestRecord>();

    runningActivities.forEach((activity) => {
      const year = activity.parsedDate.getFullYear().toString();

      if (!summaryMap.has(year)) {
        summaryMap.set(year, {
          key: year,
          label: year,
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          maxDistance: 0,
          chartValues: Array.from({ length: 12 }, () => 0),
        });

        yearlyPbMap.set(year, createYearlyPbRecord());
      }

      const summary = summaryMap.get(year)!;
      const yearlyPbs = yearlyPbMap.get(year)!;
      summary.count += 1;
      summary.totalDistance += activity.distanceValue;
      summary.totalTime += activity.totalSeconds;
      summary.maxDistance = Math.max(
        summary.maxDistance,
        activity.distanceValue
      );
      summary.chartValues[activity.parsedDate.getMonth()] +=
        activity.distanceValue;
      applyActivityToYearlyPbs(activity, yearlyPbs);
    });

    return Array.from(summaryMap.values()).map((summary) => {
      const personalBests = yearlyPbMap.get(summary.key);

      return {
        ...summary,
        personalBests: personalBests
          ? getPersonalBestsFromRecord(personalBests, allTimePersonalBestRecord)
          : undefined,
      };
    });
  }, [allTimePersonalBestRecord, runningActivities]);

  const currentYearSummary = yearlySummaries[0];

  const cumulativeYearSummary = useMemo<PeriodSummary | null>(() => {
    if (!runningActivities.length) {
      return null;
    }

    const allTimePbs = createYearlyPbRecord();
    const yearlyTrend = [...yearlySummaries].reverse().map((summary) => ({
      year: summary.key,
      totalDistance: summary.totalDistance,
    }));

    const summary = runningActivities.reduce<PeriodSummary>(
      (acc, activity) => {
        acc.count += 1;
        acc.totalDistance += activity.distanceValue;
        acc.totalTime += activity.totalSeconds;
        acc.maxDistance = Math.max(acc.maxDistance, activity.distanceValue);
        applyActivityToYearlyPbs(activity, allTimePbs);
        return acc;
      },
      {
        key: 'all-time',
        label: IS_CHINESE ? '累计' : 'All-time',
        count: 0,
        totalDistance: 0,
        totalTime: 0,
        maxDistance: 0,
        chartLabels: yearlyTrend.map((item) => item.year),
        chartValues: yearlyTrend.map((item) => item.totalDistance),
      }
    );

    return {
      ...summary,
      personalBests: getPersonalBestsFromRecord(allTimePbs),
    };
  }, [runningActivities, yearlySummaries]);

  const renderContent = () => {
    if (!runningActivities.length) {
      return (
        <section className={styles.emptyState}>
          <p className={styles.sectionEyebrow}>
            {IS_CHINESE ? '暂无记录' : 'No Runs Yet'}
          </p>
          <h2>
            {IS_CHINESE ? '这里还没有跑步档案。' : 'No running archive yet.'}
          </h2>
          <p>
            {IS_CHINESE
              ? '等第一批跑步记录同步后，这里会优先展示最近状态，再展开更长周期。'
              : 'Once activity sync finishes, this page will surface recent form first.'}
          </p>
        </section>
      );
    }

    if (viewMode === 'day') {
      return (
        <section className={styles.section}>
          {/* <UnifiedTitle as="h2" variant="section">
            {DAY_SECTION_TITLE}
          </UnifiedTitle> */}

          <div className={`${styles.recentGrid} ${styles.dayGrid}`}>
            {dailyActivities.map((activity) => (
              <DayActivityCard
                key={activity.run_id}
                activity={activity}
                currentPage={splitPages[activity.run_id] ?? 0}
                onPageChange={(runId, nextPage) =>
                  setSplitPages((pages) => ({
                    ...pages,
                    [runId]: nextPage,
                  }))
                }
              />
            ))}
          </div>
        </section>
      );
    }

    if (viewMode === 'week') {
      return (
        <section className={styles.section}>
          {/* <UnifiedTitle as="h2" variant="section">
            {WEEK_SECTION_TITLE}
          </UnifiedTitle> */}

          <div className={`${styles.periodGrid} ${styles.weekGrid}`}>
            {weeklySummaries.map((summary) => (
              <PeriodCard
                key={summary.key}
                summary={summary}
                scaleLabel={getWeeklyScaleLabel(summary.key)}
                periodType="week"
                tooltipLabelFormatter={(value) =>
                  getWeeklyTooltipLabel(summary.key, value)
                }
              />
            ))}
          </div>
        </section>
      );
    }

    if (viewMode === 'month') {
      return (
        <section className={styles.section}>
          {/* <UnifiedTitle as="h2" variant="section">
            {MONTH_SECTION_TITLE}
          </UnifiedTitle> */}

          <div className={`${styles.periodGrid} ${styles.monthGrid}`}>
            {monthlySummaries.map((summary) => (
              <PeriodCard
                key={summary.key}
                summary={summary}
                scaleLabel={getMonthlyScaleLabel(summary.key)}
                periodType="month"
                tooltipLabelFormatter={(value) =>
                  getMonthlyTooltipLabel(summary.key, value)
                }
              />
            ))}
          </div>
        </section>
      );
    }

    if (viewMode === 'year') {
      return (
        <section className={styles.section}>
          {/* <UnifiedTitle as="h2" variant="section">
            {YEAR_SECTION_TITLE}
          </UnifiedTitle> */}

          <div className={`${styles.periodGrid} ${styles.yearGrid}`}>
            {currentYearSummary ? (
              <YearPeriodCard
                key={`current-${currentYearSummary.key}`}
                summary={currentYearSummary}
                scaleLabel={IS_CHINESE ? '今年数据' : 'This Year'}
                className={styles.yearPrimaryCard}
                tooltipLabelFormatter={(value) =>
                  getYearlyTooltipLabel(currentYearSummary.key, value)
                }
              />
            ) : null}
            {cumulativeYearSummary ? (
              <LifetimePeriodCard
                key={cumulativeYearSummary.key}
                summary={cumulativeYearSummary}
                scaleLabel={IS_CHINESE ? '累计数据' : 'All-time'}
                className={styles.yearCumulativeCard}
                tooltipLabelFormatter={getAllTimeTooltipLabel}
              />
            ) : null}
            {yearlySummaries.slice(1).map((summary) => (
              <YearPeriodCard
                key={summary.key}
                summary={summary}
                scaleLabel={getYearlyScaleLabel(summary.key)}
                tooltipLabelFormatter={(value) =>
                  getYearlyTooltipLabel(summary.key, value)
                }
              />
            ))}
          </div>
        </section>
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>{SUMMARY_PAGE_TITLE}</title>
      </Helmet>

      <div className={styles.activityList}>
        <StickyHeader
          className={styles.overviewSticky}
          compactClassName={styles.overviewStickyCompact}
          innerClassName={styles.overviewStickyInner}
          titleClassName={styles.archiveTitle}
          secondaryClassName={styles.viewSwitcher}
          actionsClassName={styles.archiveActions}
          title={
            <NavBrand
              to="/"
              className={styles.archiveTitleContent}
              logoClassName={styles.summaryLogo}
              titleClassName={styles.summaryBrandTitle}
              titleAs="h1"
            />
          }
          secondary={
            <nav
              className="flex gap-0.5"
              aria-label={IS_CHINESE ? '概览视图' : 'Training archive views'}
            >
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                <ViewButton
                  key={mode}
                  isActive={viewMode === mode}
                  label={VIEW_LABELS[mode].label}
                  onClick={() => setViewMode(mode)}
                />
              ))}
            </nav>
          }
          actions={
            <ThemeToggleButton
              className={styles.themeToggleButton}
              iconClassName={styles.themeToggleIcon}
            />
          }
        />

        {renderContent()}
      </div>
    </>
  );
};

export default ActivityList;
