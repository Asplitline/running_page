import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getActivityById } from '@/data/activities';
import type { CadenceTrend } from '@/data/types';
import {
  toKm,
  paceFromSpeed,
  formatDuration,
  formatDateDots,
} from '@/lib/format';
import { SplitPaceChart } from '@/components/charts/SplitPaceChart';
import { SplitHrChart } from '@/components/charts/SplitHrChart';
import { HrZoneBar } from '@/components/charts/HrZoneBar';
import { ElevationSummary } from '@/components/charts/ElevationSummary';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { estimateHrMax, makeZoneResolver } from '@/design/tokens';

// 站点 owner 参考年龄 (spec-design):29 → HRmax 191。无个人 max 时用估算。
const OWNER_AGE = 29;

// 步频后半程相对前半程的走向。数据层是英文枚举，展示层统一中文。
const CADENCE_DIRECTION_TEXT: Record<CadenceTrend['direction'], string> = {
  up: '后段提速',
  down: '后段下降',
  flat: '全程平稳',
};

// 单次跑步详情页 — S6 首个真实页面。森林绿意 + 真实数据。

const Kpi = ({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'pace' | 'hr';
}) => (
  <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card-2)] p-4">
    <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-ink-3)]">
      {label}
    </div>
    <div
      className="tnum mt-2 flex items-baseline gap-0.5 text-3xl font-bold tracking-tight"
      style={{
        color:
          tone === 'pace'
            ? 'var(--color-route)'
            : tone === 'hr'
              ? // accent 作 30px 数字在 card-2 上仅 2.57:1(大字门槛 3.0)，用压深版
                'var(--color-z4-ink)'
              : 'var(--color-ink)',
      }}
    >
      {value}
      {unit && (
        <span className="text-xs font-normal text-[var(--color-ink-3)]">
          {unit}
        </span>
      )}
    </div>
  </div>
);

const Card = ({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) => (
  <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)]">
    <p className="eyebrow">{eyebrow}</p>
    {children}
  </section>
);

const RunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const activity = id ? getActivityById(Number(id)) : undefined;

  if (!activity) {
    return (
      <main className="w-full px-6 py-16 sm:px-10 lg:px-16">
        <p className="eyebrow">Not Found</p>
        <h1 className="text-2xl font-bold">未找到这次跑步</h1>
        <Link
          to="/"
          className="mt-4 inline-block text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          ← 返回
        </Link>
      </main>
    );
  }

  // 心率分区判定：优先用佳明自带的分区下界，无则退回按年龄估算的 HRmax 百分比。
  // 不用 activity.max_heartrate —— 那是本次最高心率不是生理上限，当分母会把绝大多数
  // 公里段误判成 Z5 (实测 79%)。
  const resolveZone = makeZoneResolver(
    activity.hr_zones,
    estimateHrMax(OWNER_AGE)
  );

  // 除累计爬升外还有别的海拔维度时，才值得画爬升/下降对比与高度区间
  const hasElevationDetail =
    activity.min_elevation != null ||
    activity.max_elevation != null ||
    activity.elevation_loss != null;

  return (
    <TooltipProvider delayDuration={100}>
      <main className="w-full px-6 py-12 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="font-mono text-xs text-[var(--color-ink-2)] hover:text-[var(--color-accent)]"
        >
          ← 返回
        </Link>

        <header className="mt-4">
          <p className="tnum font-mono text-xs uppercase tracking-wide text-[var(--color-ink-3)]">
            {formatDateDots(activity.start_date_local)}
          </p>
          <h1
            className="mt-2 text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {activity.name}
          </h1>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Distance"
            value={String(toKm(activity.distance))}
            unit="km"
          />
          <Kpi label="Time" value={formatDuration(activity.moving_time)} />
          <Kpi
            label="Avg Pace"
            value={paceFromSpeed(activity.average_speed)}
            unit="/km"
            tone="pace"
          />
          <Kpi
            label="Avg HR"
            value={
              activity.average_heartrate
                ? String(Math.round(activity.average_heartrate))
                : '--'
            }
            unit="bpm"
            tone="hr"
          />
        </div>

        <Card eyebrow={`逐公里配速 · ${activity.split_paces?.length ?? 0} km`}>
          <SplitPaceChart
            splits={activity.split_paces ?? []}
            splitHeartRates={activity.split_heart_rates}
            resolveZone={resolveZone}
          />
        </Card>

        <Card eyebrow="逐公里心率">
          <SplitHrChart
            splits={activity.split_heart_rates ?? []}
            resolveZone={resolveZone}
          />
        </Card>

        {activity.hr_zones && activity.hr_zones.length > 0 && (
          <Card eyebrow="心率区间分布">
            <HrZoneBar zones={activity.hr_zones} />
          </Card>
        )}

        {activity.cadence_trend && (
          <Card eyebrow="步频趋势">
            {/* 内容只有两个数值 + 一个标签，限宽靠左成组，不横跨整个卡片宽度 */}
            <div className="mt-2 flex max-w-md items-center gap-8">
              <div>
                <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  前半程
                </div>
                <div className="tnum text-2xl font-bold">
                  {activity.cadence_trend.first_half}
                </div>
              </div>
              <div className="text-[var(--color-ink-3)]">→</div>
              <div>
                <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  后半程
                </div>
                <div className="tnum text-2xl font-bold">
                  {activity.cadence_trend.second_half}
                </div>
              </div>
              <div className="ml-auto rounded-[var(--radius-pill)] bg-[var(--color-card-2)] px-3 py-1 font-mono text-xs text-[var(--color-ink-2)]">
                {CADENCE_DIRECTION_TEXT[activity.cadence_trend.direction]}
              </div>
            </div>
          </Card>
        )}

        {(activity.calories != null ||
          activity.aerobic_te != null ||
          activity.anaerobic_te != null ||
          activity.avg_power != null) && (
          <Card eyebrow="训练效果">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {activity.calories != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    卡路里
                  </div>
                  <div className="tnum text-2xl font-bold">
                    {Math.round(activity.calories)}
                  </div>
                </div>
              )}
              {activity.aerobic_te != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    有氧 TE
                  </div>
                  <div className="tnum text-2xl font-bold">
                    {activity.aerobic_te}
                  </div>
                </div>
              )}
              {activity.anaerobic_te != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    无氧 TE
                  </div>
                  <div className="tnum text-2xl font-bold">
                    {activity.anaerobic_te}
                  </div>
                </div>
              )}
              {activity.avg_power != null && (
                <div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                    平均功率
                  </div>
                  <div className="tnum text-2xl font-bold">
                    {Math.round(activity.avg_power)}
                    <span className="text-xs font-normal text-[var(--color-ink-3)]">
                      W
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 海拔：ElevationSummary 会把缺失的下降/区间按 0 画出来，等于把「没有数据」
            展示成「数据是 0」。当前佳明同步链路只产出 elevation_gain(下降与高度区间
            恒空)，故只有真拿到多个维度时才交给它，单一维度直接当指标展示。 */}
        {hasElevationDetail ? (
          <Card eyebrow="海拔">
            <ElevationSummary
              minElevation={activity.min_elevation ?? null}
              maxElevation={activity.max_elevation ?? null}
              elevationGain={activity.elevation_gain}
              elevationLoss={activity.elevation_loss ?? null}
            />
          </Card>
        ) : (
          activity.elevation_gain != null && (
            <Card eyebrow="海拔">
              <div className="mt-2">
                <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
                  累计爬升
                </div>
                <div className="tnum mt-1 text-2xl font-bold">
                  {Math.round(activity.elevation_gain)}
                  <span className="ml-0.5 text-xs font-normal text-[var(--color-ink-3)]">
                    m
                  </span>
                </div>
              </div>
            </Card>
          )
        )}
      </main>
    </TooltipProvider>
  );
};

export default RunDetail;
