import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import activities from '@/static/activities.json';
import styles from './style.module.css';
import { M_TO_DIST, Activity } from '@/utils/utils';
import { IS_CHINESE } from '@/utils/const';
import { HOME_PAGE_TITLE } from '@/utils/const';
import {
  DAY_SECTION_TITLE,
  MONTH_SECTION_TITLE,
  SUMMARY_PAGE_TITLE,
  VIEW_LABELS,
  WEEK_SECTION_TITLE,
  YEAR_SECTION_TITLE,
} from './constants';
import { getActivitySeconds, getWeekKey, isRunningActivity } from './helpers';
import { PeriodSummary, RunActivity, ViewMode } from './types';
import ViewButton from './components/ViewButton';
import PeriodCard from './components/PeriodCard';
import DayActivityCard from './components/DayActivityCard';
import StickyHeader from '@/components/StickyHeader';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import SiteLogo from '@/components/SiteLogo';
import UnifiedTitle from '@/components/UnifiedTitle';

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

  return IS_CHINESE ? `${year}年各月` : `Months of ${year}`;
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
    () => runningActivities.slice(0, 12),
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
    });

    return Array.from(summaryMap.values()).slice(0, 8);
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

  const yearlySummaries = useMemo<PeriodSummary[]>(() => {
    const summaryMap = new Map<string, PeriodSummary>();

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
      }

      const summary = summaryMap.get(year)!;
      summary.count += 1;
      summary.totalDistance += activity.distanceValue;
      summary.totalTime += activity.totalSeconds;
      summary.maxDistance = Math.max(
        summary.maxDistance,
        activity.distanceValue
      );
      summary.chartValues[activity.parsedDate.getMonth()] +=
        activity.distanceValue;
    });

    return Array.from(summaryMap.values());
  }, [runningActivities]);

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
                scaleLabel={IS_CHINESE ? '周内分布' : 'Week Breakdown'}
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
            {yearlySummaries.map((summary) => (
              <PeriodCard
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
            <SiteLogo
              to="/"
              className={styles.logoLink}
              imageClassName={styles.logo}
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
            <>
              <Link
                to="/"
                className={styles.homeButton}
                aria-label={IS_CHINESE ? '回到首页' : 'Back to home'}
                title={IS_CHINESE ? '回到首页' : 'Back to home'}
              >
                <span className={styles.homeText}>{HOME_PAGE_TITLE}</span>
              </Link>
              <ThemeToggleButton
                className={styles.themeToggleButton}
                iconClassName={styles.themeToggleIcon}
              />
            </>
          }
        />

        {renderContent()}
      </div>
    </>
  );
};

export default ActivityList;
