import { achievements } from './achievements';
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

describe('achievements', () => {
  it('累计里程跨过阈值时记为达成 (按时间顺序累加)', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 60000,
        start_date_local: '2024-01-01 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 60000,
        start_date_local: '2024-01-02 08:00:00',
      }),
    ];
    const result = achievements(acts);
    const distance100 = result.find((a) => a.key === 'distance-100');
    expect(distance100).toBeDefined();
    expect(distance100?.achievedDate).toBe('2024-01-02 08:00:00');
  });

  it('累计次数跨过阈值时记为达成', () => {
    const acts = Array.from({ length: 50 }, (_, i) =>
      mk({
        run_id: i + 1,
        distance: 1000,
        start_date_local: `2024-01-${String((i % 28) + 1).padStart(2, '0')} 08:00:00`,
      })
    );
    const result = achievements(acts);
    expect(result.find((a) => a.key === 'count-50')).toBeDefined();
    expect(result.find((a) => a.key === 'count-100')).toBeUndefined();
  });

  it('首次达成距离档 = 最早一次，非最快一次', () => {
    const acts = [
      // 更早但更慢的全马
      mk({
        run_id: 1,
        distance: 42195,
        moving_time: '5:00:00',
        start_date_local: '2024-01-01 08:00:00',
      }),
      // 更晚但更快的全马 (PB)
      mk({
        run_id: 2,
        distance: 42195,
        moving_time: '4:00:00',
        start_date_local: '2024-06-01 08:00:00',
      }),
    ];
    const result = achievements(acts);
    const firstFull = result.find((a) => a.key === 'first-full');
    expect(firstFull?.achievedDate).toBe('2024-01-01 08:00:00');
  });

  it('未跨过阈值不出现', () => {
    const acts = [mk({ distance: 5000 })];
    const result = achievements(acts);
    expect(result.find((a) => a.key === 'distance-100')).toBeUndefined();
    expect(result.find((a) => a.key === 'first-5k')).toBeDefined();
  });

  it('排除非 Run 类型', () => {
    const acts = [mk({ type: 'cycling', distance: 100000 })];
    expect(achievements(acts)).toEqual([]);
  });

  it('按达成时间倒序 (最新解锁在前)', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 5000,
        start_date_local: '2024-01-01 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 21097,
        start_date_local: '2024-06-01 08:00:00',
      }),
    ];
    const result = achievements(acts);
    expect(
      result[0].achievedDate >= result[result.length - 1].achievedDate
    ).toBe(true);
  });

  it('空数组 → 空', () => {
    expect(achievements([])).toEqual([]);
  });
});
