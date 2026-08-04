// 纯格式化函数。数值展示统一走这里。

// 米 → 公里，保留 1 位
export const toKm = (meters: number): number => Math.round((meters / 1000) * 10) / 10;

// average_speed(m/s)→ 配速 "M:SS /km"
export const paceFromSpeed = (speedMs: number): string => {
  if (!speedMs) return '--';
  const secPerKm = 1000 / speedMs;
  return formatPace(secPerKm);
};

// 秒 → "M:SS"(配速用)
export const formatPace = (secPerKm: number): string => {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// "H:MM:SS.ffffff" → "H:MM:SS"(去微秒)
export const formatDuration = (raw: string): string => {
  if (!raw) return '--';
  return raw.split('.')[0];
};

// "2024-03-24 07:33:31" → "2024 · 03 · 24"
export const formatDateDots = (local: string): string => {
  if (!local) return '';
  const [date] = local.split(' ');
  return date.replace(/-/g, ' · ');
};

// 秒 → 时钟格式 ("M:SS" 或 "H:MM:SS",PB 用时展示)
export const formatClock = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};
