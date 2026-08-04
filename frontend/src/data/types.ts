// activities.json 的类型契约。对应 backend/generator/db.py::ACTIVITY_KEYS。
// 新字段 (M4/M5) 全部 optional，老数据无值不崩。

export interface SplitPace {
  km: number;
  pace_seconds: number;
}

export interface SplitHeartRate {
  km: number;
  avg_hr: number;
}

export interface CadenceTrend {
  first_half: number;
  second_half: number;
  direction: 'up' | 'down' | 'flat';
}

export interface Activity {
  run_id: number;
  name: string;
  distance: number; // 米
  moving_time: string; // "H:MM:SS.ffffff"
  type: string;
  subtype: string;
  start_date: string;
  start_date_local: string;
  location_country: string;
  summary_polyline: string | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_speed: number;
  average_cadence: number | null;
  cadence_trend: CadenceTrend | null;
  split_paces: SplitPace[] | null;
  split_heart_rates: SplitHeartRate[] | null;
  elevation_gain: number | null;
  streak?: number;

  // ---- M4 后端小改 (summaryDTO，全部可选)----
  calories?: number | null;
  elevation_loss?: number | null;
  avg_power?: number | null;
  aerobic_te?: number | null;

  // ---- M5 佳明深挖 (全部可选)----
  hr_zones?: unknown | null;
  vo2max?: number | null;
  training_status?: string | null;
}
