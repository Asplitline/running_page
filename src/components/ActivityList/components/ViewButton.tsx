import styles from '../style.module.css';

interface ViewButtonProps {
  isActive: boolean;
  label: string;
  onClick: () => void;
}

const ViewButton = ({ isActive, label, onClick }: ViewButtonProps) => (
  <button
    type="button"
    className={`${styles.viewButton} ${isActive ? styles.viewButtonActive : ''}`}
    onClick={onClick}
    aria-pressed={isActive}
  >
    <span className={styles.viewButtonLabel}>{label}</span>
  </button>
);

export default ViewButton;
