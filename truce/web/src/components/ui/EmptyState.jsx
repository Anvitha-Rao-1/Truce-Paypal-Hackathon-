// Shown when a list or panel has nothing to display.
// `icon` is an emoji/char, with a title, message and optional action.
export default function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon" aria-hidden="true">{icon}</div>
      {title && <div className="ui-empty__title">{title}</div>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
