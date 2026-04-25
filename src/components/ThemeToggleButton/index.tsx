import { useTheme } from '@/hooks/useTheme';
import { IS_CHINESE } from '@/utils/const';

interface ThemeToggleButtonProps {
  className: string;
  iconClassName?: string;
}

const ThemeToggleButton = ({
  className,
  iconClassName,
}: ThemeToggleButtonProps) => {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const label = IS_CHINESE
    ? nextTheme === 'light'
      ? '切换到浅色主题'
      : '切换到深色主题'
    : nextTheme === 'light'
      ? 'Switch to light theme'
      : 'Switch to dark theme';

  return (
    <button
      type="button"
      className={className}
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <span className={iconClassName} aria-hidden>
        {theme === 'dark' ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2.25V4.5M12 19.5V21.75M4.5 12H2.25M21.75 12H19.5M5.636 5.636L7.227 7.227M16.773 16.773L18.364 18.364M18.364 5.636L16.773 7.227M7.227 16.773L5.636 18.364M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.752 15.014C20.597 15.496 19.33 15.762 18 15.762C12.6152 15.762 8.25 11.3968 8.25 6.01202C8.25 4.68242 8.51614 3.41499 8.99806 2.26008C5.47566 3.72988 3 7.20684 3 11.262C3 16.6468 7.36522 21.012 12.75 21.012C16.8052 21.012 20.2821 18.5363 21.752 15.014Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
};

export default ThemeToggleButton;
