// A white panel with a border. Optional `title` renders a header row;
// `actions` puts controls (e.g. a button) on the right of that header.
export default function Card({ title, actions, children, className = '', ...rest }) {
  return (
    <section className={`ui-card ${className}`} {...rest}>
      {(title || actions) && (
        <header className="ui-card__header">
          {title && <h2 className="ui-card__title">{title}</h2>}
          {actions && <div className="ui-card__actions">{actions}</div>}
        </header>
      )}
      <div className="ui-card__body">{children}</div>
    </section>
  );
}
