import { useState } from 'react';
import type { SplitPace, SplitHeartRate } from '@/data/types';
import { formatPace } from '@/lib/format';
import { hrZoneOf } from '@/design/tokens';

// 逐公里分段表格 — 对齐老前端 DayActivitySplitPanel：公里/配速/心率三列，
// 5 行一页+上一页/下一页，标记全场最快配速行、最高心率行。

const SPLIT_PAGE_SIZE = 5;

interface Row {
  km: number;
  paceSeconds: number;
  heartRate: number | null;
}

interface Props {
  splitPaces: SplitPace[];
  splitHeartRates: SplitHeartRate[] | null;
  hrMax: number;
}

export const SplitTable = ({ splitPaces, splitHeartRates, hrMax }: Props) => {
  const [page, setPage] = useState(0);

  if (!splitPaces.length) {
    return <p className="text-sm text-[var(--color-ink-3)]">无分段数据</p>;
  }

  const hrByKm = new Map((splitHeartRates ?? []).map((h) => [h.km, h.avg_hr]));
  const rows: Row[] = splitPaces
    .map((s) => ({
      km: s.km,
      paceSeconds: s.pace_seconds,
      heartRate: hrByKm.get(s.km) ?? null,
    }))
    .sort((a, b) => a.km - b.km);

  const fastest = rows.reduce((best, r) =>
    r.paceSeconds < best.paceSeconds ? r : best
  );
  const peakHr = rows.reduce<Row | null>((best, r) => {
    if (r.heartRate == null) return best;
    if (
      best === null ||
      best.heartRate === null ||
      r.heartRate > best.heartRate
    ) {
      return r;
    }
    return best;
  }, null);

  const totalPages = Math.max(1, Math.ceil(rows.length / SPLIT_PAGE_SIZE));
  const paged = rows.slice(
    page * SPLIT_PAGE_SIZE,
    page * SPLIT_PAGE_SIZE + SPLIT_PAGE_SIZE
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-line)] pb-2 font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
        <span>公里</span>
        <span>配速</span>
        <span>心率</span>
      </div>
      <div className="divide-y divide-[var(--color-line)]">
        {paged.map((r) => {
          const isFastest = r.km === fastest.km;
          const isPeakHr = peakHr != null && r.km === peakHr.km;
          const zone = r.heartRate ? hrZoneOf(r.heartRate, hrMax) : null;
          return (
            <div
              key={r.km}
              className="tnum grid grid-cols-3 gap-2 py-2 text-sm"
            >
              <span className="font-mono text-[var(--color-ink-3)]">
                {r.km}K
              </span>
              <span
                className={
                  isFastest
                    ? 'rounded-[var(--radius-sm)] bg-[var(--color-accent-solid)] px-1.5 py-0.5 font-semibold text-white'
                    : ''
                }
              >
                {formatPace(r.paceSeconds)}
              </span>
              <span
                className={
                  isPeakHr
                    ? 'rounded-[var(--radius-sm)] px-1.5 py-0.5 font-semibold text-white'
                    : ''
                }
                style={{
                  // 徽章底承载白字，用压深版 (白字于 z5 原色仅 4.08:1)
                  background: isPeakHr ? 'var(--color-z5-solid)' : undefined,
                  // 文字用 inkColor(压深版)：原 zone.color 是图表填充色，作文字最低仅 1.85:1
                  color: !isPeakHr && zone ? zone.inkColor : undefined,
                }}
              >
                {r.heartRate ? `${r.heartRate} bpm` : '--'}
              </span>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3 font-mono text-xs text-[var(--color-ink-3)]">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="上一页分段"
            className="rounded-[var(--radius-sm)] px-2 py-1 disabled:opacity-30"
          >
            ←
          </button>
          <span className="tnum">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="下一页分段"
            className="rounded-[var(--radius-sm)] px-2 py-1 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};
