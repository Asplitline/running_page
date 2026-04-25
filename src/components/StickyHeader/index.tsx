import { ReactNode, useEffect, useRef, useState } from 'react';

interface StickyHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  secondary?: ReactNode;
  className: string;
  innerClassName: string;
  titleClassName?: string;
  actionsClassName?: string;
  secondaryClassName?: string;
  compactClassName?: string;
  compactThreshold?: number;
  compactDebounceMs?: number;
  enableCompact?: boolean;
}

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ');

const StickyHeader = ({
  title,
  actions,
  secondary,
  className,
  innerClassName,
  titleClassName,
  actionsClassName,
  secondaryClassName,
  compactClassName,
  compactThreshold = 28,
  compactDebounceMs = 40,
  enableCompact = true,
}: StickyHeaderProps) => {
  const [compact, setCompact] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enableCompact) {
      return;
    }

    const compactHysteresis = 10;

    const updateCompactState = () => {
      setCompact((currentCompact) => {
        const nextScrollY = window.scrollY;

        if (currentCompact) {
          return nextScrollY > compactThreshold - compactHysteresis;
        }

        return nextScrollY > compactThreshold + compactHysteresis;
      });
    };

    const onScroll = () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        updateCompactState();
        debounceTimerRef.current = null;
      }, compactDebounceMs);
    };

    updateCompactState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      window.removeEventListener('scroll', onScroll);
    };
  }, [compactDebounceMs, compactThreshold, enableCompact]);

  return (
    <div className={joinClasses(className, compact && compactClassName)}>
      <div className={innerClassName}>
        <div className={titleClassName}>{title}</div>
        {secondary ? (
          <div className={secondaryClassName}>{secondary}</div>
        ) : null}
        {actions ? <div className={actionsClassName}>{actions}</div> : null}
      </div>
    </div>
  );
};

export default StickyHeader;
