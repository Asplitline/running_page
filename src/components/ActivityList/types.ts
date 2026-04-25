import { Activity } from '@/utils/utils';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export type RunActivity = Activity & {
  parsedDate: Date;
  totalSeconds: number;
  distanceValue: number;
};

export interface SplitRowData {
  km: number;
  pace: number;
  heartRate: number | null;
}

export interface PeriodPersonalBest {
  key: '1k' | '5k' | '10k' | 'half' | 'full';
  label: string;
  seconds: number | null;
  achievedAt?: string | null;
  isLifetimeBest?: boolean;
}

export interface PeriodSummary {
  key: string;
  label: string;
  count: number;
  totalDistance: number;
  totalTime: number;
  maxDistance: number;
  activeDays?: number;
  z1Runs?: number;
  z2Runs?: number;
  z3Runs?: number;
  z4Runs?: number;
  z5Runs?: number;
  averageHeartRate?: number;
  personalBests?: PeriodPersonalBest[];
  chartLabels?: Array<string | number>;
  chartValues: number[];
}
