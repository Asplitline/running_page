import { IS_CHINESE } from '@/utils/const';
import { ViewMode } from './types';

export const SUMMARY_PAGE_TITLE = IS_CHINESE ? '概览' : 'Training Archive';
export const DAY_SECTION_TITLE = IS_CHINESE ? '日视图' : 'By Day';
export const WEEK_SECTION_TITLE = IS_CHINESE ? '周视图' : 'By Week';
export const MONTH_SECTION_TITLE = IS_CHINESE ? '月视图' : 'Monthly Comparison';
export const YEAR_SECTION_TITLE = IS_CHINESE ? '年度回顾' : 'Yearly Review';

export const VIEW_LABELS: Record<ViewMode, { label: string; note: string }> = {
  day: {
    label: IS_CHINESE ? '日' : 'Day',
    note: IS_CHINESE ? '单次记录' : 'Daily runs',
  },
  week: {
    label: IS_CHINESE ? '周' : 'Week',
    note: IS_CHINESE ? '周度节奏' : 'Weekly rhythm',
  },
  month: {
    label: IS_CHINESE ? '月' : 'Month',
    note: IS_CHINESE ? '月视图' : 'Monthly view',
  },
  year: {
    label: IS_CHINESE ? '年' : 'Year',
    note: IS_CHINESE ? '年度回顾' : 'Yearly view',
  },
};
