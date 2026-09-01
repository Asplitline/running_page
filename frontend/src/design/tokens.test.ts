import {
  hrZoneOf,
  hrZoneByBoundaries,
  makeZoneResolver,
  estimateHrMax,
} from './tokens';

// 佳明真实分区下界 (6 条带 hr_zones 的活动全部一致)
const GARMIN_ZONES = [
  { zone: 1, low_boundary: 104 },
  { zone: 2, low_boundary: 122 },
  { zone: 3, low_boundary: 139 },
  { zone: 4, low_boundary: 163 },
  { zone: 5, low_boundary: 180 },
];

describe('hrZoneByBoundaries', () => {
  it('取够得着的最高区', () => {
    expect(hrZoneByBoundaries(146, GARMIN_ZONES)?.zone).toBe(3);
    expect(hrZoneByBoundaries(166, GARMIN_ZONES)?.zone).toBe(4);
    expect(hrZoneByBoundaries(185, GARMIN_ZONES)?.zone).toBe(5);
  });
  it('正好等于下界算进该区', () => {
    expect(hrZoneByBoundaries(163, GARMIN_ZONES)?.zone).toBe(4);
  });
  it('低于 Z1 下界 → null (交调用方按"低于 Z1"处理)', () => {
    expect(hrZoneByBoundaries(90, GARMIN_ZONES)).toBeNull();
  });
  it('心率 0 / 空区间表 → null 且不抛', () => {
    expect(hrZoneByBoundaries(0, GARMIN_ZONES)).toBeNull();
    expect(hrZoneByBoundaries(150, [])).toBeNull();
  });
  it('返回的是 HR_ZONES 里的项，带 color/label', () => {
    const z = hrZoneByBoundaries(146, GARMIN_ZONES);
    expect(z?.label).toBe('节奏');
    expect(z?.color).toMatch(/^#/);
  });
});

describe('makeZoneResolver', () => {
  it('有 hr_zones → 走设备边界', () => {
    const r = makeZoneResolver(GARMIN_ZONES, 191);
    // 146 按边界是 Z3；按 191 百分比也是 Z3，用 166 区分：边界 Z4 / 百分比 Z4
    // 用 140 更能区分：边界 Z3(>=139)，百分比 140/191=73% 也是 Z3 —— 改用 162
    expect(r(162)?.zone).toBe(3); // 边界法 <163 仍是 Z3
    expect(hrZoneOf(162, 191)?.zone).toBe(4); // 百分比法 85% 已是 Z4，证明走的是边界
  });
  it('无 hr_zones → 退回百分比估算', () => {
    const r = makeZoneResolver(null, 191);
    expect(r(162)?.zone).toBe(4);
  });
  it('hr_zones 全为 0 边界视为不可用，退回估算', () => {
    const zeroed = GARMIN_ZONES.map((z) => ({ ...z, low_boundary: 0 }));
    expect(makeZoneResolver(zeroed, 191)(162)?.zone).toBe(4);
  });
  it('undefined 不抛', () => {
    expect(() => makeZoneResolver(undefined, 191)(150)).not.toThrow();
  });

  // 回归锁：绝不能用本次最高心率当分母。
  // 曾用 activity.max_heartrate(=177) 做分母，把 79% 的公里段误判成 Z5 极限。
  it('判定结果不随本次最高心率变化', () => {
    const hrs = [146, 153, 160, 166];
    const byGarmin = makeZoneResolver(GARMIN_ZONES, 191);
    const zones = hrs.map((h) => byGarmin(h)?.zone);
    expect(zones).toEqual([3, 3, 3, 4]);
    // 无论"本次最高心率"是 177 还是 999，都不参与判定
    for (const bogus of [177, 999]) {
      const same = makeZoneResolver(GARMIN_ZONES, bogus);
      expect(hrs.map((h) => same(h)?.zone)).toEqual(zones);
    }
  });
  it('真实样例：run 1788093393000 应为 Z3×6 + Z4×5，与佳明自报 40/26min 吻合', () => {
    const r = makeZoneResolver(GARMIN_ZONES, 191);
    const hrs = [146, 153, 157, 159, 160, 162, 165, 166, 166, 164, 166];
    const zones = hrs.map((h) => r(h)?.zone);
    expect(zones.filter((z) => z === 3)).toHaveLength(6);
    expect(zones.filter((z) => z === 4)).toHaveLength(5);
    expect(zones.filter((z) => z === 5)).toHaveLength(0);
  });
});

describe('estimateHrMax', () => {
  it('220 − 年龄', () => {
    expect(estimateHrMax(29)).toBe(191);
  });
});
