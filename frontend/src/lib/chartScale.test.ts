import { paceChartDomain } from './chartScale';

describe('paceChartDomain', () => {
  it('倒序：首项是慢端，末项是快端 (保证柱高 = 快)', () => {
    const d = paceChartDomain([349, 366, 357, 375])!;
    expect(d.domain[0]).toBeGreaterThan(d.domain[1]);
  });

  it('真实样例 10km 差 26 秒：量程贴合数据而非从 0 起', () => {
    // 2026-07-02 那次，配速 349~375
    const d = paceChartDomain([
      349, 366, 357, 371, 375, 369, 357, 358, 354, 366,
    ])!;
    const [slow, fast] = d.domain;
    // 旧实现下界是 349-52=297，量程 78 秒；新实现应显著收紧
    expect(slow - fast).toBeLessThan(60);
    // 且必须把真实数据全包住
    expect(fast).toBeLessThanOrEqual(349);
    expect(slow).toBeGreaterThanOrEqual(375);
  });

  it('跨度极小 (6 秒) 时余量兜底 10 秒，不把差异放大到失真', () => {
    const d = paceChartDomain([304, 306, 308, 310, 305])!;
    const [slow, fast] = d.domain;
    expect(slow - fast).toBeGreaterThanOrEqual(26); // 6 + 10*2
    expect(slow).toBe(320);
    expect(fast).toBe(294);
  });

  it('离群段不参与量程 (2025-12-27 有单段 44897 秒)', () => {
    const paces = [632, 700, 810, 900, 1393, 1500, 44897];
    const d = paceChartDomain(paces)!;
    // 慢端远小于 44897，说明离群被排除
    expect(d.domain[0]).toBeLessThan(5000);
    // 但 cap 要报出来，供组件把超限柱截顶
    expect(d.cap).toBeGreaterThan(0);
    expect(44897).toBeGreaterThan(d.cap);
  });

  // 光设 domain 挡不住离群 —— Recharts 会自动扩轴去容纳超出的数据点。
  // 组件必须把值钳到 domain 慢端才生效，这里锁住"慢端 < 离群值"这个前提。
  it('慢端小于离群值，组件据此钳值', () => {
    const paces = [632, 700, 810, 900, 1393, 1500, 44897];
    const d = paceChartDomain(paces)!;
    expect(d.domain[0]).toBeLessThan(44897);
  });

  it('间歇跑跨度天然大：裁剪后不足 3 段则不裁', () => {
    // 中位 187，cap=467.5，只有 137/187 两段在内 → 应回退用全量
    const d = paceChartDomain([137, 187, 3174])!;
    expect(d.domain[0]).toBeGreaterThan(3174);
  });

  it('单段不抛', () => {
    const d = paceChartDomain([350])!;
    expect(d.domain[0]).toBe(360);
    expect(d.domain[1]).toBe(340);
  });

  it('空数组 / 全为 0 → null', () => {
    expect(paceChartDomain([])).toBeNull();
    expect(paceChartDomain([0, 0])).toBeNull();
  });
});
