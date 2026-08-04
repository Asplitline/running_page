import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

// Radix Tooltip 薄封装 — 心率区间/指标说明用。内置 floating-ui 防溢出。

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => (
  <RadixTooltip.Root>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        sideOffset={6}
        className="z-50 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-[var(--color-ink)] shadow-[var(--shadow-soft)]"
      >
        {content}
        <RadixTooltip.Arrow className="fill-[var(--color-card)]" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
);

// 应用根部包一次即可
export const TooltipProvider = RadixTooltip.Provider;
