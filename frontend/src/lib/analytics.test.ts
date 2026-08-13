import {
  durationToSeconds,
  personalRecords,
  aerobicEfficiency,
  efficiencyByMonth,
  paceHrScatter,
} from './analytics';
import type { Activity } from '@/data/types';

// 最小活动工厂，只填测试关心的字段
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

describe('durationToSeconds', () => {
  it('解析 H:MM:SS', () => {
    expect(durationToSeconds('1:02:03')).toBe(3723);
  });
  it('去微秒', () => {
    expect(durationToSeconds('0:25:00.123456')).toBe(1500);
  });
  it('MM:SS(无小时)', () => {
    expect(durationToSeconds('25:00')).toBe(1500);
  });
  it('空串 → 0', () => {
    expect(durationToSeconds('')).toBe(0);
  });
});

describe('personalRecords', () => {
  it('取各距离用时最短', () => {
    const acts = [
      mk({ run_id: 1, distance: 5000, moving_time: '0:25:00' }),
      mk({ run_id: 2, distance: 5010, moving_time: '0:22:00' }), // 更快的 5K
      mk({ run_id: 3, distance: 10000, moving_time: '0:50:00' }),
    ];
    const pbs = personalRecords(acts);
    const p5k = pbs.find((p) => p.key === '5k');
    expect(p5k?.activity.run_id).toBe(2);
    expect(p5k?.seconds).toBe(1320);
    expect(pbs.find((p) => p.key === '10k')?.activity.run_id).toBe(3);
  });
  it('无匹配距离 → 该档缺省', () => {
    const pbs = personalRecords([mk({ distance: 3000 })]);
    expect(pbs.find((p) => p.key === '5k')).toBeUndefined();
  });
  it('空数组 → 空', () => {
    expect(personalRecords([])).toEqual([]);
  });
});

describe('aerobicEfficiency', () => {
  it('speed/hr × 100', () => {
    expect(
      aerobicEfficiency(mk({ average_speed: 3.0, average_heartrate: 150 }))
    ).toBe(2);
  });
  it('无心率 → null', () => {
    expect(aerobicEfficiency(mk({ average_heartrate: null }))).toBeNull();
  });
});

describe('efficiencyByMonth', () => {
  it('按月聚合并排序', () => {
    const acts = [
      mk({
        start_date_local: '2024-03-20 08:00:00',
        average_speed: 3.0,
        average_heartrate: 150,
      }),
      mk({
        start_date_local: '2024-03-25 08:00:00',
        average_speed: 3.6,
        average_heartrate: 150,
      }),
      mk({
        start_date_local: '2024-02-01 08:00:00',
        average_speed: 3.0,
        average_heartrate: 150,
      }),
    ];
    const pts = efficiencyByMonth(acts);
    expect(pts.map((p) => p.month)).toEqual(['2024-02', '2024-03']);
    expect(pts[1].count).toBe(2);
  });
  it('跳过无心率', () => {
    expect(efficiencyByMonth([mk({ average_heartrate: null })])).toEqual([]);
  });
});

describe('paceHrScatter', () => {
  it('speed(m/s) → 配速(秒/km) + 心率', () => {
    const pts = paceHrScatter([
      mk({ run_id: 7, average_speed: 3.0, average_heartrate: 150 }),
    ]);
    expect(pts).toEqual([
      { runId: 7, paceSecPerKm: 333, hr: 150, distanceKm: 5 },
    ]);
  });
  it('跳过无心率或无速度', () => {
    expect(paceHrScatter([mk({ average_heartrate: null })])).toEqual([]);
    expect(paceHrScatter([mk({ average_speed: 0 })])).toEqual([]);
  });
  it('排除非 Run 类型', () => {
    expect(paceHrScatter([mk({ type: 'cycling' })])).toEqual([]);
  });
});
