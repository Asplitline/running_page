import { overallStats, weeklyVolume, thisWeekKm, acwr } from './stats';
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
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2024-06-01 08:00:00',
      }),
      mk({
        type: 'Run',
        distance: 8000,
        start_date_local: '2025-06-01 08:00:00',
      }),
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
    expect(s).toEqual({
      totalDistanceKm: 0,
      totalRuns: 0,
      thisYearKm: 0,
      longestRunKm: 0,
    });
  });
});

import { heatmapByDay, heatLevel } from './stats';

describe('heatmapByDay', () => {
  it('同日多次跑步合并 count 与距离', () => {
    const acts = [
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2024-03-20 08:00:00',
      }),
      mk({
        type: 'Run',
        distance: 3000,
        start_date_local: '2024-03-20 18:00:00',
      }),
    ];
    const m = heatmapByDay(acts, 2024);
    const cell = m.get('2024-03-20');
    expect(cell?.count).toBe(2);
    expect(cell?.distanceKm).toBe(8);
  });

  it('只含指定年 + 仅 Run', () => {
    const acts = [
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2024-03-20 08:00:00',
      }),
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2025-03-20 08:00:00',
      }),
      mk({
        type: 'cycling',
        distance: 5000,
        start_date_local: '2024-03-21 08:00:00',
      }),
    ];
    const m = heatmapByDay(acts, 2024);
    expect(m.size).toBe(1);
    expect(m.has('2024-03-20')).toBe(true);
  });
});

describe('heatLevel', () => {
  it('0km → 0', () => expect(heatLevel(0)).toBe(0));
  it('分档边界', () => {
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(5)).toBe(2);
    expect(heatLevel(8)).toBe(3);
    expect(heatLevel(12)).toBe(4);
    expect(heatLevel(20)).toBe(5);
  });
});

import { statsByYear, longestStreak, latestMonthKm } from './stats';

describe('statsByYear', () => {
  it('仅计 Run，按年升序分组', () => {
    const acts = [
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2025-06-01 08:00:00',
      }),
      mk({
        type: 'Run',
        distance: 8000,
        start_date_local: '2024-06-01 08:00:00',
      }),
      mk({
        type: 'cycling',
        distance: 30000,
        start_date_local: '2024-06-02 08:00:00',
      }),
    ];
    const ys = statsByYear(acts);
    expect(ys.map((y) => y.year)).toEqual([2024, 2025]);
    expect(ys[0]).toMatchObject({ year: 2024, km: 8, runs: 1 });
    expect(ys[1]).toMatchObject({ year: 2025, km: 5, runs: 1 });
  });

  it('平均配速 = 总时长/总距离 (加权，非各次算术平均)', () => {
    // A: 2km / 10:00 = 300 s/km; B: 8km / 32:00 = 240 s/km
    // 算术平均 = 270; 加权 = (600+1920)/(2+8) = 2520/10 = 252 s/km
    const acts = [
      mk({
        distance: 2000,
        moving_time: '0:10:00',
        start_date_local: '2025-01-01 08:00:00',
      }),
      mk({
        distance: 8000,
        moving_time: '0:32:00',
        start_date_local: '2025-01-02 08:00:00',
      }),
    ];
    expect(statsByYear(acts)[0].avgPaceSec).toBe(252);
  });

  it('平均心率对 null 兜底 (跳过无心率的次数)', () => {
    const acts = [
      mk({ average_heartrate: 150, start_date_local: '2025-01-01 08:00:00' }),
      mk({ average_heartrate: null, start_date_local: '2025-01-02 08:00:00' }),
    ];
    expect(statsByYear(acts)[0].avgHr).toBe(150);
    const noHr = [
      mk({ average_heartrate: null, start_date_local: '2025-01-01 08:00:00' }),
    ];
    expect(statsByYear(noHr)[0].avgHr).toBeNull();
  });

  it('空数组 → 空列表', () => {
    expect(statsByYear([])).toEqual([]);
  });
});

