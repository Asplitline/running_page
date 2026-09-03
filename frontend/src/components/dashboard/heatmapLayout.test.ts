import { describe, expect, it } from 'vitest';
import { pickHeatLayout, heatLayoutWidth } from './heatmapLayout';

// 热力日历不允许横向溢出 —— 这是它存在的前提:早先靠 overflow-x-auto 兜底,
// 结果年末月份被静默裁掉且无滚动提示。下面锁住"任何视宽都装得下"这个契约。

// 真实页面内边距: main px-6(24) / sm:px-10(40) / lg:px-16(64)
const padOf = (vw: number): number => (vw >= 1024 ? 64 : vw >= 640 ? 40 : 24);

const VIEWPORTS = [320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1920, 2560];
// 覆盖闰年/平年,以及 1 月 1 日落在不同星期(会改变列数)
const YEARS = [2024, 2025, 2026, 2027, 2028];

const firstWeekdayOf = (year: number): number =>
  new Date(`${year}-01-01T00:00:00`).getDay();

describe('热力日历布局', () => {
  it('任何年份 × 任何视宽都不横向溢出', () => {
    const overflowed: string[] = [];
    for (const year of YEARS) {
      const fw = firstWeekdayOf(year);
      for (const vw of VIEWPORTS) {
        const available = vw - padOf(vw) * 2;
        const layout = pickHeatLayout(available, year, fw);
        const need = heatLayoutWidth(layout, year, fw);
        if (need > available) {
          overflowed.push(`${year}@${vw}px: 需 ${need} > 可用 ${available}`);
        }
      }
    }
    expect(overflowed).toEqual([]);
  });

  it('桌面宽度单行画完整年', () => {
    for (const year of YEARS) {
      const fw = firstWeekdayOf(year);
      // 1024px 是能单行画全年的最小常见断点
      const layout = pickHeatLayout(1024 - 64 * 2, year, fw);
      expect(layout.segments).toBe(1);
      expect(layout.cell).toBe(11);
    }
  });

  it('宽度不足时优先折行,而非缩小格子', () => {
    const year = 2026;
    const fw = firstWeekdayOf(year);
    // 768px 装不下单行(需 760 > 可用 688),应折段但保住 11px 格子
    const layout = pickHeatLayout(768 - 40 * 2, year, fw);
    expect(layout.segments).toBeGreaterThan(1);
    expect(layout.cell).toBe(11);
  });

  it('极窄容器仍返回可用布局而非崩溃', () => {
    const year = 2026;
    const fw = firstWeekdayOf(year);
    const layout = pickHeatLayout(80, year, fw);
    expect(layout.segments).toBeGreaterThanOrEqual(1);
    expect(layout.cell).toBeGreaterThanOrEqual(8);
  });
});
