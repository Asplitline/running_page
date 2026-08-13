import type { DailyMetric } from './types';

// daily_metrics.json 是 backend 每日身体状态同步产物 (gitignore, 不入库)，
// 可能不存在 (老同步流程 / API 失败降级)。同 activities.ts 的惰性探测模式：
// 通配符 import.meta.glob 避免文件缺失时 Rollup 静态 import 报错。
// 无 sample 降级 —— 这是可选增强字段，缺失时对应 KPI 直接不渲染。
const realModules = import.meta.glob<{ default: unknown }>('../static/*.json', {
  eager: true,
});
const real = realModules['../static/daily_metrics.json']?.default;

export const latestDailyMetric = (real ?? null) as DailyMetric | null;
