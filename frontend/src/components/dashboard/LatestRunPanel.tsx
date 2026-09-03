import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Activity } from '@/data/types';
import { formatPace, formatClock, toKm } from '@/lib/format';
import { durationToSeconds } from '@/lib/analytics';
import { weeklyVolume } from '@/lib/stats';
import { splitRunName } from '@/lib/recentRuns';
import {
  latestRun,
  paceSeconds,
  splitSeconds,
  splitRange,
  comparePeers,
  paceRank,
  STEADY_THRESHOLD,
} from '@/lib/latestRun';

// 首页"最近跑步" — 三段等宽：这一次 / 同类型对比 / 周节律。
//
// 取代原先的 20 条流水列表。20 条同构记录本身不承载信息 (没人会读第 14 条
// 跑了多少公里),真正被看的只有最新一次;而"这次算好还是一般"需要参照系，
// 列表给不了。三段各答一问：跑了什么、比同类如何、最近还在跑吗。
//
// 三段等宽而非左重右轻：每段都是独立问题，没有主次。

interface Props {
  activities: Activity[];
  weeks?: number;
}

// 分段柱：越快 (秒数越小) 柱越高，与"跑得好"的直觉一致。
// 单段或全程同配速时 range 为 0，统一给中位高度，避免除零后全为满格。
const barHeights = (splits: number[]): number[] => {
  if (!splits.length) return [];
  const lo = Math.min(...splits);
  const hi = Math.max(...splits);
  const range = hi - lo;
  return splits.map((p) => (range ? 20 + ((hi - p) / range) * 80 : 60));
};

const SectionLabel = ({
  children,
  aux,
}: {
  children: ReactNode;
  aux?: ReactNode;
}) => (
  <p className="flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
    <span>{children}</span>
    {aux && <span className="tnum normal-case tracking-normal">{aux}</span>}
  </p>
);

