import { overallStats } from './stats';
import type { Activity } from '@/data/types';

// 最小活动工厂 (对齐 analytics.test.ts 风格)
const mk = (over: Partial<Activity>): Activity =>
  ({
    run_id: 1,
    name: 'test',
    distance: 5000,
    moving_time: '0:25:00',
    type: 'Run',
    subtype: '',
    start_date: '2024-03-20 00:00:00',
    start_date_local: '2024-03-20 08:00:00',
    location_country: '',
    summary_polyline: null,
    average_heartrate: 150,
    max_heartrate: 165,
    average_speed: 3.3,
    average_cadence: 185,
    cadence_trend: null,
    split_paces: null,
    split_heart_rates: null,
    elevation_gain: 0,
    ...over,
  }) as Activity;

describe('overallStats', () => {
  it('距离/次数仅计 Run，排除骑行徒步', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000 }),
      mk({ type: 'Run', distance: 10000 }),
      mk({ type: 'cycling', distance: 30000 }),
      mk({ type: 'hiking', distance: 8000 }),
    ];
    const s = overallStats(acts, 2024);
    expect(s.totalRuns).toBe(2);
    expect(s.totalDistanceKm).toBe(15);
  });

  it('thisYearKm 只累计指定年的 Run', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000, start_date_local: '2024-06-01 08:00:00' }),
      mk({ type: 'Run', distance: 8000, start_date_local: '2025-06-01 08:00:00' }),
    ];
    const s = overallStats(acts, 2025);
    expect(s.thisYearKm).toBe(8);
  });

  it('longestRunKm 取最长单次 Run', () => {
    const acts = [
      mk({ type: 'Run', distance: 5000 }),
      mk({ type: 'Run', distance: 21097 }),
      mk({ type: 'cycling', distance: 50000 }),
    ];
    expect(overallStats(acts, 2024).longestRunKm).toBe(21.1);
  });

  it('空数组 → 全 0', () => {
    const s = overallStats([], 2024);
    expect(s).toEqual({ totalDistanceKm: 0, totalRuns: 0, thisYearKm: 0, longestRunKm: 0 });
  });
});
