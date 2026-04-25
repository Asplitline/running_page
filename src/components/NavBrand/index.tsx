import { Link } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';

interface NavBrandProps {
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
  titleAs?: 'h1' | 'span';
  to?: string;
}

const NavBrand = ({
  className,
  logoClassName,
  titleClassName,
  titleAs = 'span',
  to,
}: NavBrandProps) => {
  const { logo, siteTitle, siteUrl } = useSiteMetadata();
  const TitleTag = titleAs;

  return (
    <Link to={to ?? siteUrl} className={className}>
      <img className={logoClassName} alt="logo" src={logo} />
      <TitleTag className={titleClassName}>{siteTitle}</TitleTag>
    </Link>
  );
};

export default NavBrand;
