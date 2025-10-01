import styles from '../styles/Loading.module.scss';

export default function Loading({ className = '' }) {
  return (
    <div className={`${styles.loadingContainer} ${className ? styles[className] : ''}`}>
      <div className={styles.loader}>
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
      </div>
    </div>
  );
}