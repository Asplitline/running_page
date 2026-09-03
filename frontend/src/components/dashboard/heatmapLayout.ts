// 热力日历的布局计算 — 与渲染分离,便于对"不溢出"这个契约做回归测试。

export const HEAT_GAP = 3; // 格子间距 px
export const HEAT_AXIS_W = 18; // 星期轴宽 + 与网格的间距
export const HEAT_CELL_STEPS = [11, 10, 9, 8] as const; // 候选格子边长,由大到小
export const HEAT_SEGMENTS = [1, 2, 3] as const; // 候选分段数(按月均分)

export interface HeatLayout {
  segments: number;
  cell: number;
}

// 该年每月天数(含闰年)
export const monthLengths = (year: number): number[] =>
  Array.from({ length: 12 }, (_, m) => new Date(year, m + 1, 0).getDate());

// 把一年按月边界均分成 n 段,返回各段起始日序号(含末尾哨兵)
export const segmentBounds = (year: number, n: number): number[] => {
  const lens = monthLengths(year);
  const per = 12 / n;
  const out = [0];
  for (let i = 1; i <= n; i++) {
    out.push(lens.slice(0, per * i).reduce((a, b) => a + b, 0));
  }
  return out;
};

// 某段占多少列。段首日的星期决定前置空格,会影响列数。
export const segmentCols = (
  from: number,
  to: number,
  firstWeekday: number
): number => Math.ceil((to - from + ((from + firstWeekday) % 7)) / 7);

// 某个布局实际需要多宽(取最宽的那一段)
export const heatLayoutWidth = (
  layout: HeatLayout,
  year: number,
  firstWeekday: number
): number => {
  const bounds = segmentBounds(year, layout.segments);
  let maxCols = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    maxCols = Math.max(
      maxCols,
      segmentCols(bounds[i], bounds[i + 1], firstWeekday)
    );
  }
  return maxCols * (layout.cell + HEAT_GAP) + HEAT_AXIS_W;
};

// 选布局:格子尺寸是可读性底线,分段只是换个排法 —— 所以先折行、后缩格。
// 外层循环是格子尺寸、内层是分段数,于是「11px 折 3 段」会优先于「10px 单行」。
export const pickHeatLayout = (
  available: number,
  year: number,
  firstWeekday: number
): HeatLayout => {
  for (const cell of HEAT_CELL_STEPS) {
    for (const segments of HEAT_SEGMENTS) {
      const layout = { segments, cell };
      if (heatLayoutWidth(layout, year, firstWeekday) <= available) {
        return layout;
      }
    }
  }
  // 兜底:最多分段 + 最小格子。极窄容器(<270px)下仍会略微超出,
  // 但这已窄于任何真实设备的可用宽度,再降只会让格子小到不可读。
  return {
    segments: HEAT_SEGMENTS[HEAT_SEGMENTS.length - 1],
    cell: HEAT_CELL_STEPS[HEAT_CELL_STEPS.length - 1],
  };
};
