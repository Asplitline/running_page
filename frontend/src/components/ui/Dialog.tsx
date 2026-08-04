import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

// Radix Dialog 薄封装 — 年度总结/详情弹窗用。焦点陷阱/Esc 由 Radix 提供。

interface DialogProps {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
}

export const Dialog = ({ trigger, title, children }: DialogProps) => (
  <RadixDialog.Root>
    <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-soft)] outline-none">
        <RadixDialog.Title className="text-lg font-bold text-[var(--color-ink)]">
          {title}
        </RadixDialog.Title>
        <div className="mt-4">{children}</div>
        <RadixDialog.Close
          aria-label="关闭"
          className="absolute top-4 right-4 rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-ink-3)] transition-colors outline-none hover:text-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          ✕
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
