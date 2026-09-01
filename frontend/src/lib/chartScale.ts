// 图表坐标轴刻度计算 (纯函数)。

// 配速柱状图的 Y 轴范围。
//
// 两个必须解决的问题：
//   1. 方向 —— 配速秒数越大越慢，直接当柱高会让"高柱 = 慢"，与直觉相反。
//      返回倒序 domain [慢，快]，Recharts 据此把快的画高。
//   2. 量程 —— 原实现下界取 min - min*15%，10km 跑 26 秒的真实差异只占柱高 33%，
//      十根柱肉眼等高。改成贴着数据实际范围留固定比例余量。
//
// 离群段 (暂停/信号丢失，实测有单段 44897 秒) 不参与量程计算，否则主体被压成一条线。
export const OUTLIER_MEDIAN_RATIO = 2.5;

export interface PaceDomain {
  domain: [number, number]; // [慢端，快端]，倒序
  cap: number; // 离群阈值，超过它的柱应截顶显示
}

const median = (nums: number[]): number => {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const paceChartDomain = (paces: number[]): PaceDomain | null => {
  const valid = paces.filter((p) => p > 0);
  if (valid.length === 0) return null;

  const cap = median(valid) * OUTLIER_MEDIAN_RATIO;
  // 裁掉离群后若剩不足 3 段，说明这次跑步本就配速跨度大 (间歇跑)，不裁
  const trimmed = valid.filter((p) => p <= cap);
  const base = trimmed.length >= 3 ? trimmed : valid;

  const lo = Math.min(...base);
  const hi = Math.max(...base);
  // 余量至少 10 秒：跨度极小时 (实测有 6 秒) 按比例留白会把差异放大到失真
  const pad = Math.max((hi - lo) * 0.25, 10);
  return { domain: [hi + pad, lo - pad], cap };
};
