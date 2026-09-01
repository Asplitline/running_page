import {
  timelineEvents,
  timelineByYear,
  tierByGainPct,
  tierByMilestone,
  isRace,
  goalEvents,
} from './timeline';
import type { Activity } from '@/data/types';

// 最小活动工厂 (对齐 achievements.test.ts / analytics.test.ts 风格)
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

describe('tierByGainPct', () => {
  it('提升 >5% 为重大突破', () => {
    expect(tierByGainPct(13.8)).toBe('major');
    expect(tierByGainPct(5.1)).toBe('major');
  });
  it('提升 2%~5% 为显著刷新', () => {
    expect(tierByGainPct(2)).toBe('notable');
    expect(tierByGainPct(3.2)).toBe('notable');
    expect(tierByGainPct(5)).toBe('notable');
  });
  it('提升 <2% 为微幅刷新', () => {
    expect(tierByGainPct(1.2)).toBe('minor');
    expect(tierByGainPct(0.1)).toBe('minor');
  });
});

describe('tierByMilestone', () => {
  it('按里程量级递进上色', () => {
    expect(tierByMilestone(100)).toBe('minor');
    expect(tierByMilestone(500)).toBe('notable');
    expect(tierByMilestone(1000)).toBe('first');
    expect(tierByMilestone(2000)).toBe('major');
  });
});

describe('isRace', () => {
  it('name 含赛事关键词才算比赛', () => {
    expect(isRace(mk({ name: '成都市 - 2025成都世遗马拉松' }))).toBe(true);
    expect(isRace(mk({ name: 'Chengdu Panda Marathon (Full marathon)' }))).toBe(
      true
    );
    expect(isRace(mk({ name: '成都市 - 基础训练' }))).toBe(false);
  });
});

describe('timelineEvents', () => {
  it('无跑步记录返回空数组', () => {
    expect(timelineEvents([])).toEqual([]);
    expect(timelineEvents([mk({ type: 'cycling' })])).toEqual([]);
  });

  it('只认 type=Run，骑行不进时间轴', () => {
    const events = timelineEvents([
      mk({ run_id: 1, type: 'cycling', distance: 200000 }),
    ]);
    expect(events.filter((e) => e.kind === 'milestone')).toEqual([]);
  });

  it('PB 首次达成记为 first 档，后续刷新按提升幅度分档', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 10000,
        moving_time: '0:55:49',
        start_date_local: '2025-09-05 08:00:00',
      }),
      // 快 108s / 3349s = 3.2% → notable
      mk({
        run_id: 2,
        distance: 10000,
        moving_time: '0:54:01',
        start_date_local: '2025-09-19 08:00:00',
      }),
    ];
    const pbs = timelineEvents(acts).filter((e) => e.kind === 'pb');
    expect(pbs).toHaveLength(2);
    expect(pbs[0].tier).toBe('first');
    expect(pbs[0].title).toBe('首个10K');
    expect(pbs[1].tier).toBe('notable');
    expect(pbs[1].gainSeconds).toBe(108);
    expect(pbs[1].prevSeconds).toBe(3349);
  });

  it('没刷新的成绩不产生 PB 事件', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 10000,
        moving_time: '0:52:00',
        start_date_local: '2025-09-05 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 10000,
        moving_time: '0:58:00',
        start_date_local: '2025-09-19 08:00:00',
      }),
    ];
    expect(timelineEvents(acts).filter((e) => e.kind === 'pb')).toHaveLength(1);
  });

  it('PB 阶梯累积完整刷新历史', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 10000,
        moving_time: '0:55:49',
        start_date_local: '2025-09-05 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 10000,
        moving_time: '0:54:01',
        start_date_local: '2025-09-19 08:00:00',
      }),
      mk({
        run_id: 3,
        distance: 10000,
        moving_time: '0:52:00',
        start_date_local: '2025-10-29 08:00:00',
      }),
    ];
    const pbs = timelineEvents(acts).filter((e) => e.kind === 'pb');
    expect(pbs[2].steps).toHaveLength(3);
    expect(pbs[2].steps!.map((s) => s.seconds)).toEqual([3349, 3241, 3120]);
  });

  it('累计里程跨阈值时记里程碑，且只记一次', () => {
    const acts = Array.from({ length: 3 }, (_, i) =>
      mk({
        run_id: i + 1,
        distance: 40000,
        start_date_local: `2024-0${i + 1}-01 08:00:00`,
      })
    );
    const ms = timelineEvents(acts).filter((e) => e.kind === 'milestone');
    expect(ms).toHaveLength(1); // 120km 只跨过 100
    expect(ms[0].km).toBe(100);
    expect(ms[0].date).toBe('2024-03-01'); // 第三次才跨过
  });

  it('同日比赛 + PB 合并为一条，档位取 PB 提升幅度', () => {
    const acts = [
      mk({
        run_id: 1,
        name: '成都市 - Panda Marathon',
        distance: 42195,
        moving_time: '4:22:13',
        start_date_local: '2024-03-24 08:00:00',
      }),
      // 快 2172s / 15733s = 13.8% → major
      mk({
        run_id: 2,
        name: '成都市 - 2025成都世遗马拉松',
        distance: 42195,
        moving_time: '3:46:01',
        start_date_local: '2025-03-30 08:00:00',
      }),
    ];
    const events = timelineEvents(acts);
    const races = events.filter((e) => e.kind === 'race');
    expect(races).toHaveLength(2);
    // 第二场吸收了全马 PB,档位升为 major
    const second = races[1];
    expect(second.tier).toBe('major');
    expect(second.gainSeconds).toBe(2172);
    // 合并后不再有独立的同日 PB 事件
    expect(
      events.filter((e) => e.kind === 'pb' && e.date === '2025-03-30')
    ).toHaveLength(0);
  });

  it('月度峰值只记最高的一个月', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 10000,
        start_date_local: '2024-01-05 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 50000,
        start_date_local: '2024-02-05 08:00:00',
      }),
      mk({
        run_id: 3,
        distance: 50000,
        start_date_local: '2024-02-20 08:00:00',
      }),
    ];
    const peaks = timelineEvents(acts).filter((e) => e.kind === 'peak');
    expect(peaks).toHaveLength(1);
    expect(peaks[0].km).toBe(100);
    expect(peaks[0].monthRuns).toBe(2);
    expect(peaks[0].date).toBe('2024-02-20'); // 落在月内
  });

  it('首次质量课每种只记一次', () => {
    const acts = [
      mk({
        run_id: 1,
        name: '成都市 - 800m间歇',
        start_date_local: '2024-05-25 08:00:00',
      }),
      mk({
        run_id: 2,
        name: '成都市 - 800m间歇',
        start_date_local: '2024-06-01 08:00:00',
      }),
      mk({
        run_id: 3,
        name: '成都市 - 乳酸阈值',
        start_date_local: '2025-11-13 08:00:00',
      }),
    ];
    const w = timelineEvents(acts).filter((e) => e.kind === 'workout');
    expect(w).toHaveLength(2);
    expect(w.map((e) => e.label)).toEqual(['间歇跑', '乳酸阈值']);
  });

  it('事件按日期升序，未来目标排在最后', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 120000,
        start_date_local: '2024-05-09 08:00:00',
      }),
    ];
    const events = timelineEvents(acts);
    const dates = events.map((e) => e.date);
    expect([...dates]).toEqual([...dates].sort());
    expect(events[events.length - 1].kind).toBe('goal');
  });
});