const LatestRunPanel = ({ activities, weeks = 8 }: Props) => {
  const run = latestRun(activities);
  if (!run) return null;

  const { place, workout } = splitRunName(run.name);
  const pace = paceSeconds(run);
  const splits = splitSeconds(run);
  const bars = barHeights(splits);
  const peers = comparePeers(run, activities);
  const range = splitRange(run);
  const durSec = durationToSeconds(run.moving_time);

  // 锚点日 = 最新一次跑步当天，不依赖 Date.now(),与首页其它模块口径一致
  const anchor = run.start_date_local.slice(0, 10);
  const weekBuckets = weeklyVolume(activities, weeks);
  const maxWeekKm = Math.max(...weekBuckets.map((w) => w.km), 0);
  const thisWeek = weekBuckets.length
    ? weekBuckets[weekBuckets.length - 1].km
    : 0;
  const avgWeek = weekBuckets.length
    ? weekBuckets.reduce((s, w) => s + w.km, 0) / weekBuckets.length
    : 0;

  // 无同类型参照时退回全体排名 —— 只说"配速很稳"读者无从判断快慢，
  // 缺的正是相对水平这一维。
  const rank = peers ? null : paceRank(run, activities);
  const steady = range != null && range <= STEADY_THRESHOLD;

  const dateText = anchor.replace(/-/g, ' · ');
  const timeText = run.start_date_local.slice(11, 16);

  return (
    <div className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] lg:grid-cols-3">
      {/* 1 — 这一次 */}
      <section className="border-b border-[var(--color-line)] p-5 lg:border-b-0 lg:border-r">
        <p className="flex items-center gap-2 font-mono text-[11px] text-[var(--color-ink-3)]">
          <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent-solid)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
            最新
          </span>
          <span className="tnum">
            {dateText} {timeText}
          </span>
        </p>

        <div className="mt-3 flex items-baseline gap-2.5">
          <Link
            to={`/runs/${run.run_id}`}
            className="text-lg font-bold tracking-tight hover:text-[var(--color-accent)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {place}
          </Link>
          {workout && (
            <span className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-card-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-ink-2)]">
              {workout}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end gap-1.5 leading-[0.8]">
          <span
            className="tnum text-[40px] font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {toKm(run.distance).toFixed(1)}
          </span>
          <span className="pb-1 text-sm font-semibold text-[var(--color-ink-3)]">
            km
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-4">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
              配速
            </dt>
            <dd className="tnum mt-1 font-mono text-[15px] font-bold">
              {pace ? `${formatPace(pace)}/km` : '--'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
              用时
            </dt>
            <dd className="tnum mt-1 font-mono text-[15px] font-bold">
              {durSec ? formatClock(durSec) : '--'}
            </dd>
          </div>
        </dl>
      </section>

      {/* 2 — 同类型对比;无参照时退回分段配速图 */}
      <section className="border-b border-[var(--color-line)] p-5 lg:border-b-0 lg:border-r">
        {peers ? (
          <>
            <SectionLabel aux={`${peers.sample} 次历史`}>
              对比同类「{peers.workout}」
            </SectionLabel>
            <dl className="mt-4 flex flex-col gap-3.5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  本次配速
                </dt>
                <dd className="tnum mt-1 flex items-baseline gap-2 font-mono text-[15px] font-bold">
                  {pace ? formatPace(pace) : '--'}
                  {peers.paceDelta !== 0 && (
                    <span
                      className={`text-[11px] font-medium ${
                        peers.paceDelta > 0
                          ? 'text-[var(--color-z1-ink)]'
                          : 'text-[var(--color-accent)]'
                      }`}
                    >
                      {peers.paceDelta > 0 ? '快' : '慢'}{' '}
                      {Math.abs(peers.paceDelta)} 秒
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  历史均配
                </dt>
                <dd className="tnum mt-1 font-mono text-[15px] font-bold text-[var(--color-ink-3)]">
                  {formatPace(peers.peerPace)}
                </dd>
              </div>
              {peers.hrDelta != null && run.average_heartrate && (
                <>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                      本次心率
                    </dt>
                    <dd className="tnum mt-1 flex items-baseline gap-2 font-mono text-[15px] font-bold">
                      {run.average_heartrate}
                      {peers.hrDelta !== 0 && (
                        <span
                          className={`text-[11px] font-medium ${
                            peers.hrDelta > 0
                              ? 'text-[var(--color-z1-ink)]'
                              : 'text-[var(--color-ink-3)]'
                          }`}
                        >
                          {peers.hrDelta > 0 ? '低' : '高'}{' '}
                          {Math.abs(peers.hrDelta)}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                      历史均心率
                    </dt>
                    <dd className="tnum mt-1 font-mono text-[15px] font-bold text-[var(--color-ink-3)]">
                      {peers.peerHr}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </>
        ) : (
          <>
            <SectionLabel
              aux={rank ? `第 ${rank.rank} / ${rank.total}` : undefined}
            >
              {bars.length ? '每公里配速' : '本次概况'}
            </SectionLabel>
            {bars.length ? (
              <>
                <div className="mt-4 flex h-[52px] items-end gap-[3px]">
                  {bars.map((h, i) => (
                    <i
                      key={i}
                      className="block flex-1 rounded-t-[2px] bg-[var(--color-accent)]"
                      style={{
                        height: `${h}%`,
                        opacity: splits[i] === Math.min(...splits) ? 1 : 0.45,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-[var(--color-ink-3)]">
                  <span>1 km</span>
                  <span>{splits.length} km</span>
                </div>
              </>
            ) : (
              <p className="mt-4 font-mono text-xs text-[var(--color-ink-3)]">
                暂无分段数据
              </p>
            )}
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-4">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  平均心率
                </dt>
                <dd className="tnum mt-1 font-mono text-[15px] font-bold">
                  {run.average_heartrate || '--'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
                  步频
                </dt>
                <dd className="tnum mt-1 font-mono text-[15px] font-bold">
                  {run.average_cadence || '--'}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {/* 3 — 周节律 */}
      <section className="bg-[var(--color-card-2)] p-5">
        <SectionLabel>近 {weekBuckets.length} 周 · 周跑量</SectionLabel>
        <div className="mt-4 flex h-[54px] items-end gap-[5px]">
          {weekBuckets.map((w, i) => (
            <span
              key={w.weekStart}
              className="flex h-full flex-1 flex-col justify-end"
            >
              <i
                className="block rounded-t-[2px] bg-[var(--color-accent)]"
                style={{
                  height: `${maxWeekKm ? Math.max((w.km / maxWeekKm) * 100, 4) : 4}%`,
                  opacity: i === weekBuckets.length - 1 ? 1 : 0.3,
                }}
              />
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9px] text-[var(--color-ink-3)]">
          <span>{weekBuckets[0]?.weekStart.slice(5).replace('-', '/')}</span>
          <span>本周</span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-4">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
              本周
            </dt>
            <dd className="tnum mt-1 font-mono text-[15px] font-bold">
              {thisWeek.toFixed(1)}{' '}
              <span className="text-[11px] font-normal text-[var(--color-ink-3)]">
                km
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">
              周均
            </dt>
            <dd className="tnum mt-1 font-mono text-[15px] font-bold">
              {avgWeek.toFixed(1)}{' '}
              <span className="text-[11px] font-normal text-[var(--color-ink-3)]">
                km
              </span>
            </dd>
          </div>
        </dl>

        {steady && (
          <p className="tnum mt-4 font-mono text-[11px] text-[var(--color-ink-2)]">
            本次全程配速很稳 · 波动 {range} 秒
          </p>
        )}
      </section>
    </div>
  );
};

export default LatestRunPanel;
