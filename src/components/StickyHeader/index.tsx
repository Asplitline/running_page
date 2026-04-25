import { ReactNode, useEffect, useState } from 'react';

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
  enableCompact = true,
}: StickyHeaderProps) => {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!enableCompact) {
      return;
    }

    const onScroll = () => {
      setCompact(window.scrollY > compactThreshold);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [compactThreshold, enableCompact]);

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
