import Layout from '@/components/Layout';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './404.module.css';

const NotFoundPage = () => {
  const { siteUrl } = useSiteMetadata();
  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.lead}>This page doesn&#39;t exist.</p>
        <p className={styles.muted}>
          If you wanna more message, you could visit{' '}
          <a href={siteUrl}>{siteUrl}</a>
        </p>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
