import useSiteMetadata from '@/hooks/useSiteMetadata';
import NavBrand from '@/components/NavBrand';
import StickyHeader from '@/components/StickyHeader';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import summaryHeaderStyles from '@/components/ActivityList/style.module.css';
import styles from './style.module.css';

const Header = () => {
  const { siteUrl, navLinks } = useSiteMetadata();

  return (
    <StickyHeader
      className={`${summaryHeaderStyles.overviewSticky} ${styles.homeSticky}`}
      compactClassName={`${summaryHeaderStyles.overviewStickyCompact} ${styles.homeStickyCompact}`}
      innerClassName={styles.homeHeaderInner}
      titleClassName={styles.homeHeaderLeft}
      secondaryClassName={styles.homeHeaderRight}
      actionsClassName={styles.homeHeaderActions}
      title={
        <NavBrand
          to={siteUrl}
          className={styles.brandLink}
          logoClassName={styles.logo}
          titleClassName={styles.brandTitle}
          titleAs="h1"
        />
      }
      secondary={
        <nav aria-label="Site" className={styles.navLinks}>
          {navLinks.map((n, i) => (
            <a key={i} href={n.url} className={styles.navLink}>
              {n.name}
            </a>
          ))}
        </nav>
      }
      actions={
        <ThemeToggleButton
          className={summaryHeaderStyles.themeToggleButton}
          iconClassName={summaryHeaderStyles.themeToggleIcon}
        />
      }
    />
  );
};

export default Header;
