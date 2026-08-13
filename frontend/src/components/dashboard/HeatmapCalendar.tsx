import type { Activity } from '@/data/types';
import { heatmapByDay, heatLevel } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';

// 年度热力日历 — GitHub 式格子。颜色深浅 = 当日跑步距离档位。零依赖 CSS Grid。

interface Props {
  activities: Activity[];
  year: number;
}

// 档位 → 背景色 token
const LEVEL_BG = [
  'var(--color-line-2)',
  'var(--color-z1)',
  'var(--color-z2)',
  'var(--color-z3)',
  'var(--color-z4)',
  'var(--color-z5)',
] as const;

// 生成该年所有日期的 YYYY-MM-DD(不可变，不依赖当前时间)
const daysOfYear = (year: number): string[] => {
  const out: string[] = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      out.push(`${year}-${mm}-${dd}`);
    }
  }
  return out;
};

const HeatmapCalendar = ({ activities, year }: Props) => {
  const byDay = heatmapByDay(activities, year);
  const days = daysOfYear(year);

  if (days.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">该年无数据</p>;
  }

  // 首格前的空占位：让 1 月 1 日落在其所在星期几的行
  const firstWeekday = new Date(`${year}-01-01T00:00:00`).getDay(); // 0=周日

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 11px)' }}
      >
        {/* 年初空占位，保证星期对齐 */}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`pad-${i}`} className="h-[11px] w-[11px]" />
        ))}
        {days.map((date) => {
          const cell = byDay.get(date);
          const level = heatLevel(cell?.distanceKm ?? 0);
          return (
            <Tooltip
              key={date}
              content={
                <span className="tnum font-mono">
                  {date}
                  {cell
                    ? ` · ${cell.distanceKm}km · ${cell.count} 次`
                    : ' · 未跑'}
                </span>
              }
            >
              <div
                className="h-[11px] w-[11px] rounded-[2px]"
                style={{ background: LEVEL_BG[level] }}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default HeatmapCalendar;
