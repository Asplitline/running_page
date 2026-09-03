// 热力图图例 — 从 HeatmapCalendar 里抽出来独立放置。
//
// 原先图例挂在热力图正下方、紧贴分割线,9px 字几乎读不到。移到标题行右侧后
// 与"坚持 · 全年热力"同一视线高度,扫一眼就知道格深代表什么。
//
// "未跑"与"未来"是两种空格子,必须各自可见且可区分:前者是中性灰绿,
// 后者更浅一档表示"还没到"。给 future 描边是因为它和页面底色差得最少,
// 无边框时在某些屏上会看不出边界。

const LEVEL_BG = [
  'var(--color-heat-0)',
  'var(--color-heat-1)',
  'var(--color-heat-2)',
  'var(--color-heat-3)',
  'var(--color-heat-4)',
  'var(--color-heat-5)',
] as const;

const Swatch = ({ bg, ring }: { bg: string; ring?: boolean }) => (
  <span
    className="block rounded-[2px]"
    style={{
      height: 9,
      width: 9,
      background: bg,
      outline: ring ? '1px solid var(--color-line)' : undefined,
      outlineOffset: ring ? -1 : undefined,
    }}
  />
);

const HeatLegend = () => (
  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-[var(--color-ink-3)]">
    <span>少</span>
    {LEVEL_BG.map((bg) => (
      <Swatch key={bg} bg={bg} />
    ))}
    <span>多</span>
    <span className="ml-1 opacity-70">· 格深 = 当日里程</span>
    <span
      className="mx-1 hidden h-2.5 w-px bg-[var(--color-line)] sm:block"
      aria-hidden="true"
    />
    <span className="flex items-center gap-1.5">
      <Swatch bg="var(--color-heat-future)" ring />
      <span className="opacity-70">未来</span>
    </span>
  </div>
);

export default HeatLegend;
