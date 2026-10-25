# Truce Design System

PayPal-inspired fintech look for Truce, the AI dispute-negotiation dashboard.
Single source of truth for colours, type, spacing and components. All values
live as CSS variables in [`web/src/design/tokens.css`](../web/src/design/tokens.css).
Components must read tokens via `var(--token)` — never hard-code colours or sizes.

> Note: this is a **functional application dashboard**, not a PayPal marketing
> page. We borrow PayPal's *visual language* (navy + blue, white surfaces,
> restrained accents, strong contrast) and apply it to Truce's own content.
> We do not use PayPal's logo, illustrations or copy.

---

## 1. Colour tokens

### Raw palette (source values)
| Token | Hex | Use |
|---|---|---|
| `--pp-navy` | `#003087` | Deep navy — major headings, brand anchor |
| `--pp-blue` | `#0070BA` | Primary blue |
| `--pp-blue-strong` | `#0070E0` | Interactive blue — buttons, active state |
| `--pp-cyan` | `#009CDE` | Cyan accent — sparing supporting use |
| `--pp-white` | `#FFFFFF` | White |
| `--pp-neutral` | `#F0F2F9` | Light neutral surface |
| `--pp-ink` | `#0C0C0D` | Main text |
| `--pp-ink-soft` | `#545D68` | Secondary text |
| `--pp-border` | `#D4D9DC` | Borders |

### Semantic tokens (use these in components)
| Token | Resolves to | Use |
|---|---|---|
| `--color-bg` | `#F5F7FB` | Page background |
| `--color-surface` | white | Cards, panels |
| `--color-surface-sunken` | neutral | Wells, inset areas |
| `--color-text` / `--color-text-muted` | ink / ink-soft | Body / secondary text |
| `--color-brand` | navy | Headings, brand |
| `--color-primary` | interactive blue | Primary action, links, active nav |
| `--color-primary-soft` | `#E8F1FC` | Selected row tint |
| `--color-accent` | cyan | Limited accents only |

### Status colours (use only where status is genuinely semantic)
| Meaning | Text token | Soft bg token |
|---|---|---|
| Settled / success | `--color-success` | `--color-success-soft` |
| Pending / waiting | `--color-warning` | `--color-warning-soft` |
| Blocked / error | `--color-danger` | `--color-danger-soft` |
| Info / in progress | `--color-info` | `--color-info-soft` |

**Rules:** white + light-neutral surfaces dominate; navy for headings; blue for
actions/links/active; cyan sparingly; subtle borders + restrained shadows (no
gradients, neon, or glassmorphism); keep strong text contrast.

---

## 2. Typography

Font stack: `"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, sans-serif`
(PayPal Sans is proprietary; we use a clean sans fallback).

| Token | Size | Use |
|---|---|---|
| `--fs-display` | ~44px | Page headline |
| `--fs-h1` | ~30px | Section heading |
| `--fs-h2` | ~20px | Card heading |
| `--fs-body` | ~16px | Body text |
| `--fs-button` | ~15px | Button text |
| `--fs-small` | ~13px | Labels / metadata |

Weights: `--fw-regular 400`, `--fw-medium 500`, `--fw-semibold 600`, `--fw-bold 700`.
Line heights: `--lh-tight 1.2` (headings), `--lh-normal 1.5` (body).

---

## 3. Spacing, radius, shadows

- **Spacing** (4px base): `--space-1`…`--space-7` = 4, 8, 12, 16, 24, 32, 48px.
- **Radius:** `--radius-sm 8`, `--radius-md 12`, `--radius-lg 16`, `--radius-pill`.
- **Shadows:** `--shadow-sm/md/lg` — subtle only.
- **Layout:** `--container-max 1200px`, `--header-h 60px`.

---

## 4. Component kit (planned, in `web/src/components/ui/`)

Small reusable primitives so screens compose instead of repeating markup:

| Component | Purpose |
|---|---|
| `Button` | `primary` / `secondary` / `ghost` / `danger` variants, loading + disabled |
| `Card` | White surface, border, optional header |
| `Badge` | Status pill (success/warning/danger/info/neutral) |
| `StatTile` | Big number + label for the dashboard overview |
| `Field` | Labelled input / number / textarea / checkbox wrapper |
| `Spinner` | Inline loading indicator |
| `EmptyState` | Icon + message for empty lists |
| `Banner` | Inline error / offline / success message |

---

## 5. Interaction & feedback states

Every data screen must handle: **loading**, **empty**, **success**, **error**,
and **offline** (backend unreachable → fall back to mock data with a visible
"Demo data" marker). Buttons show a disabled/loading state during async work.
Focusable controls use `--focus-ring` for keyboard accessibility.

---

## 6. Responsive rules

- Mobile-first; content max width `--container-max`, centred.
- Dashboard grid collapses: 4 → 2 → 1 columns as width shrinks.
- The 3-pane app layout (list / detail / log) stacks vertically under ~900px.
- 16px minimum side gutter on small screens; no horizontal page scroll.

---

## 7. Reuse vs. redesign (current frontend assessment)

| File | Verdict |
|---|---|
| `web/src/api.js` | **Reuse as-is.** Clean API wrapper; matches backend contract. |
| `web/src/main.jsx` | **Reuse**, will import tokens + global base styles. |
| `web/src/App.jsx` | **Refactor.** Working logic stays; split into components/screens and restyle via tokens. Do not rewrite the backend wiring. |
| `web/src/styles.css` | **Replace gradually** with tokens + component styles. |
| Backend `api/`, `agents/` | **Do not touch.** API contract is fixed. |

Working features to preserve: live SSE updates, disputes list, scope + limits
form, Run agent, approve/reject, kill switch, mock-dispute creation, API log.
Missing/rough to build: dashboard overview, loading/empty/offline states,
offer ladder, reusable component kit, mock-data fallback.
