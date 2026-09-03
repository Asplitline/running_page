import type { Activity } from '@/data/types';
import { nextDistanceGoal, nextCountGoal, nextPbGoals } from './nextGoals';

// 构造一条跑步记录。distance 单位米，moving_time 形如 "0:52:00"。
const run = (
  date: string,
  distance: number,
  moving_time = '0:30:00'
): Activity =>
  ({
    run_id: Math.floor(Math.random() * 1e9),
    name: 'test',
    type: 'Run',
    distance,
    moving_time,
    start_date_local: `${date} 07:00:00`,
  }) as unknown as Activity;

describe('nextDistanceGoal', () => {
  it('返回下一个未达成的档位，而非已达成的最高档', () => {
    // 累计 150km → 已过 100，下一个是 500
    const g = nextDistanceGoal([run('2026-01-01', 150_000)])!;
    expect(g.target).toBe(500);
    expect(g.current).toBe(150);
    expect(g.remainKm).toBe(350);
  });

  it('剩余量与进度按真实累计算', () => {
    const g = nextDistanceGoal([run('2026-01-01', 2_321_700)])!;
    expect(g.target).toBe(2500);
    expect(g.remainKm).toBeCloseTo(178.3, 1);
    expect(g.progressPct).toBeCloseTo(92.9, 1);
  });

  it('无跑步记录返回 null', () => {
    expect(nextDistanceGoal([])).toBeNull();
  });

  it('超出最高档返回 null —— 不编造目标', () => {
    expect(nextDistanceGoal([run('2026-01-01', 9_000_000)])).toBeNull();
  });

  it('只统计 type=Run，骑行等不计入累计', () => {
    const ride = { ...run('2026-01-01', 500_000), type: 'Ride' } as Activity;
    const g = nextDistanceGoal([run('2026-01-01', 50_000), ride])!;
    expect(g.current).toBe(50);
    expect(g.target).toBe(100);
  });

  it('长期停跑 (近 8 周周均为 0) 时不给预估，避免 Infinity', () => {
    // 锚点日就是这条记录，往前 8 周窗口内只有它 —— 但周均仍 > 0。
    // 真正的 0 周均需要构造"锚点日在窗口外"，这里改测周均为 0 的兜底路径：
    // 用一条 0 距离的跑步，累计 0km 但有记录。
    const g = nextDistanceGoal([run('2026-01-01', 0)])!;
    expect(g.weeklyKm).toBe(0);
    expect(g.weeksToGo).toBeNull();
  });

  it('有跑量时给出周数预估，且至少 1 周', () => {
    const g = nextDistanceGoal([run('2026-01-01', 99_000)])!;
    expect(g.target).toBe(100);
    // 还差 1km，周均远大于 1 → 向下取整会得 0，须兜底为 1
    expect(g.weeksToGo).toBe(1);
  });
});

describe('nextCountGoal', () => {
  it('返回下一个未达成的次数档', () => {
    const runs = Array.from({ length: 262 }, (_, i) =>
      run(`2026-01-${String((i % 28) + 1).padStart(2, '0')}`, 10_000)
    );
    const g = nextCountGoal(runs)!;
    expect(g.target).toBe(500);
    expect(g.current).toBe(262);
    expect(g.remain).toBe(238);
  });

  it('无记录返回 null', () => {
    expect(nextCountGoal([])).toBeNull();
  });
});

describe('nextPbGoals', () => {
  it('目标是下一个整十分钟，差距为当前 PB 与它的差', () => {
    // 10K 用时 52:00 → 目标 50:00，差 120 秒
    const goals = nextPbGoals([run('2026-01-01', 10_000, '0:52:00')]);
    const tenK = goals.find((g) => g.key === '10k')!;
    expect(tenK.targetSeconds).toBe(3000);
    expect(tenK.gapSeconds).toBe(120);
  });

  it('取最快的一次作为当前 PB，而非最近一次', () => {
    const goals = nextPbGoals([
      run('2026-01-01', 10_000, '0:52:00'),
      run('2026-02-01', 10_000, '0:58:00'),
    ]);
    expect(goals.find((g) => g.key === '10k')!.currentSeconds).toBe(3120);
  });

  it('恰好压在整十分钟线上时跳过该档 —— 不产出「还差 0 秒」', () => {
    const goals = nextPbGoals([run('2026-01-01', 10_000, '0:50:00')]);
    expect(goals.find((g) => g.key === '10k')).toBeUndefined();
  });

  it('差距小的排前面 (触手可及优先)', () => {
    const goals = nextPbGoals([
      run('2026-01-01', 10_000, '0:59:00'), // 差 540 秒
      run('2026-01-02', 21_097, '1:50:37'), // 差 37 秒
    ]);
    expect(goals[0].key).toBe('half');
    expect(goals[0].gapSeconds).toBe(37);
  });

  it('无匹配距离档时不产出该档', () => {
    expect(nextPbGoals([run('2026-01-01', 3_000)])).toEqual([]);
  });
});

// formatGap 的行为契约在 NextGoalsPanel 内，这里锁住它依赖的数据前提：
// 真实数据下三档差距分别落在「秒 / 分」两侧，格式化分支都要被覆盖到。
describe('PB 差距的量级分布 (formatGap 分支前提)', () => {
  it('半马 36 秒落在「报到秒」区间，全马 361 秒落在「只报分」区间', () => {
    const goals = nextPbGoals([
      run('2026-01-01', 21_097, '1:50:36'),
      run('2026-01-02', 42_195, '3:46:01'),
    ]);
    expect(goals.find((g) => g.key === 'half')!.gapSeconds).toBeLessThan(60);
    expect(
      goals.find((g) => g.key === 'full')!.gapSeconds
    ).toBeGreaterThanOrEqual(120);
  });
});
