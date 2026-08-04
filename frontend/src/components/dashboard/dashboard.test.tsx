import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { TooltipProvider } from '@/components/ui/Tooltip';
import StatsBar from './StatsBar';
import PrSnapshot from './PrSnapshot';
import HeatmapCalendar from './HeatmapCalendar';

const mk = (over: Partial<Activity>): Activity =>
  ({
    run_id: 1,
    name: 'test',
    distance: 5000,
    moving_time: '0:25:00',
    type: 'Run',
    subtype: '',
    start_date: '2024-03-20 00:00:00',
    start_date_local: '2024-03-20 08:00:00',
    location_country: '',
    summary_polyline: null,
    average_heartrate: 150,
    max_heartrate: 165,
    average_speed: 3.3,
    average_cadence: 185,
    cadence_trend: null,
    split_paces: null,
    split_heart_rates: null,
    elevation_gain: 0,
    ...over,
  }) as Activity;

describe('dashboard', () => {
  it('StatsBar 渲染累计数字', () => {
    render(<StatsBar activities={[mk({ distance: 5000 })]} year={2024} />);
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('Runs')).toBeDefined();
  });

  it('PrSnapshot 空数据显示占位', () => {
    render(
      <MemoryRouter>
        <PrSnapshot activities={[mk({ distance: 3000 })]} />
      </MemoryRouter>
    );
    expect(screen.getByText('暂无符合距离档的记录')).toBeDefined();
  });

  it('HeatmapCalendar 渲染不崩 (有 Tooltip Provider)', () => {
    render(
      <TooltipProvider>
        <HeatmapCalendar
          activities={[mk({ distance: 8000, start_date_local: '2024-03-20 08:00:00' })]}
          year={2024}
        />
      </TooltipProvider>
    );
    // 366/365 个格子渲染成功即 container 有内容
    expect(document.querySelector('.grid-flow-col')).not.toBeNull();
  });
});
