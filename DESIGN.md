# DESIGN.md — Reward receipt viewer

Extracted from the final source. Every value below is defined in `src/styles.css` unless another
path is named. Rendered behavior was confirmed in headless Chromium at 1280 px, 390 px and 320 px
(see `TESTING.md`).

## Overview

The product is a small professional tool for people who audit token transfers: paste data, read a
table, download a file. The visual character is calm and flat: a light gray page, white bordered
panels, one blue accent used only for the primary action and focus, and amber reserved for
"this is mock data / check this" warnings. Hierarchy comes from size and weight, not color.
Density is moderate: 16 px body text, 14 px tables, 44 px controls.

System-wide rules: one page, one `<h1>`, sections as bordered panels stacked vertically with a
24 px gap, one filled button per view, tokens referenced only through their semantic names. The
specific stack of Import → Filters → Observed transfers → Export is this page's arrangement, not a
rule for future pages.

## Colors

Two tiers in `src/styles.css:7-47`. Primitives are named by hue; components only use the semantic
tokens.

| Semantic token               | Primitive     | Value     | Job                                              |
| ---------------------------- | ------------- | --------- | ------------------------------------------------ |
| `--color-bg-page`            | `--gray-50`   | `#f6f7f9` | page background                                  |
| `--color-bg-surface`         | `--gray-0`    | `#ffffff` | panels, inputs, buttons, table body              |
| `--color-bg-subtle`          | `--gray-100`  | `#eceef2` | table header, button hover, neutral badge        |
| `--color-bg-accent-subtle`   | `--blue-50`   | `#eaf0fb` | reserved for accent tints (currently unused)     |
| `--color-text`               | `--gray-900`  | `#151922` | body text                                        |
| `--color-text-secondary`     | `--gray-500`  | `#5f6675` | hints, captions, muted table cells, placeholders |
| `--color-text-on-accent`     | `--gray-0`    | `#ffffff` | text on the filled primary button                |
| `--color-border`             | `--gray-200`  | `#d9dce3` | structural borders: panels, table rules          |
| `--color-border-control`     | `--gray-400`  | `#8b92a1` | borders on interactive controls (textarea, buttons) |
| `--color-accent`             | `--blue-600`  | `#2b5ccb` | primary button fill, checkbox accent, skip link  |
| `--color-accent-hover`       | `--blue-700`  | `#234ba8` | primary button hover                             |
| `--color-focus`              | `--blue-600`  | `#2b5ccb` | focus ring                                       |
| `--color-error-text/bg/border` | red 700/50/200 | `#a8201a` / `#fdeeed` / `#f2b8b5` | import failure notice, invalid textarea border |
| `--color-warning-text/bg/border` | amber 800/50/300 | `#6f4a00` / `#fff5dc` / `#f0c860` | "Mock data" badge, "Decimals differ" badge, duplicate-conflict notice |
| `--color-badge-text`         | `--gray-700`  | `#343a47` | neutral badge text ("Test network")              |

Notation is hex throughout; keep it that way. There is no dark theme and no success ramp: the
product renders neither, so neither token set exists.

Measured WCAG 2 contrast (computed from the declared pairs; the page has no overlays or images):

| Pair                                        | Ratio   |
| ------------------------------------------- | ------- |
| text `#151922` on surface `#ffffff`         | 17.59:1 |
| text on page `#f6f7f9`                      | 16.41:1 |
| secondary text `#5f6675` on surface         | 5.76:1  |
| secondary text on subtle `#eceef2`          | 4.96:1  |
| white on accent `#2b5ccb`                   | 6.01:1  |
| white on accent hover `#234ba8`             | 7.94:1  |
| error text `#a8201a` on error bg `#fdeeed`  | 6.45:1  |
| warning text `#6f4a00` on warning bg `#fff5dc` | 7.29:1 |
| badge text `#343a47` on subtle              | 9.81:1  |
| control border `#8b92a1` on surface (non-text, needs 3:1) | 3.12:1 |
| focus ring `#2b5ccb` on surface / page (non-text) | 6.01:1 / 5.60:1 |

