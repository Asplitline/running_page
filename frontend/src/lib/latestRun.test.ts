import { describe, it, expect } from 'vitest';
import type { Activity } from '@/data/types';
import {
  latestRun,
  paceSeconds,
  weightedPace,
  comparePeers,
  paceRank,
  splitRange,
  splitSeconds,
} from './latestRun';

const mk = (over: Partial<Activity>): Activity =>
  ({
    run_id: 1,
    name: '成都市 跑步',
    distance: 10000,
    moving_time: '1:00:00',
    type: 'Run',
    subtype: '',
    start_date: '2026-08-01 00:00:00',
    start_date_local: '2026-08-01 08:00:00',
    location_country: '',
    summary_polyline: null,
    average_heartrate: 160,
    max_heartrate: 175,
    average_speed: 2.78,
    average_cadence: 180,
    cadence_trend: null,
    split_paces: null,
    split_heart_rates: null,
    elevation_gain: 0,
    ...over,
  }) as Activity;

describe('latestRun', () => {
  it('乱序输入也取到时间最新的一条', () => {
    const list = [
      mk({ run_id: 1, start_date_local: '2026-08-01 08:00:00' }),
      mk({ run_id: 3, start_date_local: '2026-08-30 20:00:00' }),
      mk({ run_id: 2, start_date_local: '2026-08-15 08:00:00' }),
    ];
    expect(latestRun(list)?.run_id).toBe(3);
  });

  it('过滤非跑步类型', () => {
    const list = [
      mk({ run_id: 1, start_date_local: '2026-08-01 08:00:00' }),
      mk({
        run_id: 9,
        type: 'Ride',
        start_date_local: '2026-08-30 20:00:00',
      }),
    ];
    expect(latestRun(list)?.run_id).toBe(1);
  });

  it('空数据返回 null', () => {
    expect(latestRun([])).toBeNull();
  });
});

describe('paceSeconds', () => {
  it('优先用 moving_time / distance', () => {
    // 10km / 50 分 = 300 秒每公里
    const a = mk({ distance: 10000, moving_time: '0:50:00' });
    expect(paceSeconds(a)).toBe(300);
  });

  it('时长缺失时回退 average_speed', () => {
    const a = mk({ moving_time: '', average_speed: 2.5 });
    expect(paceSeconds(a)).toBe(400);
  });

  it('两者都缺返回 null', () => {
    const a = mk({ moving_time: '', average_speed: 0 });
    expect(paceSeconds(a)).toBeNull();
  });
});

describe('weightedPace', () => {
  it('按距离加权，不是各次配速的算术平均', () => {
    // 1km@300s 与 9km@400s：算术平均 350，加权应接近 390
    const list = [
      mk({ distance: 1000, moving_time: '0:05:00' }),
      mk({ distance: 9000, moving_time: '1:00:00' }),
    ];
    const w = weightedPace(list);
    expect(w).toBe(390);
    expect(w).not.toBe(350);
  });

  it('空列表返回 null', () => {
    expect(weightedPace([])).toBeNull();
  });
});

