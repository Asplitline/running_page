import { useEffect, useRef, useState } from 'react';
import type { Activity } from '@/data/types';
import { heatmapByDay, heatLevel } from '@/lib/stats';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  HEAT_AXIS_W,
  HEAT_GAP,
  monthLengths,
  pickHeatLayout,
  segmentBounds,
  segmentCols,
} from './heatmapLayout';
import type { HeatLayout } from './heatmapLayout';

// 年度热力日历 — GitHub 式格子。颜色深浅 = 当日跑步距离档位。
//
// 按容器宽度自适应:装得下就单行画完整年,装不下折成 2 段(上半年/下半年)
// 或 3 段,实在窄才缩小格子。任何视宽都不产生横向滚动 —— 早先这里挂
// overflow-x-auto 兜底,结果是年末月份被静默裁掉且没有滚动提示,
// 用户既看不到数据也不知道能滚。

// 档位 → 背景色 token。用热力专用暖色梯度(非心率分区 Z1-Z5):
// 距离是单调量,色阶必须同色系由浅到深,绿→黄→红的分区色会让相邻档看着无序。
const LEVEL_BG = [
  'var(--color-heat-0)',
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
  'var(--color-heat-5)',
] as const;

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''] as const;

// 生成该年所有日期的 YYYY-MM-DD(不可变,不依赖当前时间)
const daysOfYear = (year: number): string[] => {
  const out: string[] = [];
  monthLengths(year).forEach((len, m) => {
    for (let d = 1; d <= len; d++) {
      out.push(
        `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
  });
  return out;
};

interface Props {
  activities: Activity[];
  year: number;
  // 数据锚点日 (YYYY-MM-DD)。此日之后的格子渲染为"未来"底色,
  // 与"当天跑了 0km"区分开 —— 否则年后半段全空会像渲染失败。
  throughDate?: string;
}

const HeatmapCalendar = ({ activities, year, throughDate }: Props) => {
  const byDay = heatmapByDay(activities, year);
  const days = daysOfYear(year);
  const firstWeekday = new Date(`${year}-01-01T00:00:00`).getDay(); // 0=周日

  const hostRef = useRef<HTMLDivElement>(null);
  // 初值给单行满格:首屏(桌面居多)直接命中,避免先画窄再跳宽的闪动
  const [layout, setLayout] = useState<HeatLayout>({ segments: 1, cell: 11 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = (width: number) => {
      if (width <= 0) return;
      setLayout((prev) => {
        const next = pickHeatLayout(width, year, firstWeekday);
        // 同值时返回原对象,避免每次 resize 都触发重渲染
        return prev.segments === next.segments && prev.cell === next.cell
          ? prev
          : next;
      });
    };

    measure(host.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) measure(e.contentRect.width);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [year, firstWeekday]);

  if (days.length === 0) {
    return <p className="text-sm text-[var(--color-ink-3)]">该年无数据</p>;
  }

  const { segments, cell } = layout;
  const step = cell + HEAT_GAP;
  const bounds = segmentBounds(year, segments);

  return (
    // 无 overflow:装不下要靠上面的分段解决,不用滚动条掩盖
    <div ref={hostRef} className="flex w-full flex-col gap-3.5">
      {Array.from({ length: segments }, (_, s) => {
        const from = bounds[s];
        const to = bounds[s + 1];
        const pad = (from + firstWeekday) % 7; // 段首前置空格
        const cols = segmentCols(from, to, firstWeekday);
        const slice = days.slice(from, to);

        // 该段内每月首日所在列,用于月份轴定位
        const months: { month: number; col: number }[] = [];
        slice.forEach((date, i) => {
          if (date.endsWith('-01')) {
            months.push({
              month: Number(date.slice(5, 7)),
              col: Math.floor((i + pad) / 7),
            });
          }
        });

        return (
          <div key={from} className="flex flex-col gap-1">
            {/* 月份轴 — 绝对定位到每月首日所在列,避免与格子网格耦合 */}
            <div
              className="relative h-3 font-mono text-[9px] text-[var(--color-ink-3)]"
              style={{ marginLeft: HEAT_AXIS_W, width: cols * step }}
              aria-hidden="true"
            >
              {months.map(({ month, col }) => (
                <span
                  key={month}
                  className="tnum absolute top-0"
                  style={{ left: col * step }}
                >
                  {month}月
                </span>
              ))}
            </div>

            <div className="flex gap-1">
              {/* 星期轴 — 只标一/三/五,避免 7 行全标喧宾夺主 */}
              <div
                className="grid font-mono text-[9px] leading-none text-[var(--color-ink-3)]"
                style={{
                  gridTemplateRows: `repeat(7, ${cell}px)`,
                  rowGap: HEAT_GAP,
                }}
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
                  gridTemplateRows: `repeat(7, ${cell}px)`,
                  gap: HEAT_GAP,
                }}
              >
                {/* 段首空占位,保证星期对齐 */}
                {Array.from({ length: pad }, (_, i) => (
                  <div
                    key={`pad-${i}`}
                    style={{ height: cell, width: cell }}
                    aria-hidden="true"
                  />
                ))}
                {slice.map((date) => {
                  const item = byDay.get(date);
                  const isFuture = throughDate ? date > throughDate : false;
                  const level = heatLevel(item?.distanceKm ?? 0);
                  return (
                    <Tooltip
                      key={date}
                      content={
                        <span className="tnum font-mono">
                          {date}
                          {item
                            ? ` · ${item.distanceKm}km · ${item.count} 次`
                            : isFuture
                              ? ' · 未来'
                              : ' · 未跑'}
                        </span>
                      }
                    >
                      <div
                        className="rounded-[2px]"
                        style={{
                          height: cell,
                          width: cell,
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
          </div>
        );
      })}
    </div>
  );
};

export default HeatmapCalendar;
