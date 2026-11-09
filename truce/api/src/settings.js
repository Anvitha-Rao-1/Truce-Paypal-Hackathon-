const ALLOWED_TYPES = ['REFUND', 'REFUND_WITH_RETURN'];

export function validateSettings({ scopeText, limits }) {
  const errors = [];

  if (scopeText !== undefined) {
    if (typeof scopeText !== 'string') {
      errors.push('Scope must be a string');
    } else if (scopeText.length > 2000) {
      errors.push('Scope cannot exceed 2000 characters');
    }
  }

  if (limits !== undefined) {
    if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
      errors.push('Limits must be an object');
    } else {
      const { floor_pct, ceiling_pct, step_pct, allowed_types, auto_send } = limits;

      for (const [name, value] of Object.entries({
        floor_pct,
        ceiling_pct,
        step_pct,
      })) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors.push(`${name} must be a finite number`);
        }
      }

      if (typeof floor_pct === 'number' && (floor_pct < 0 || floor_pct > 100)) {
        errors.push('Floor must be between 0 and 100');
      }

      if (typeof ceiling_pct === 'number' && (ceiling_pct < 0 || ceiling_pct > 100)) {
        errors.push('Ceiling must be between 0 and 100');
      }

      if (typeof step_pct === 'number' && (step_pct <= 0 || step_pct > 100)) {
        errors.push('Step must be greater than 0 and at most 100');
      }

      if (
        typeof floor_pct === 'number' &&
        typeof ceiling_pct === 'number' &&
        floor_pct > ceiling_pct
      ) {
        errors.push('Floor cannot be above the ceiling');
      }

      if (
        !Array.isArray(allowed_types) ||
        allowed_types.length === 0 ||
        allowed_types.some((type) => !ALLOWED_TYPES.includes(type))
      ) {
        errors.push('Allowed offer types are invalid');
      }

      if (typeof auto_send !== 'boolean') {
        errors.push('auto_send must be a boolean');
      }
    }
  }

  return { ok: errors.length === 0, errors };
}