The focus ring is drawn with `outline-offset: 2px` (`src/styles.css:342-345`) so it sits on the
surrounding surface rather than on the button it outlines; on the filled primary button the ring
is therefore blue on white, not blue on blue. Structural borders (`#d9dce3`, 1.37:1) are
decorative grouping and intentionally light; controls use the darker control border.

## Typography

System fonts only, no font files (`src/styles.css:49-50`):

- Sans: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Mono: `ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace` for hashes,
  addresses, raw integers and the JSON textarea (`.mono`, `.textarea`).

Scale (`--text-*`, rem-based, `src/styles.css:51-56`):

| Token         | Size | Used for                                       | Weight | Line-height |
| ------------- | ---- | ---------------------------------------------- | ------ | ----------- |
| `--text-2xl`  | 28px | `h1`, letter-spacing −0.01em                   | 700    | 1.15        |
| `--text-xl`   | 22px | `h2` panel headings                            | 650    | 1.15        |
| `--text-lg`   | 18px | `h3` ("Totals per token", "Transfers"), empty-state title | 600 | 1.15 |
| `--text-base` | 16px | body, lede, labels, buttons, textarea          | 400/600 | 1.55       |
| `--text-sm`   | 14px | hints, table cells, notices, status, footer    | 400/500 | 1.55       |
| `--text-xs`   | 12px | eyebrow (uppercase, +0.06em), badges, details key/value list | 600 | 1.4 |

