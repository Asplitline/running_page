import {
  dailyActivities,
  monthlyLog,
  yearlyLog,
  lifetimeLog,
  fastestSplitWindow,
  matchingRaceDistance,
  trainingLogPersonalRecords,
} from './trainingLog';
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
  it('年度 PB 只统计该年内数据，不跨年比较', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 21097,
        moving_time: '1:50:00',
        start_date_local: '2024-05-01 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 21097,
        moving_time: '1:40:00',
        start_date_local: '2025-05-01 08:00:00',
      }),
    ];
    const result = yearlyLog(acts);
    const y2024 = result.find((y) => y.year === 2024)!;
    // 2024 年最好成绩应是本年内 1:50:00 那条，而非跨年最快的 2025 年 1:40:00
    expect(y2024.personalRecords.find((p) => p.key === 'half')?.seconds).toBe(
      6600
    );
  });
  it('空数组 → 空', () => {
    expect(yearlyLog([])).toEqual([]);
  });
});

describe('lifetimeLog', () => {
  it('累计里程/次数/历年趋势/峰值年份', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2024-01-01 08:00:00' }),
      mk({ distance: 8000, start_date_local: '2025-01-01 08:00:00' }),
    ];
    const result = lifetimeLog(acts);
    expect(result.distanceKm).toBe(13);
    expect(result.count).toBe(2);
    expect(result.yearlyTrend).toEqual([
      { year: 2024, km: 5 },
      { year: 2025, km: 8 },
    ]);
    expect(result.peakYear).toEqual({ year: 2025, km: 8 });
  });
  it('里程碑文案：未突破 2000km 时显示"继续冲刺"', () => {
    const acts = [mk({ distance: 600000 })]; // 600km
    expect(lifetimeLog(acts).milestoneText).toBe('累计 600 km，继续冲刺');
  });
  it('里程碑文案：突破 2000km 后显示"已突破里程碑"', () => {
    const acts = [mk({ distance: 2500000 })]; // 2500km
    expect(lifetimeLog(acts).milestoneText).toBe('已突破 2000 km 里程碑');
  });
  it('峰值年份文案：有历年数据时点名峰值年', () => {
    const acts = [mk({ distance: 5000, start_date_local: '2024-01-01 08:00:00' })];
    expect(lifetimeLog(acts).peakYearText).toBe('2024 是你的跑量峰值年');
  });
  it('峰值年份文案：无数据时显示默认文案', () => {
    expect(lifetimeLog([]).peakYearText).toBe('继续积累你的年度峰值');
  });
  it('空数组 → 全 0，peakYear 为 null', () => {
    const result = lifetimeLog([]);
    expect(result.distanceKm).toBe(0);
    expect(result.count).toBe(0);
    expect(result.peakYear).toBeNull();
  });
});

describe('fastestSplitWindow', () => {
  it('单窗口(windowSize=1)取任意一次跑步里最快单公里', () => {
    const acts = [
      mk({
        run_id: 1,
        split_paces: [
          { km: 1, pace_seconds: 300 },
          { km: 2, pace_seconds: 280 },
          { km: 3, pace_seconds: 320 },
        ],
      }),
    ];
    const result = fastestSplitWindow(acts, 1);
    expect(result?.seconds).toBe(280);
    expect(result?.activity.run_id).toBe(1);
  });
  it('多公里窗口(windowSize=2)取连续2公里配速总和最小的窗口', () => {
    const acts = [
      mk({
        split_paces: [
          { km: 1, pace_seconds: 300 },
          { km: 2, pace_seconds: 280 },
          { km: 3, pace_seconds: 290 },
        ],
      }),
    ];
    // 窗口1: km1+km2=580; 窗口2: km2+km3=570 → 更快
    expect(fastestSplitWindow(acts, 2)?.seconds).toBe(570);
  });
  it('跨多次活动取全局最快', () => {
    const acts = [
      mk({
        run_id: 1,
        split_paces: [{ km: 1, pace_seconds: 300 }],
      }),
      mk({
        run_id: 2,
        split_paces: [{ km: 1, pace_seconds: 250 }],
      }),
    ];
    const result = fastestSplitWindow(acts, 1);
    expect(result?.seconds).toBe(250);
    expect(result?.activity.run_id).toBe(2);
  });
  it('split_paces 长度不足窗口大小时跳过该活动', () => {
    const acts = [mk({ split_paces: [{ km: 1, pace_seconds: 300 }] })];
    expect(fastestSplitWindow(acts, 5)).toBeNull();
  });
  it('无 split_paces 或空数组 → null', () => {
    expect(fastestSplitWindow([mk({ split_paces: null })], 1)).toBeNull();
    expect(fastestSplitWindow([], 1)).toBeNull();
  });
  it('排除非 Run 类型', () => {
    const acts = [
      mk({ type: 'cycling', split_paces: [{ km: 1, pace_seconds: 100 }] }),
    ];
    expect(fastestSplitWindow(acts, 1)).toBeNull();
  });
});

describe('matchingRaceDistance', () => {
  it('非对称容差: 下限0.985/上限1.05', () => {
    const target = 21097.5; // 半马
    const acts = [
      mk({
        run_id: 1,
        distance: target * 0.985, // 恰好下限，应命中
        moving_time: '1:50:00',
      }),
    ];
    expect(matchingRaceDistance(acts, target)?.activity.run_id).toBe(1);
  });
  it('低于下限不命中', () => {
    const target = 21097.5;
    const acts = [mk({ distance: target * 0.98 })];
    expect(matchingRaceDistance(acts, target)).toBeNull();
  });
  it('高于上限不命中', () => {
    const target = 21097.5;
    const acts = [mk({ distance: target * 1.06 })];
    expect(matchingRaceDistance(acts, target)).toBeNull();
  });
  it('多条命中时取用时最短的一条', () => {
    const target = 21097.5;
    const acts = [
      mk({ run_id: 1, distance: target, moving_time: '2:00:00' }),
      mk({ run_id: 2, distance: target, moving_time: '1:50:00' }),
    ];
    expect(matchingRaceDistance(acts, target)?.activity.run_id).toBe(2);
  });
});

describe('trainingLogPersonalRecords', () => {
  it('产出 1k/5k/10k(滑动窗口)+半马/全马(容差匹配) 5 档', () => {
    const acts = [
      mk({
        run_id: 1,
        split_paces: Array.from({ length: 10 }, (_, i) => ({
          km: i + 1,
          pace_seconds: 300,
        })),
      }),
      mk({ run_id: 2, distance: 21097.5, moving_time: '1:50:00' }),
      mk({ run_id: 3, distance: 42195, moving_time: '3:50:00' }),
    ];
    const result = trainingLogPersonalRecords(acts);
    expect(result.map((r) => r.key)).toEqual([
      '1k',
      '5k',
      '10k',
      'half',
      'full',
    ]);
  });
  it('数据不足时该档缺省，不报错', () => {
    const result = trainingLogPersonalRecords([mk({ split_paces: null })]);
    expect(result).toEqual([]);
  });
});
