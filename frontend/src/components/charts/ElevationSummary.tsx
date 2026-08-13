// 海拔汇总 (详情页用)。数据只有单次跑步的汇总统计(无逐点轨迹)，
// 因此不画逐米剖面曲线，改用海拔区间刻度 + 爬升/下降对比条。

interface Props {
  minElevation: number | null;
  maxElevation: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
}

export const ElevationSummary = ({
  minElevation,
  maxElevation,
  elevationGain,
  elevationLoss,
}: Props) => {
  const hasRange = minElevation != null && maxElevation != null;
  const hasUpDown = elevationGain != null || elevationLoss != null;

  if (!hasRange && !hasUpDown) {
    return <p className="text-sm text-[var(--color-ink-3)]">无海拔数据</p>;
  }

  const gain = elevationGain ?? 0;
  const loss = elevationLoss ?? 0;
  const maxBar = Math.max(gain, loss, 1);

  return (
    <div className="flex flex-col gap-4">
      {hasRange && (
        <div>
          <div className="flex justify-between font-mono text-[11px] text-[var(--color-ink-3)]">
            <span>最低 {Math.round(minElevation!)}m</span>
            <span>最高 {Math.round(maxElevation!)}m</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--color-card-2)]">
            <div
              className="h-full rounded-full"
              style={{ width: '100%', background: 'var(--color-route)' }}
            />
          </div>
        </div>
      )}
      {hasUpDown && (
        <div className="flex items-end gap-6">
          <div>
            <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
              爬升
            </div>
            <div className="flex h-16 items-end">
              <div
                className="w-6 rounded-t-[3px]"
                style={{
                  height: `${(gain / maxBar) * 100}%`,
                  background: 'var(--color-route)',
                }}
              />
            </div>
            <div className="tnum mt-1 text-sm font-bold">
              {Math.round(gain)}m
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] text-[var(--color-ink-3)]">
              下降
            </div>
            <div className="flex h-16 items-end">
              <div
                className="w-6 rounded-t-[3px]"
                style={{
                  height: `${(loss / maxBar) * 100}%`,
                  background: 'var(--color-accent)',
                }}
              />
            </div>
            <div className="tnum mt-1 text-sm font-bold">
              {Math.round(loss)}m
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
