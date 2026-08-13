import sample from '@/static/activities.sample.json';
import type { Activity } from './types';

// activities.json 是 backend 同步产物 (gitignore, 不入库)。
// 构建期它可能不存在 (CI 纯构建 / 新克隆), 所以静态 import 会让 Rollup 硬失败。
// 用带通配符的 import.meta.glob 惰性探测：存在则用真实数据，缺失时 (零匹配) 回退 sample。
// 通配符是关键——字面路径会被当成静态 import 而在文件缺失时报错。
// import.meta.glob 不认 @/ 别名，必须用相对/绝对路径 (Vite 约束)。
const realModules = import.meta.glob<{ default: unknown[] }>(
  '../static/*.json',
  {
    eager: true,
  }
);
const real = realModules['../static/activities.json']?.default;

// 编译期 import 的活动数据。统一从这里取，页面不直接 import json。
export const activities = (real ?? sample) as unknown as Activity[];

// 按 run_id 定位单条 (详情页用)
export const getActivityById = (runId: number): Activity | undefined =>
  activities.find((a) => a.run_id === runId);

// 按开始时间倒序 (最近在前)
export const activitiesByDateDesc = (): Activity[] =>
  [...activities].sort(
    (a, b) =>
      new Date(b.start_date_local).getTime() -
      new Date(a.start_date_local).getTime()
  );
