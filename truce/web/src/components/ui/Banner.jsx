// An inline message strip for error / offline / success / info states.
// Optional `onClose` shows a dismiss (×) button.
export default function Banner({ tone = 'info', children, onClose }) {
  return (
    <div className={`ui-banner ui-banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="ui-banner__body">{children}</div>
      {onClose && (
        <button className="ui-banner__close" onClick={onClose} aria-label="Dismiss">×</button>
      )}
    </div>
  );
}
