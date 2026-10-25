// A small spinning circle for loading states.
// `invert` makes it light (for use on a coloured button).
export default function Spinner({ invert = false, large = false, label }) {
  const classes = [
    'ui-spinner',
    invert ? 'ui-spinner--invert' : '',
    large ? 'ui-spinner--lg' : '',
  ].filter(Boolean).join(' ');
  return <span className={classes} role="status" aria-label={label || 'Loading'} />;
}
