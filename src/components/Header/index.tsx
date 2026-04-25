import useSiteMetadata from '@/hooks/useSiteMetadata';
import StickyHeader from '@/components/StickyHeader';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import SiteLogo from '@/components/SiteLogo';
import summaryHeaderStyles from '@/components/ActivityList/style.module.css';
import styles from './style.module.css';

const Header = () => {
  const { siteUrl, navLinks } = useSiteMetadata();

  return (
    <StickyHeader
      className={`${summaryHeaderStyles.overviewSticky} ${styles.homeSticky}`}
      compactClassName={summaryHeaderStyles.overviewStickyCompact}
      innerClassName={styles.homeHeaderInner}
      titleClassName={styles.homeHeaderLeft}
      secondaryClassName={styles.homeHeaderRight}
      actionsClassName={styles.homeHeaderActions}
      title={
        <SiteLogo to={siteUrl} className={styles.logoLink} imageClassName={styles.logo} />
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
