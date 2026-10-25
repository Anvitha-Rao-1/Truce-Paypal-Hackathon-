// A labelled wrapper for a form control. You pass the actual input
// as children, so it works for text, number, textarea, etc.:
//
//   <Field label="Opening offer %" hint="10% of the amount">
//     <input className="ui-input" type="number" ... />
//   </Field>
//
export default function Field({ label, hint, htmlFor, children }) {
  return (
    <label className="ui-field" htmlFor={htmlFor}>
      {label && <span className="ui-field__label">{label}</span>}
      {children}
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
