import { Activity } from '@/utils/utils';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export type RunActivity = Activity & {
  parsedDate: Date;
  totalSeconds: number;
  distanceValue: number;
};

export interface PeriodSummary {
  key: string;
  label: string;
  count: number;
  totalDistance: number;
  totalTime: number;
  maxDistance: number;
  averageHeartRate?: number;
  chartValues: number[];
}
