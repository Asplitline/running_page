import raw from '@/static/activities.json';
import type { Activity } from './types';

// 编译期 import 的活动数据 (backend 同步产物)。
// 统一从这里取，页面不直接 import json。
export const activities = raw as unknown as Activity[];

// 按 run_id 定位单条 (详情页用)
export const getActivityById = (runId: number): Activity | undefined =>
  activities.find((a) => a.run_id === runId);

// 按开始时间倒序 (最近在前)
export const activitiesByDateDesc = (): Activity[] =>
  [...activities].sort(
    (a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
  );