Rules in force: headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`; prose is capped
at `--measure: 70ch` (`.lede`, `.hint`, `.muted`, footer); numeric columns use
`font-variant-numeric: tabular-nums` (`.data-table .num`); raw integers and full hashes use
`overflow-wrap: anywhere` so they never overflow a narrow card; the textarea stays at 16 px at
every width, which avoids iOS input zoom; font smoothing is set once on `html`.

## Layout

- Container: `--container: 72rem` max-width, centered, inline padding
  `max(16px, safe-area-inset)` (`.container`, `src/styles.css:137-141`).
- Spacing: 4 px base tokens `--space-1` … `--space-12` (4, 8, 12, 16, 20, 24, 32, 48 px).
  Panels stack with a 24 px gap (`main`), panel padding 20 px (16 px under 47.9 rem), 12 px between
  adjacent buttons (`.actions`), 8 px inside a control group and 24 px between groups
  (`.checkbox-list`).
- Alignment: everything shares the container's leading edge; headings, labels, hints and controls
  inside a panel share the panel's inner edge. Numeric table columns align to the trailing edge.
- Logical properties throughout (`padding-inline`, `margin-block`, `inset-inline-start`,
  `text-align: start/end`), so an RTL mirror needs no overrides.
- Breakpoint: one, at `max-width: 47.9rem` (766 px), chosen because that is where the seven-column
  transfers table stops fitting (`src/styles.css:578-649`). Below it:
  - tables become stacked cards: `thead` is visually hidden, each `td` is a two-column grid with a
    6.5 rem label column filled from `data-label`, rows get a border and 12 px spacing;
  - the `.kv` details list becomes single-column;
  - action buttons grow to fill the row (`flex: 1 1 10rem`).
- Above the breakpoint `.table-wrap` scrolls horizontally if a table ever exceeds the container,
  and shows a border with a 6 px radius.
- Verified widths: 1280 px, 390 px and 320 px, no horizontal overflow, including with a details
  disclosure open. Widths between 767 px and 1280 px were not screenshotted.

## Elevation & Depth

Deliberately flat. There are no box-shadows for elevation. Structure is carried by 1 px borders:
`--color-border` on panels, table wrappers and table rules, `--color-border-control` on inputs and
buttons, a dashed control border on the empty state. Layers: page background → white panel →
subtle-gray table header. The only inset shadow is the 1 px error emphasis on an invalid textarea.

## Shapes

- `--radius-sm: 6px` on buttons, textarea, notices, table wrappers, stacked mobile rows and the
  details summary.
- `--radius-md: 12px` on panels and the empty state.
- Badges are pills (`border-radius: 999px`).
- No clipping other than the table wrapper's overflow.

## Components

All components live in `src/components/` and are styled by classes in `src/styles.css`. None are
published as a library; reuse them by import.

**Button** — `.btn` (`src/styles.css:290-340`). 44 px min height, 16 px inline padding, weight 600,
control border, white fill. Variants: `.btn-primary` (accent fill, white text; one per view, here
"Import receipts"); `:disabled` (subtle fill, secondary text, no press scale). States: hover fill
`--color-bg-subtle` only under `@media (hover: hover)`, `:active` `scale: 0.96`, focus ring via
the global `:focus-visible`. Transitions name their properties, 150 ms, `cubic-bezier(0.2,0,0,1)`;
zero under reduced motion. Labels are verb-first, sentence case.

**Textarea** — `.textarea`, used by `ImportPanel.tsx`. Mono 16 px, control border, vertical
resize. Bound to a visible `<label for>`, described by a hint via `aria-describedby`; on failure
gets `aria-invalid="true"`, the error notice is added to `aria-describedby`, and focus returns to
it.

**Notice** — `.notice` with `.notice-error` (`role="alert"`) or `.notice-warning`
(`role="status"`). Title line plus an `.issue-list` capped at 25 items with an "And N more." line.
Errors state the item, field and fix.

**Status line** — `.status`, `role="status" aria-live="polite"`, rendered empty and stable in the
DOM so repeated announcements work (`App.tsx:177`, `ExportPanel.tsx:54`).

**Badge** — `.badge` with `.badge-mock` / `.badge-warning` (amber) and `.badge-neutral` (gray).
Text-only, never the sole carrier of meaning: the status line and the export flag repeat the
mock-data fact.

**Checkbox row** — `.checkbox-row` inside `ChainFilter.tsx`. Native checkbox, 20 px, accent
color, 44 px row, label bound with `htmlFor`. Legend and hint explain the ON state
("Chains to include").

**Data table** — `.data-table` inside `.table-wrap`, used by `TotalsTable.tsx` and
`TransfersTable.tsx`. `<th scope="col">`, `aria-labelledby` pointing at the visible `h3`, `.num`
for numeric columns, `.amount` for the bold formatted value, `.raw` for the muted exact integer.
Every cell carries `data-label` for the stacked mobile layout.

**Details disclosure** — native `<details class="details">` in the Transaction cell. Summary shows
the shortened hash and log index; open state shows a `.kv` list with the full hash, addresses and
raw value, so truncation never hides content.

**Empty state** — `EmptyState.tsx` / `.empty-state`. Title, one sentence of orientation, one
bordered action. Used for "No receipts yet" and "All receipts are hidden by the chain filter".

**Skip link** — `.skip-link`, first focusable element, appears on `:focus-visible` and targets
`<main id="main" tabindex="-1">`.

## Do's and Don'ts

- Start a new view as a `.container` holding `.panel` sections with an `h2`; keep the `h1` in the
  header only.
- Give a view exactly one `.btn-primary`. Everything else is a plain `.btn`; do not restyle a
  button as text.
- Use semantic color tokens only. Add a token if a role is missing; never reference `--gray-*` or
  `--blue-*` in a component.
- Amber means "check this / mock"; red means "the action failed"; blue means "interactive or
  focused". Do not reuse a hue for a second meaning.
- Every dynamic message goes through an existing `role="status"` element or a `role="alert"`
  notice; do not add `aria-live` regions ad hoc.
- Numbers that can change use `.num` (tabular). Hashes and addresses use `.mono` and either
  `shortHex()` with the full value reachable, or `overflow-wrap: anywhere`.
- Keep the single 47.9 rem breakpoint unless new content genuinely breaks earlier; test 320 px.
- Recipe for another page: copy `index.html`, mount a new root component that reuses `.container`,
  `.panel`, `.btn`, `.data-table` and the `ImportPanel`/`EmptyState` components, import
  `src/styles.css`, and add any new tokens to the `:root` block rather than inline values.
