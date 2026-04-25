import { DIST_UNIT, M_TO_DIST, Activity } from '@/utils/utils';
import { IS_CHINESE } from '@/utils/const';

export const formatTime = (seconds: number) => {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

export const formatTimeShort = (seconds: number) => {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatPaceSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/${DIST_UNIT}`;
};

export const formatPaceCompact = (speed: number) => {
  if (!speed) return `0:00/${DIST_UNIT}`;

  const totalSeconds = Math.round(M_TO_DIST / speed);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${DIST_UNIT}`;
};

export const formatDateLong = (date: Date) =>
  new Intl.DateTimeFormat(IS_CHINESE ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export const formatSplitPace = (paceSeconds: number) =>
  `${formatTimeShort(paceSeconds)}/${DIST_UNIT}`;

export const getActivitySeconds = (time: string) => {
  const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
  return (
    Number(hours) * 3600 + Number(minutes) * 60 + Math.round(Number(seconds))
  );
};

export const isRunningActivity = (activity: Activity) =>
  activity.type === 'Run' || activity.type === 'running';

export const getWeekKey = (date: Date) => {
  const currentDate = new Date(date.valueOf());
  currentDate.setHours(0, 0, 0, 0);
  currentDate.setDate(currentDate.getDate() + 4 - (currentDate.getDay() || 7));
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((currentDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${currentDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};
