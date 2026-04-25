import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './style.module.css';

interface SiteLogoProps {
  className?: string;
  imageClassName?: string;
  to?: string;
}

const SiteLogo = ({ className, imageClassName, to }: SiteLogoProps) => {
  const { logo, siteUrl } = useSiteMetadata();

  return (
    <Link to={to ?? siteUrl} className={className ?? styles.logoLink}>
      <picture>
        <img className={imageClassName ?? styles.logo} alt="logo" src={logo} />
      </picture>
    </Link>
  );
};

export default SiteLogo;
