// A small status pill. `tone` sets the colour; `dot` shows a leading dot.
export default function Badge({ tone = 'neutral', dot = false, children }) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {dot && <span className="ui-badge__dot" />}
      {children}
    </span>
  );
}
