import type { Activity } from '@/data/types';
import { heatmapByDay, heatLevel } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';

// 年度热力日历 — GitHub 式格子。颜色深浅 = 当日跑步距离档位。零依赖 CSS Grid。

const CELL = 11; // 格子边长 px
const GAP = 3; // 格子间距 px
const STEP = CELL + GAP; // 一列/一行的步进

// 档位 → 背景色 token。用热力专用暖色梯度(非心率分区 Z1-Z5)：
// 距离是单调量，色阶必须同色系由浅到深，绿→黄→红的分区色会让相邻档看着无序。
const LEVEL_BG = [
  'var(--color-heat-0)',
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
  'var(--color-heat-5)',
] as const;

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''] as const;

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

// 每月首日所在的列号 (= 该日在网格里的序号 / 7)，用于月份标签定位
const monthColumns = (
  days: string[],
  firstWeekday: number
): { month: number; col: number }[] => {
  const out: { month: number; col: number }[] = [];
  days.forEach((date, i) => {
    if (!date.endsWith('-01')) return;
    out.push({
      month: Number(date.slice(5, 7)),
      col: Math.floor((i + firstWeekday) / 7),
    });
  });
  return out;
};

interface Props {
  activities: Activity[];
  year: number;
  // 数据锚点日 (YYYY-MM-DD)。此日之后的格子渲染为"未来"底色，
  // 与"当天跑了 0km"区分开 —— 否则年后半段全空会像渲染失败。
  throughDate?: string;
}

const HeatmapCalendar = ({ activities, year, throughDate }: Props) => {
  const byDay = heatmapByDay(activities, year);
  const days = daysOfYear(year);

  if (days.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">该年无数据</p>;
  }

  // 首格前的空占位：让 1 月 1 日落在其所在星期几的行
  const firstWeekday = new Date(`${year}-01-01T00:00:00`).getDay(); // 0=周日
  const months = monthColumns(days, firstWeekday);
  const totalCols = Math.ceil((days.length + firstWeekday) / 7);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        {/* 月份轴 — 绝对定位到每月首日所在列，避免与格子网格耦合 */}
        <div
          className="relative h-3 font-mono text-[9px] text-[var(--color-ink-3)]"
          style={{ marginLeft: 18, width: totalCols * STEP }}
          aria-hidden="true"
        >
          {months.map(({ month, col }) => (
            <span
              key={month}
              className="tnum absolute top-0"
              style={{ left: col * STEP }}
            >
              {month}月
            </span>
          ))}
        </div>

        <div className="flex gap-1">
          {/* 星期轴 — 只标一/三/五，避免 7 行全标喧宾夺主 */}
          <div
            className="grid font-mono text-[9px] leading-none text-[var(--color-ink-3)]"
            style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }}
            aria-hidden="true"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="flex items-center">
                {label}
              </span>
            ))}
          </div>

          <div
            className="inline-grid grid-flow-col"
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gap: GAP,
            }}
          >
            {/* 年初空占位，保证星期对齐 */}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div
                key={`pad-${i}`}
                style={{ height: CELL, width: CELL }}
                aria-hidden="true"
              />
            ))}
            {days.map((date) => {
              const cell = byDay.get(date);
              const isFuture = throughDate ? date > throughDate : false;
              const level = heatLevel(cell?.distanceKm ?? 0);
              return (
                <Tooltip
                  key={date}
                  content={
                    <span className="tnum font-mono">
                      {date}
                      {cell
                        ? ` · ${cell.distanceKm}km · ${cell.count} 次`
                        : isFuture
                          ? ' · 未来'
                          : ' · 未跑'}
                    </span>
                  }
                >
                  <div
                    className="rounded-[2px]"
                    style={{
                      height: CELL,
                      width: CELL,
                      background: isFuture
                        ? 'var(--color-heat-future)'
                        : LEVEL_BG[level],
                    }}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* 图例 — 没有它只能看出"有深有浅"，读不出档位含义 */}
        <div
          className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-[var(--color-ink-3)]"
          style={{ marginLeft: 18 }}
        >
          <span>少</span>
          {LEVEL_BG.map((bg) => (
            <span
              key={bg}
              className="rounded-[2px]"
              style={{ height: 9, width: 9, background: bg }}
            />
          ))}
          <span>多</span>
          <span className="ml-1 opacity-70">· 格深 = 当日里程</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