describe('longestStreak', () => {
  it('取全局最大 streak', () => {
    expect(
      longestStreak([mk({ streak: 1 }), mk({ streak: 4 }), mk({ streak: 2 })])
    ).toBe(4);
  });
  it('无 streak 字段 → 0', () => {
    expect(longestStreak([mk({}), mk({})])).toBe(0);
    expect(longestStreak([])).toBe(0);
  });
});

import { activeDays } from './stats';

describe('activeDays', () => {
  it('同日多次跑步只算 1 天，仅计指定年的 Run', () => {
    const acts = [
      mk({ type: 'Run', start_date_local: '2024-03-20 08:00:00' }),
      mk({ type: 'Run', start_date_local: '2024-03-20 18:00:00' }),
      mk({ type: 'Run', start_date_local: '2024-03-21 08:00:00' }),
      mk({ type: 'Run', start_date_local: '2025-03-22 08:00:00' }),
      mk({ type: 'cycling', start_date_local: '2024-03-25 08:00:00' }),
    ];
    expect(activeDays(acts, 2024)).toBe(2);
  });
  it('空数组 → 0', () => expect(activeDays([], 2024)).toBe(0));
});

describe('latestMonthKm', () => {
  it('取数据最新月的里程 (仅 Run)', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2026-07-01 08:00:00' }),
      mk({ distance: 3000, start_date_local: '2026-08-01 08:00:00' }),
      mk({ distance: 4000, start_date_local: '2026-08-15 08:00:00' }),
    ];
    expect(latestMonthKm(acts)).toEqual({ month: '2026-08', km: 7 });
  });
  it('空数组 → 空月 0km', () => {
    expect(latestMonthKm([])).toEqual({ month: '', km: 0 });
  });
});

describe('weeklyVolume', () => {
  it('以最新记录日为锚点，按 7 天分桶累加里程', () => {
    const acts = [
      // 锚点日 2026-08-15，本周窗口 = 08-09 ~ 08-15
      mk({ distance: 5000, start_date_local: '2026-08-15 08:00:00' }),
      mk({ distance: 3000, start_date_local: '2026-08-10 08:00:00' }),
      // 上一周窗口 = 08-02 ~ 08-08
      mk({ distance: 4000, start_date_local: '2026-08-02 08:00:00' }),
    ];
    const weeks = weeklyVolume(acts, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ weekStart: '2026-08-02', km: 4 });
    expect(weeks[1]).toMatchObject({ weekStart: '2026-08-09', km: 8 });
  });
  it('排除非 Run 类型', () => {
    const acts = [
      mk({
        type: 'Run',
        distance: 5000,
        start_date_local: '2026-08-15 08:00:00',
      }),
      mk({
        type: 'cycling',
        distance: 30000,
        start_date_local: '2026-08-15 08:00:00',
      }),
    ];
    expect(weeklyVolume(acts, 1)[0].km).toBe(5);
  });
  it('空数组 → 空数组', () => {
    expect(weeklyVolume([])).toEqual([]);
  });
});

describe('thisWeekKm', () => {
  it('等于近 8 周趋势的最后一段', () => {
    const acts = [
      mk({ distance: 5000, start_date_local: '2026-08-15 08:00:00' }),
    ];
    expect(thisWeekKm(acts)).toBe(5);
  });
  it('空数组 → 0', () => {
    expect(thisWeekKm([])).toBe(0);
  });
});

describe('acwr', () => {
  it('急性负荷 / 慢性负荷(近4周周均)', () => {
    // 锚点 2026-08-15。4 周里程: 5,5,5,10(最新一周)km
    // 慢性 = (5+5+5+10)/4 = 6.25; 急性 = 10; acwr = 10/6.25 = 1.6
    const acts = [
      mk({ distance: 5000, start_date_local: '2026-07-25 08:00:00' }),
      mk({ distance: 5000, start_date_local: '2026-08-01 08:00:00' }),
      mk({ distance: 5000, start_date_local: '2026-08-08 08:00:00' }),
      mk({ distance: 10000, start_date_local: '2026-08-15 08:00:00' }),
    ];
    expect(acwr(acts)).toBe(1.6);
  });
  it('慢性负荷为 0 → null', () => {
    expect(acwr([])).toBeNull();
  });
});
