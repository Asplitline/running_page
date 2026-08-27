import { splitRunName, markHighlights, summarizeRuns } from './recentRuns';
import type { Activity } from '@/data/types';

describe('splitRunName', () => {
  it('半角连字符分隔 → 拆出训练类型', () => {
    expect(splitRunName('成都市 - 乳酸阈值')).toEqual({
      place: '成都市',
      workout: '乳酸阈值',
    });
  });
  it('全角破折号分隔 (数据里两种都有)', () => {
    expect(splitRunName('成都市 – 基础训练')).toEqual({
      place: '成都市',
      workout: '基础训练',
    });
  });
  it('无分隔符的普通跑 → workout 为 null', () => {
    expect(splitRunName('成都市 跑步')).toEqual({
      place: '成都市 跑步',
      workout: null,
    });
  });
  it('训练类型含连字符时只按首个分隔符拆', () => {
    expect(splitRunName('成都市 - 200m * 15')).toEqual({
      place: '成都市',
      workout: '200m * 15',
    });
  });
  it('空串安全', () => {
    expect(splitRunName('')).toEqual({ place: '', workout: null });
  });
});

const act = (run_id: number, distance: number, speed: number): Activity =>
  ({ run_id, distance, average_speed: speed }) as Activity;

describe('markHighlights', () => {
  it('标出最长距离与最快配速 (speed 越大越快)', () => {
    const rows = markHighlights([
      act(1, 8000, 2.6),
      act(2, 15600, 2.5),
      act(3, 10000, 3.0),
    ]);
    expect(rows.map((r) => r.isLongest)).toEqual([false, true, false]);
    expect(rows.map((r) => r.isFastest)).toEqual([false, false, true]);
  });
  it('同一次跑步可同时是最长和最快', () => {
    const rows = markHighlights([act(1, 5000, 2.0), act(2, 15000, 3.0)]);
    expect(rows[1].isLongest).toBe(true);
    expect(rows[1].isFastest).toBe(true);
  });
  it('并列极值只标第一条,避免整屏高亮', () => {
    const rows = markHighlights([act(1, 10000, 2.5), act(2, 10000, 2.5)]);
    expect(rows.map((r) => r.isLongest)).toEqual([true, false]);
    expect(rows.map((r) => r.isFastest)).toEqual([true, false]);
  });
  it('缺 average_speed 的记录不参与最快评选', () => {
    const rows = markHighlights([
      { run_id: 1, distance: 9000, average_speed: 0 } as Activity,
      act(2, 8000, 2.4),
    ]);
    expect(rows[0].isFastest).toBe(false);
    expect(rows[1].isFastest).toBe(true);
  });
  it('单条记录不标记 (没有比较对象)', () => {
    const rows = markHighlights([act(1, 10000, 2.5)]);
    expect(rows[0].isLongest).toBe(false);
    expect(rows[0].isFastest).toBe(false);
  });
  it('空数组安全', () => {
    expect(markHighlights([])).toEqual([]);
  });
});

describe('summarizeRuns', () => {
  const withDate = (
    run_id: number,
    distance: number,
    speed: number,
    date: string
  ): Activity =>
    ({
      run_id,
      distance,
      average_speed: speed,
      start_date_local: date,
    }) as Activity;

  it('汇总总里程/次数/均配速/跨度天数', () => {
    const s = summarizeRuns([
      withDate(1, 10000, 2.5, '2026-08-14 07:00:00'),
      withDate(2, 10000, 2.5, '2026-08-04 07:00:00'),
    ]);
    expect(s).not.toBeNull();
    expect(s!.count).toBe(2);
    expect(s!.totalKm).toBe(20);
    // 2 * 10km / (2 * 10000/2.5 秒) → 400 秒/km
    expect(s!.avgPaceSecPerKm).toBe(400);
    expect(s!.spanDays).toBe(11); // 含首尾
  });

  it('均配速按总时长/总距离加权,不是各次配速的算术平均', () => {
    // 1km@300s + 9km@600s/km → 总 5700s / 10km = 570s/km (算术平均会是 450)
    const s = summarizeRuns([
      withDate(1, 1000, 1000 / 300, '2026-08-02 07:00:00'),
      withDate(2, 9000, 1000 / 600, '2026-08-01 07:00:00'),
    ]);
    expect(s!.avgPaceSecPerKm).toBe(570);
  });

  it('缺 average_speed 的记录不计入配速,但仍计入里程', () => {
    const s = summarizeRuns([
      { run_id: 1, distance: 5000, average_speed: 0, start_date_local: '2026-08-02 07:00:00' } as Activity,
      withDate(2, 10000, 2.5, '2026-08-01 07:00:00'),
    ]);
    expect(s!.totalKm).toBe(15);
    expect(s!.avgPaceSecPerKm).toBe(400); // 只按有速度的那 10km 算
  });

  it('全部缺速度时均配速为 null', () => {
    const s = summarizeRuns([
      { run_id: 1, distance: 5000, average_speed: 0, start_date_local: '2026-08-01 07:00:00' } as Activity,
    ]);
    expect(s!.avgPaceSecPerKm).toBeNull();
  });

  it('单条记录跨度为 1 天', () => {
    const s = summarizeRuns([withDate(1, 10000, 2.5, '2026-08-01 07:00:00')]);
    expect(s!.spanDays).toBe(1);
  });

  it('空数组返回 null', () => {
    expect(summarizeRuns([])).toBeNull();
  });
});
