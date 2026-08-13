import {
  dailyActivities,
  monthlyLog,
  yearlyLog,
  lifetimeLog,
} from './trainingLog';
import { personalRecords } from './analytics';
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

describe('dailyActivities', () => {
  it('倒序取最近 N 条，仅 Run', () => {
    const acts = [
      mk({ run_id: 1, start_date_local: '2024-01-01 08:00:00' }),
      mk({ run_id: 2, start_date_local: '2024-01-03 08:00:00' }),
      mk({ run_id: 3, start_date_local: '2024-01-02 08:00:00' }),
      mk({ run_id: 4, type: 'cycling', start_date_local: '2024-01-04 08:00:00' }),
    ];
    const result = dailyActivities(acts, 2);
    expect(result.map((a) => a.run_id)).toEqual([2, 3]);
  });
  it('limit 默认 20', () => {
    const acts = Array.from({ length: 25 }, (_, i) =>
      mk({
        run_id: i + 1,
        start_date_local: `2024-01-${String((i % 28) + 1).padStart(2, '0')} 08:00:00`,
      })
    );
    expect(dailyActivities(acts).length).toBe(20);
  });
  it('空数组 → 空', () => {
    expect(dailyActivities([])).toEqual([]);
  });
});

describe('monthlyLog', () => {
  it('按月分组，累加距离/时长，记录最长单次', () => {
    const acts = [
      mk({
        distance: 5000,
        moving_time: '0:25:00',
        start_date_local: '2024-03-05 08:00:00',
      }),
      mk({
        distance: 10000,
        moving_time: '0:50:00',
        start_date_local: '2024-03-15 08:00:00',
      }),
    ];
    const result = monthlyLog(acts, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      month: '2024-03',
      distanceKm: 15,
      maxDistanceKm: 10,
      totalSeconds: 4500,
    });
  });
  it('dailyChartValues 覆盖当月所有天数，未跑的天为 0', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2024-02-10 08:00:00' }),
    ];
    const result = monthlyLog(acts, 1);
    expect(result[0].dailyChartValues).toHaveLength(29); // 2024 是闰年
    const day10 = result[0].dailyChartValues.find((d) => d.day === 10);
    expect(day10?.km).toBe(5);
    const day1 = result[0].dailyChartValues.find((d) => d.day === 1);
    expect(day1?.km).toBe(0);
  });
  it('只取最新 N 个月，按时间升序排列', () => {
    const acts = [
      mk({ distance: 1000, start_date_local: '2024-01-01 08:00:00' }),
      mk({ distance: 1000, start_date_local: '2024-02-01 08:00:00' }),
      mk({ distance: 1000, start_date_local: '2024-03-01 08:00:00' }),
    ];
    const result = monthlyLog(acts, 2);
    expect(result.map((m) => m.month)).toEqual(['2024-02', '2024-03']);
  });
  it('空数组 → 空', () => {
    expect(monthlyLog([])).toEqual([]);
  });
});

describe('yearlyLog', () => {
  it('按年分组，monthlyChartValues 覆盖 12 个月', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2024-03-01 08:00:00' }),
      mk({ distance: 8000, start_date_local: '2024-06-01 08:00:00' }),
    ];
    const result = yearlyLog(acts);
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2024);
    expect(result[0].distanceKm).toBe(13);
    expect(result[0].monthlyChartValues).toHaveLength(12);
    expect(result[0].monthlyChartValues.find((m) => m.month === 3)?.km).toBe(5);
  });
  it('年度 PB 与 personalRecords(该年子集) 结果一致', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 5000,
        moving_time: '0:22:00',
        start_date_local: '2024-05-01 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 5000,
        moving_time: '0:20:00',
        start_date_local: '2025-05-01 08:00:00',
      }),
    ];
    const result = yearlyLog(acts);
    const y2024 = result.find((y) => y.year === 2024)!;
    const expected = personalRecords(acts.filter((a) => a.start_date_local.startsWith('2024')));
    expect(y2024.personalRecords).toEqual(expected);
    // 2024 年最好成绩应是本年内 22 分钟那条，而非跨年最快的 2025 年 20 分钟
    expect(y2024.personalRecords.find((p) => p.key === '5k')?.seconds).toBe(1320);
  });
  it('空数组 → 空', () => {
    expect(yearlyLog([])).toEqual([]);
  });
});

describe('lifetimeLog', () => {
  it('累计里程/次数/历年趋势', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2024-01-01 08:00:00' }),
      mk({ distance: 8000, start_date_local: '2025-01-01 08:00:00' }),
    ];
    const result = lifetimeLog(acts);
    expect(result.totalKm).toBe(13);
    expect(result.totalRuns).toBe(2);
    expect(result.yearlyTrend).toEqual([
      { year: 2024, km: 5 },
      { year: 2025, km: 8 },
    ]);
  });
  it('里程碑文案：未达 500km 为 null', () => {
    const acts = [mk({ distance: 100000 })]; // 100km
    expect(lifetimeLog(acts).milestoneText).toBeNull();
  });
  it('里程碑文案：跨过阈值取最大已达成值', () => {
    const acts = [mk({ distance: 600000 })]; // 600km，跨过 500 未到 1000
    expect(lifetimeLog(acts).milestoneText).toBe('已累计跑过 500km');
  });
  it('空数组 → 全 0，milestoneText 为 null', () => {
    const result = lifetimeLog([]);
    expect(result.totalKm).toBe(0);
    expect(result.totalRuns).toBe(0);
    expect(result.milestoneText).toBeNull();
  });
});
