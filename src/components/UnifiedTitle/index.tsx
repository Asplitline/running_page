import React from 'react';
import styles from './style.module.css';

type UnifiedTitleTag = 'h1' | 'h2';
type UnifiedTitleVariant = 'home' | 'section';

interface UnifiedTitleProps {
  as?: UnifiedTitleTag;
  href?: string;
  variant?: UnifiedTitleVariant;
  className?: string;
  children: React.ReactNode;
}

const UnifiedTitle = ({
  as: Tag = 'h2',
  href,
  variant = 'section',
  className,
  children,
}: UnifiedTitleProps) => {
  const variantClass =
    variant === 'home' ? styles.titleHome : styles.titleSection;
  const mergedClassName = [styles.titleBase, variantClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={mergedClassName}>
      {href ? <a href={href}>{children}</a> : children}
    </Tag>
  );
};

export default UnifiedTitle;
