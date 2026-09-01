import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { MonthLogPanel } from './MonthLogPanel';
import type { MonthLog } from '@/lib/trainingLog';

// 月视图的环比文案契约:低基数月改报差值,避免百分比放大成无意义数字。

const mkMonth = (over: Partial<MonthLog>): MonthLog => ({
  month: '2026-06',
  distanceKm: 92.3,
  avgPaceSec: 359,
  maxDistanceKm: 15,
  totalSeconds: 33166,
  count: 9,
  dailyChartValues: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    km: i < 9 ? 10 : 0,
  })),
  prevMonthKm: null,
  firstWeekday: 0,
  ...over,
});

const renderPanel = (months: MonthLog[]) =>
  render(
    <TooltipProvider>
      <MonthLogPanel months={months} />
    </TooltipProvider>
  );

describe('MonthLogPanel 环比文案', () => {
  it('上月基数低于 30km 时报里程差值,不报百分比', () => {
    renderPanel([mkMonth({ distanceKm: 92.3, prevMonthKm: 14.9 })]);
    expect(screen.getByText('+77.4km vs 上月')).toBeDefined();
    expect(screen.queryByText(/519%/)).toBeNull();
  });

  it('上月基数正常时报百分比', () => {
    renderPanel([mkMonth({ distanceKm: 119, prevMonthKm: 83.2 })]);
    expect(screen.getByText('+43% vs 上月')).toBeDefined();
  });

  it('里程下降时用减号', () => {
    renderPanel([mkMonth({ distanceKm: 83.2, prevMonthKm: 119 })]);
    expect(screen.getByText('−30% vs 上月')).toBeDefined();
  });

  it('最早一月无上月数据时不显示环比', () => {
    renderPanel([mkMonth({ prevMonthKm: null })]);
    expect(screen.queryByText(/vs 上月/)).toBeNull();
  });

  it('渲染节奏摘要', () => {
    renderPanel([mkMonth({ prevMonthKm: null })]);
    expect(screen.getByText(/最长连跑 9 天/)).toBeDefined();
    expect(screen.getByText(/最长间隔 21 天/)).toBeDefined();
  });

  it('空数据显示占位', () => {
    renderPanel([]);
    expect(screen.getByText('暂无数据')).toBeDefined();
  });
});
