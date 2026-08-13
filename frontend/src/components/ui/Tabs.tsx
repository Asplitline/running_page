import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

// Radix Tabs 薄封装 — 视觉走 spec-design token，行为/a11y 由 Radix 提供。
// 用于日/周/月/年 + 视图切换。

export interface TabItem {
  value: string;
  label: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode; // 各 <Tabs.Panel value=...>
  ariaLabel: string;
}

export const Tabs = ({
  items,
  value,
  onValueChange,
  children,
  ariaLabel,
}: TabsProps) => (
  <RadixTabs.Root value={value} onValueChange={onValueChange}>
    <RadixTabs.List
      aria-label={ariaLabel}
      className="flex gap-1 rounded-[var(--radius-pill)] bg-[var(--color-card-2)] p-1"
    >
      {items.map((item) => (
        <RadixTabs.Trigger
          key={item.value}
          value={item.value}
          className="flex-1 rounded-[var(--radius-pill)] px-4 py-2 font-mono text-sm text-[var(--color-ink-2)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] data-[state=active]:bg-[var(--color-card)] data-[state=active]:text-[var(--color-ink)] data-[state=active]:shadow-[var(--shadow-soft)]"
        >
          {item.label}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
    {children}
  </RadixTabs.Root>
);

const Panel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RadixTabs.Content value={value} className="mt-4 outline-none">
    {children}
  </RadixTabs.Content>
);

Tabs.Panel = Panel;
