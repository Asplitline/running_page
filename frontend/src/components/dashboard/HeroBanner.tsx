import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import {
  overallStats,
  statsByYear,
  longestStreak,
  latestMonthKm,
  ANNUAL_GOAL_KM,
} from '@/lib/stats';
import { personalRecords } from '@/lib/analytics';
import { formatKm, formatClock, formatPace } from '@/lib/format';

// 首页英雄区 — 里程为核，逐年为证。总里程撑全场 + 年度目标进度环 + 数据条 + 三年逐年对比。
// 设计：跳跃式字号阶梯 (超大总里程 → 中号年度里程 → 小号明细)，每模块一个焦点。

interface Props {
  activities: Activity[];
  year: number;
}

// 年度目标进度环 (SVG)。项目内无现成进度环组件。
const ProgressRing = ({
  pct,
  center,
  year,
}: {
  pct: number;
  center: string;
  year: number;
}) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="var(--color-bar-muted)"
          strokeWidth="7"
        />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 46 46)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-lg font-extrabold text-[var(--color-ink)]">
          {center}
        </span>
        <span className="font-mono text-[8px] tracking-wide text-[var(--color-ink-3)]">
          {year}
        </span>
      </div>
    </div>
  );
};

// 数据条单元 — 中号主值 + 小号标签。可选 to 使其成为跳详情链接。
const Cell = ({
  value,
  unit,
  label,
  to,
}: {
  value: string;
  unit?: string;
  label: string;
  to?: string;
}) => {
  const inner = (
    <>
      <div className="tnum text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
        {value}
        {unit && (
          <span className="text-[11px] font-semibold text-[var(--color-ink-3)]">
            {' '}
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-[var(--color-ink-3)]">
        {label}
      </div>
    </>
  );
  const cls = 'border-r border-[var(--color-line)] px-2 pt-5 last:border-r-0';
  return to ? (
    <Link
      to={to}
      className={`${cls} block transition-colors hover:text-[var(--color-accent)]`}
    >
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

// 逐年对比行 — 中号里程 (次级焦点) + 进度条 + 小号明细。
const YearRow = ({
  year,
  km,
  runs,
  pace,
  hr,
  barPct,
  current,
  dim,
  deltaKm,
  fasterSec,
}: {
  year: number;
  km: string;
  runs: number;
  pace: string;
  hr: number | null;
  barPct: number;
  current: boolean;
  dim: boolean;
  deltaKm: number | null;
  fasterSec: number | null;
}) => (
  <div>
    <div className="mb-2">
      <span
        className={`font-mono text-[13px] font-bold tracking-wide ${current ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-3)]'}`}
      >
        {year}
        {current && ' · 至今'}
      </span>
    </div>
    <div
      className="tnum text-[clamp(30px,4.4vw,44px)] font-extrabold leading-none tracking-tight text-[var(--color-ink)]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {km}
      <span className="text-[13px] font-semibold text-[var(--color-ink-3)]">
        {' '}
        km
      </span>
      {deltaKm != null && deltaKm > 0 && (
        <span className="ml-2.5 align-middle text-[13px] font-bold text-[var(--color-z2)]">
          ↑{deltaKm}%
        </span>
      )}
    </div>
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-card-2)]">
      <div
        className="h-full rounded-[var(--radius-pill)]"
        style={{
          width: `${barPct}%`,
          background: dim
            ? 'var(--color-bar-muted)'
            : 'linear-gradient(90deg, var(--color-accent), var(--color-z3))',
        }}
      />
    </div>
    <div className="mt-2.5 flex gap-4 font-mono text-[11px] text-[var(--color-ink-3)]">
      <span>{runs} 次</span>
      <span>
        配速 <b className="font-semibold text-[var(--color-ink-2)]">{pace}</b>
        {fasterSec != null && fasterSec > 0 && (
          <span className="text-[var(--color-z2)]"> 快 {fasterSec}″</span>
        )}
      </span>
      {hr != null && (
        <span>
          心率 <b className="font-semibold text-[var(--color-ink-2)]">{hr}</b>
        </span>
      )}
    </div>
  </div>
);

const HeroBanner = ({ activities, year }: Props) => {
  const s = overallStats(activities, year);
  const years = statsByYear(activities);
  const streak = longestStreak(activities);
  const month = latestMonthKm(activities);
  const pbs = personalRecords(activities);
  const fullPb = pbs.find((p) => p.key === 'full');

  // 年度目标进度
  const goalPct = s.thisYearKm / ANNUAL_GOAL_KM;
  const remain = Math.max(0, Math.round(ANNUAL_GOAL_KM - s.thisYearKm));

  // 三年对比：进度条按最大里程年归一化；涨幅相对上一年
  const maxKm = years.reduce((m, y) => Math.max(m, y.km), 0) || 1;
  const latestYearNum = years.length ? years[years.length - 1].year : year;

  return (
    <div className="mt-8 grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] shadow-[var(--shadow-soft)] lg:grid-cols-[1.05fr_0.95fr]">
      {/* 左半：里程为核 */}
      <div className="flex flex-col justify-between gap-9 p-9 sm:p-11">
        <div>
          <p className="eyebrow">跑步档案 · 累计里程</p>
          <div className="mb-2 mt-3 flex items-end gap-3 leading-[0.85]">
            <span
              className="tnum bg-gradient-to-r from-[var(--color-ink)] to-[var(--color-accent)] bg-clip-text text-[clamp(64px,10vw,120px)] font-extrabold tracking-tighter text-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatKm(s.totalDistanceKm)}
            </span>
            <span className="mb-3 text-lg font-semibold text-[var(--color-ink-3)]">
              km
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-ink-2)]">
            {s.totalRuns} 次跑步 · 累计坚持 · 最长单次{' '}
            <b className="font-bold text-[var(--color-ink)]">
              {formatKm(s.longestRunKm)}km
            </b>
          </p>
        </div>

        {/* 年度目标进度环 */}
        <div className="flex flex-wrap items-center gap-7">
          <ProgressRing
            pct={goalPct}
            center={`${Math.round(goalPct * 100)}%`}
            year={year}
          />
          <div>
            <div className="text-[13px] text-[var(--color-ink-2)]">
              <b className="tnum text-lg font-bold text-[var(--color-ink)]">
                {formatKm(s.thisYearKm)}
              </b>{' '}
              / {ANNUAL_GOAL_KM} km
            </div>
            <div className="mt-1 font-mono text-[11px] tracking-wide text-[var(--color-ink-3)]">
              {year} 目标进度 · 还差 {remain}km
            </div>
          </div>
        </div>

        {/* 数据条 */}
        <div className="grid grid-cols-4 border-t border-[var(--color-line)]">
          <Cell
            value={formatKm(s.thisYearKm)}
            unit="km"
            label={`${year} 至今`}
          />
          <Cell
            value={formatKm(month.km)}
            unit="km"
            label={`本月 ${month.month.slice(5)}`}
          />
          <Cell value={String(streak)} unit="天" label="最长连续" />
          <Cell
            value={fullPb ? formatClock(fullPb.seconds) : '—'}
            label="全马 PB"
            to={fullPb ? `/runs/${fullPb.activity.run_id}` : undefined}
          />
        </div>
      </div>

      {/* 右半：三年逐年对比 */}
      <div className="flex flex-col border-t border-[var(--color-line)] bg-[var(--color-card-2)] p-9 sm:p-11 lg:border-l lg:border-t-0">
        <div className="mb-5 flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-3)]">
            逐年对比
          </span>
          <span className="font-mono text-[9px] text-[var(--color-ink-3)]">
            {year} 为年中进度
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-6">
          {years.map((y, i) => {
            const prev = i > 0 ? years[i - 1] : null;
            const deltaKm =
              prev && prev.km > 0
                ? Math.round(((y.km - prev.km) / prev.km) * 100)
                : null;
            const fasterSec = prev
              ? Math.round(prev.avgPaceSec - y.avgPaceSec)
              : null;
            const isCurrent = y.year === latestYearNum;
            return (
              <YearRow
                key={y.year}
                year={y.year}
                km={formatKm(y.km)}
                runs={y.runs}
                pace={formatPace(y.avgPaceSec)}
                hr={y.avgHr}
                barPct={Math.round((y.km / maxKm) * 100)}
                current={isCurrent}
                dim={!isCurrent && i < years.length - 1 && y.km < maxKm}
                deltaKm={deltaKm}
                fasterSec={fasterSec}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