describe('goalEvents', () => {
  it('给出下一个未达成的里程碑与剩余量', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 120000,
        start_date_local: '2024-05-09 08:00:00',
      }),
    ];
    const goals = goalEvents(acts);
    const ms = goals.find((g) => g.km === 500);
    expect(ms).toBeDefined();
    expect(ms!.remainKm).toBe(380);
    expect(ms!.progressPct).toBe(24);
  });

  it('10K 目标取当前 PB 向下最近的整十分钟', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 10000,
        moving_time: '0:52:00',
        start_date_local: '2025-10-29 08:00:00',
      }),
    ];
    const goal = goalEvents(acts).find((g) => g.label === '10K');
    expect(goal).toBeDefined();
    expect(goal!.seconds).toBe(3000); // 50 分
    expect(goal!.remainSeconds).toBe(120);
    expect(goal!.title).toBe('10K 破 50 分');
  });

  it('无 10K 记录时不产生 10K 目标', () => {
    const acts = [mk({ run_id: 1, distance: 5000 })];
    expect(goalEvents(acts).filter((g) => g.label === '10K')).toHaveLength(0);
  });
});

describe('timelineByYear', () => {
  it('按年分组并带该年汇总，目标组排最后', () => {
    const acts = [
      mk({
        run_id: 1,
        distance: 120000,
        start_date_local: '2024-05-09 08:00:00',
      }),
      mk({
        run_id: 2,
        distance: 60000,
        start_date_local: '2025-01-10 08:00:00',
      }),
    ];
    const groups = timelineByYear(acts);
    expect(groups[0].year).toBe('2024');
    expect(groups[0].runs).toBe(1);
    expect(groups[0].km).toBe(120);
    expect(groups[groups.length - 1].year).toBe('goal');
  });

  it('无数据返回空数组', () => {
    expect(timelineByYear([])).toEqual([]);
  });
});
