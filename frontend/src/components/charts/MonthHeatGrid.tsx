import { heatLevel } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';

// 月度日历热力网格 — 7 列(周一~周日) × N 行。
// 月视图的重点是「训练节奏」:哪几天跑了、连了几天、断了多久。
// 柱状图把空白日画成空气,日历把它画成休息日 —— 后者才是这个视图要回答的问题。

const LEVEL_BG = [
  'var(--color-heat-0)',
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
  'var(--color-heat-5)',
] as const;

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

interface Props {
  days: { day: number; km: number }[];
  // 当月 1 号是周几(0=周一 ... 6=周日),决定首格缩进
  firstWeekday: number;
  month: string; // "2026-08",用于 tooltip 日期文案
}

export const MonthHeatGrid = ({ days, firstWeekday, month }: Props) => (
  <div>
    {/* 单格上限 44px(触控尺寸):7 列 + 6 个 gap;
        不设上限时 aspect-square 会让格子随列宽无限放大 */}
    <div
      className="mx-auto grid grid-cols-7 gap-1"
      style={{ maxWidth: 'calc(7 * 44px + 6 * 4px)' }}
    >
      {WEEKDAY_LABELS.map((w) => (
        <div
          key={w}
          className="pb-1 text-center font-mono text-[10px] text-[var(--color-ink-3)]"
        >
          {w}
        </div>
      ))}

      {/* 月初空格:让 1 号落在正确的星期列 */}
      {Array.from({ length: firstWeekday }, (_, i) => (
        <div key={`pad-${i}`} aria-hidden />
      ))}

      {days.map((d) => {
        const level = heatLevel(d.km);
        const label =
          d.km > 0
            ? `${month}-${String(d.day).padStart(2, '0')} · ${d.km}km`
            : `${month}-${String(d.day).padStart(2, '0')} · 休息`;
        return (
          <Tooltip key={d.day} content={label}>
            <div
              className="flex aspect-square items-center justify-center rounded-[var(--radius-xs)] font-mono text-[10px] tabular-nums"
              style={{
                background: LEVEL_BG[level],
                // 深色档位上用反白数字保证对比度
                color:
                  level >= 4
                    ? 'var(--color-card)'
                    : level === 0
                      ? 'var(--color-ink-3)'
                      : 'var(--color-ink)',
              }}
            >
              {d.day}
            </div>
          </Tooltip>
        );
      })}
    </div>
  </div>
);
