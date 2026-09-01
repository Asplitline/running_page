import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

// Radix Tabs 薄封装 — 视觉走 spec-design token，行为/a11y 由 Radix 提供。
// variant 用来拉开嵌套层级：外层用 pill(实心分段开关)，内层用 underline(轻量筛选)。

export interface TabItem {
  value: string;
  label: ReactNode;
}

type TabsVariant = 'pill' | 'underline';

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode; // 各 <Tabs.Panel value=...>
  ariaLabel: string;
  variant?: TabsVariant;
  // 是否平分容器宽度。默认 false，按内容宽度收窄，避免少量 tab 被拉成大色块。
  fill?: boolean;
  className?: string;
  // 与 tab 条同排的左侧内容(如页面标题)，用来省掉一整行垂直空间。
  leading?: ReactNode;
  // leading 存在时包裹「leading + tab 条」这一行的布局类。
  listRowClassName?: string;
}

const LIST_CLASS: Record<TabsVariant, string> = {
  pill: 'inline-flex gap-1 rounded-[var(--radius-pill)] bg-[var(--color-card-2)] p-1',
  underline: 'inline-flex gap-2 border-b border-[var(--color-line)] pb-0',
};

const TRIGGER_CLASS: Record<TabsVariant, string> = {
  pill: 'rounded-[var(--radius-pill)] px-5 py-1.5 font-mono text-[13px] text-[var(--color-ink-2)] outline-none transition-colors hover:text-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] data-[state=active]:bg-[var(--color-card)] data-[state=active]:font-semibold data-[state=active]:text-[var(--color-ink)] data-[state=active]:shadow-[var(--shadow-soft)]',
  underline:
    '-mb-px border-b-2 border-transparent px-3 pb-2.5 font-mono text-[13px] tracking-wide text-[var(--color-ink-3)] outline-none transition-colors hover:text-[var(--color-ink-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] data-[state=active]:border-[var(--color-accent)] data-[state=active]:font-semibold data-[state=active]:text-[var(--color-ink)]',
};

export const Tabs = ({
  items,
  value,
  onValueChange,
  children,
  ariaLabel,
  variant = 'pill',
  fill = false,
  className = '',
  leading,
  listRowClassName = '',
}: TabsProps) => {
  const list = (
    <RadixTabs.List
      aria-label={ariaLabel}
      className={`${LIST_CLASS[variant]}${fill ? ' flex w-full' : ''}`}
    >
      {items.map((item) => (
        <RadixTabs.Trigger
          key={item.value}
          value={item.value}
          className={`${TRIGGER_CLASS[variant]}${fill ? ' flex-1' : ''}`}
        >
          {item.label}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
  );

  return (
    <RadixTabs.Root
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {leading ? (
        <div className={listRowClassName}>
          {leading}
          {list}
        </div>
      ) : (
        list
      )}
      {children}
    </RadixTabs.Root>
  );
};

const Panel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RadixTabs.Content value={value} className="mt-4 outline-none">
    {children}
  </RadixTabs.Content>
);

Tabs.Panel = Panel;