describe('comparePeers', () => {
  const target = mk({
    name: '成都市 - 基础训练',
    distance: 10000,
    moving_time: '0:55:00', // 330 s/km
    average_heartrate: 155,
    start_date_local: '2026-08-30 20:00:00',
  });

  it('同类型样本足够时给出差值', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00', // 360
        average_heartrate: 165,
        start_date_local: '2026-08-20 20:00:00',
      }),
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00', // 360
        average_heartrate: 165,
        start_date_local: '2026-08-10 20:00:00',
      }),
    ];
    const c = comparePeers(target, list);
    expect(c).not.toBeNull();
    expect(c!.workout).toBe('基础训练');
    expect(c!.sample).toBe(2);
    expect(c!.peerPace).toBe(360);
    expect(c!.paceDelta).toBe(30); // 本次快 30 秒
    expect(c!.hrDelta).toBe(10); // 本次心率低 10 次
  });

  it('同类型样本不足 2 次时返回 null', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        start_date_local: '2026-08-20 20:00:00',
      }),
    ];
    expect(comparePeers(target, list)).toBeNull();
  });

  it('无课表标签返回 null', () => {
    const plain = mk({ name: '成都市 跑步' });
    const list = [
      plain,
      mk({ name: '成都市 跑步' }),
      mk({ name: '成都市 跑步' }),
    ];
    expect(comparePeers(plain, list)).toBeNull();
  });

  it('不同课表类型不参与对比', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 乳酸阈值',
        start_date_local: '2026-08-20 20:00:00',
      }),
      mk({
        name: '成都市 - 乳酸阈值',
        start_date_local: '2026-08-10 20:00:00',
      }),
    ];
    expect(comparePeers(target, list)).toBeNull();
  });

  it('只跟窗口内的同类型比，两年前的旧数据不参与', () => {
    const list = [
      target,
      // 窗口内：应参与
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00', // 360
        start_date_local: '2026-08-20 20:00:00',
      }),
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00', // 360
        start_date_local: '2026-08-10 20:00:00',
      }),
      // 两年前：不该参与（配速极慢，若混入会把均值拉高）
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '2:00:00', // 720
        start_date_local: '2024-08-02 20:00:00',
      }),
    ];
    const c = comparePeers(target, list);
    expect(c!.sample).toBe(2); // 只有窗口内两条
    expect(c!.peerPace).toBe(360); // 未被 720 拉高
  });

  it('窗口内样本不足时返回 null，不回退到更长窗口', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        start_date_local: '2026-08-20 20:00:00',
      }),
      // 窗口外还有两条，但不该被拿来凑数
      mk({
        name: '成都市 - 基础训练',
        start_date_local: '2024-08-02 20:00:00',
      }),
      mk({
        name: '成都市 - 基础训练',
        start_date_local: '2024-07-02 20:00:00',
      }),
    ];
    expect(comparePeers(target, list)).toBeNull();
  });

  it('晚于本次的记录不参与对比', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        start_date_local: '2026-09-10 20:00:00', // 在 target 之后
      }),
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        start_date_local: '2026-09-20 20:00:00',
      }),
    ];
    expect(comparePeers(target, list)).toBeNull();
  });

  it('窗口可调', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        start_date_local: '2026-01-10 20:00:00', // 约 230 天前
      }),
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        start_date_local: '2026-01-20 20:00:00',
      }),
    ];
    expect(comparePeers(target, list)).toBeNull(); // 默认 90 天窗口外
    expect(comparePeers(target, list, 365)).not.toBeNull(); // 放宽后可比
  });

  it('本次更慢时 paceDelta 为负', () => {
    const slow = mk({
      name: '成都市 - 基础训练',
      distance: 10000,
      moving_time: '1:10:00', // 420
      start_date_local: '2026-08-30 20:00:00',
    });
    const list = [
      slow,
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00',
        start_date_local: '2026-08-20 20:00:00',
      }),
      mk({
        name: '成都市 - 基础训练',
        distance: 10000,
        moving_time: '1:00:00',
        start_date_local: '2026-08-10 20:00:00',
      }),
    ];
    expect(comparePeers(slow, list)!.paceDelta).toBe(-60);
  });

  it('历史心率缺失时 hrDelta 为 null，配速对比仍可用', () => {
    const list = [
      target,
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        average_heartrate: 0,
        start_date_local: '2026-08-20 20:00:00',
      }),
      mk({
        name: '成都市 - 基础训练',
        moving_time: '1:00:00',
        average_heartrate: 0,
        start_date_local: '2026-08-10 20:00:00',
      }),
    ];
    const c = comparePeers(target, list);
    expect(c!.hrDelta).toBeNull();
    expect(c!.paceDelta).toBe(30);
  });
});

describe('paceRank', () => {
  it('最快的一次排第 1', () => {
    const fast = mk({
      moving_time: '0:40:00',
      start_date_local: '2026-08-30 20:00:00',
    });
    const list = [
      fast,
      mk({ moving_time: '0:50:00', start_date_local: '2026-08-20 20:00:00' }),
      mk({ moving_time: '1:00:00', start_date_local: '2026-08-10 20:00:00' }),
    ];
    expect(paceRank(fast, list)).toEqual({ rank: 1, total: 3 });
  });

  it('最慢的一次排末位', () => {
    const slow = mk({
      moving_time: '1:10:00',
      start_date_local: '2026-08-30 20:00:00',
    });
    const list = [
      slow,
      mk({ moving_time: '0:50:00', start_date_local: '2026-08-20 20:00:00' }),
      mk({ moving_time: '1:00:00', start_date_local: '2026-08-10 20:00:00' }),
    ];
    expect(paceRank(slow, list)).toEqual({ rank: 3, total: 3 });
  });

  it('样本不足 2 条返回 null', () => {
    const only = mk({});
    expect(paceRank(only, [only])).toBeNull();
  });
});

describe('splitSeconds / splitRange', () => {
  it('无分段数据时 splitSeconds 为空、splitRange 为 null', () => {
    const a = mk({ split_paces: null });
    expect(splitSeconds(a)).toEqual([]);
    expect(splitRange(a)).toBeNull();
  });

  it('段数少于 3 不计算极差', () => {
    const a = mk({
      split_paces: [
        { km: 1, pace_seconds: 300 },
        { km: 2, pace_seconds: 320 },
      ],
    } as Partial<Activity>);
    expect(splitRange(a)).toBeNull();
  });

  it('极差 = 最慢 - 最快', () => {
    const a = mk({
      split_paces: [
        { km: 1, pace_seconds: 300 },
        { km: 2, pace_seconds: 320 },
        { km: 3, pace_seconds: 310 },
      ],
    } as Partial<Activity>);
    expect(splitRange(a)).toBe(20);
  });

  it('过滤非法分段值', () => {
    const a = mk({
      split_paces: [
        { km: 1, pace_seconds: 300 },
        { km: 2, pace_seconds: 0 },
        { km: 3, pace_seconds: 320 },
      ],
    } as Partial<Activity>);
    expect(splitSeconds(a)).toEqual([300, 320]);
  });
});
