import Spinner from './Spinner.jsx';

// A button with a consistent look. `variant` picks the style,
// `loading` shows a spinner and blocks clicks. Any other prop
// (onClick, disabled, type, ...) is forwarded to the real <button>.
export default function Button({
  variant = 'primary',
  loading = false,
  block = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    block ? 'ui-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Spinner invert={variant === 'primary' || variant === 'danger-solid'} />}
      {children}
    </button>
  );
}
