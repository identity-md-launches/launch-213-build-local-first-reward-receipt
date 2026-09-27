# Test report and Better Interface review

Worker-side validation of the reward receipt viewer. This is the worker's own record, not an
independent certification. An identical copy is delivered as `artifacts/validation.md`.

## 1. Scope and assumptions

- Product: one static page (`dist/index.html` + `dist/assets/*`), built from `src/` with Vite 7,
  React 19 and TypeScript 5.9. `vite.config.ts` sets `base: './'`.
- Flows reviewed: paste/import with validation, load mock sample, chain filter (Sepolia excluded by
  default), per-token totals, transfer table with details disclosure, JSON/CSV export, refresh
  persistence, clear with confirmation, empty and filter-empty states, error states, keyboard walk.
- Inferred choices: values must be decimal strings (numbers accepted only when safe integers);
  import is all-or-nothing so totals never silently omit rows; conflicting duplicates keep the
  first item and warn; dates render in UTC; data persists in `localStorage`; the whole import is
  labeled mock while the sample is loaded.
- Out of scope: wallet connection, signatures, transactions, network fetches, theming,
  localization, animation beyond a 150 ms button transition. None were added.

## 2. Commands and results (final source)

| Command | Result |
| --- | --- |
| `npm ci` equivalent (`npm install` from the committed lockfile) | 59 packages, 0 vulnerabilities |
| `npm run typecheck` (`tsc --noEmit -p tsconfig.json`) | exit 0 |
| `npm test` (`vitest run`) | 1 file, 20 tests passed |
| `npm run build` (`vite build`) | exit 0; `dist/index.html` 0.68 kB, CSS 10.05 kB, JS 215.52 kB (67.55 kB gzip); asset URLs `./assets/...` |
| `node test/scratch/verify.mjs` (Playwright, Chromium 1246 headless, serving `dist/` at `http://127.0.0.1:<port>/preview/`) | 82/82 checks passed |

Unit tests cover: sample composition (two transfers in one tx, one exact duplicate, one Sepolia
item, values above 2^53); dedupe by chainId + lowercase txHash + logIndex, same hash on another
chain kept, conflict reporting; BigInt sums above `MAX_SAFE_INTEGER`; rejection of JSON numbers
that lost precision; hex and safe-number values; exact `formatUnits`; per-token grouping
case-insensitively with Sepolia excluded; decimals-conflict flag; document-level and per-field
validation messages; unknown fields ignored; JSON export round-trip; CSV shape.

Browser script checks, run at 1280×900 and 390×844 (each in a fresh browser context), plus 320×640
for reflow and a desktop keyboard walk:

- Empty state visible on first load; no horizontal overflow.
- "Load sample data": status reads "Imported 5 receipts. Removed 1 exact duplicate. This is mock
  sample data."; "Mock data" badge visible; Sepolia checkbox unchecked; 4 transfer rows; 3 token
  totals; USDC total 200.5; Base total rendered as `123,456,789.012345678901234567` with raw
  `123456789012345678901234567`; focus moved to the results heading.
- Checking Sepolia → 5 rows and 4 totals; unchecking restores.
- Unchecking every chain → filter-empty state, export buttons disabled; "Reset chains" restores.
- "Download JSON" produced `observed-transfers-20260927.json` containing `mockData: true`, the
  "not proof" note, 4 receipts, exact total string, excluded chain 11155111. "Download CSV"
  produced a header plus 4 rows. Both downloads announced in the export status line.
- Details disclosure reveals the full 66-character hash.
- Reload restores 5 receipts with the Sepolia override and the mock badge; status reads
  "Restored 5 receipts from this browser."
- Invalid JSON → `role="alert"` notice "Not valid JSON…", textarea `aria-invalid="true"` and
  focused, previous receipts kept. Bad items → per-item messages for `txHash`, precision-lost
  `value`, and missing fields on item 2.
- "Clear receipts": cancelling the confirm keeps data; accepting shows the empty state, which
  survives reload.
- Zero console errors or warnings; zero failed or 4xx/5xx resource requests at both widths.
- 320 px with a details row open: no horizontal overflow.
- Keyboard: first Tab lands on "Skip to content" (2 px solid `rgb(43,92,203)` ring), Enter moves
  focus to `main`; Tab order textarea → Import receipts → Load sample data, ring visible at every
  stop; Enter on "Load sample data" imports and focuses the results heading; Shift+Tab reaches the
  Sepolia checkbox and Space toggles it; a details `summary` is reachable by Tab and Enter opens it.
- `prefers-reduced-motion: reduce` → button `transition-duration: 0s`.

Screenshots (delivered under `artifacts/screenshots/`, taken from the final export):
`desktop-empty.png`, `desktop-sample.png`, `desktop-error.png`,
`desktop-focus-primary-button.png`, `mobile-390-sample.png`, `mobile-390-filter-empty.png`,
`mobile-320-sample.png`.

## 3. Better Interface coverage

| Domain | Status | Evidence and unperformed subchecks |
| --- | --- | --- |
| Accessibility | Checked | Native elements only; labels bound (`label for`, `fieldset/legend`, `th scope`, `aria-labelledby`); skip link; `:focus-visible` ring verified in screenshots and computed styles; `role="alert"` for import failure, stable `role="status"` regions; `aria-invalid` + `aria-describedby`; confirm before clearing; 44 px controls; reduced-motion guard. **Not verified:** screen-reader session, automated accessibility audit (axe or similar), native 200 % zoom (320 px reflow used instead), forced-colors rendering (only the CSS guard exists), physical touch device. |
| Layout | Checked | Panels grouped by space, one bordered surface per section; shared leading edge; logical properties throughout; single content-driven breakpoint (47.9 rem); tables stack into labeled cards below it; overflow checked at 1280/390/320. **Not verified:** RTL mirror, widths between 767 and 1280 px. |
| Writing | Checked (source) | Verb-first sentence-case buttons; errors name the item, field and fix; empty states point forward with one action; settings describe the ON state ("Chains to include"); mock and "observed, not proof" wording repeated in lede, results, footer and export. |
| Typography | Checked | Six-step rem scale, headings descend, weights ≥ 400 under 18 px; measure capped at 70ch; tabular numerals on numeric columns; `overflow-wrap: anywhere` on raw integers and full hashes; 16 px textarea at all widths; smoothing on root; `lang="en"`. Wrapping inspected in the 390/320 screenshots. |
| Colors | Checked | Two-tier hex tokens; one accent, one error ramp, one warning ramp; single filled action per view; every text pair and the control-border/focus pairs computed (table in `DESIGN.md`). **Not verified:** rendered-pixel measurement (values computed from declared solid colors; the page has no alpha layers or images, so declared equals rendered). |
| UI | Checked | Flat borders for structure, no elevation shadows; radius 6/12; press `scale(0.96)`; named transition properties at 150 ms with the prescribed easing; hover gated by `(hover: hover)`; no icons, no theme switch, no enter/exit animation (not applicable). **Not verified:** animation replay at 10 % speed. |

## 4. Findings and fixes

| # | Severity | Domain | Location | Evidence | Fix | Recheck |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Accessibility / Colors | `src/styles.css:342` | Before the first build, the planned focus ring color equalled the primary button fill (`#2b5ccb` on `#2b5ccb`, 1.00:1 computed), so the ring would be invisible on "Import receipts". | Draw the ring with `outline-offset: 2px` so it sits on the surrounding white/gray surface (6.01:1 / 5.60:1). | `desktop-focus-primary-button.png` shows a blue ring around the filled button; keyboard walk reports a 2 px solid ring at every stop. |
| 2 | MEDIUM | Colors | `src/styles.css:13`, `:36` | Planned input/button border `#b8bdc9` measured 1.88:1 on white, below the 3:1 non-text minimum. | Introduced `--gray-400 #8b92a1` as `--color-border-control` (3.12:1 on the surface it renders on). | Recomputed; textarea and buttons visibly delineated in all screenshots. |
| 3 | MEDIUM | Layout | `src/components/ImportPanel.tsx:81`, `src/App.tsx:187` | First 390 px screenshot: "Clear receipts" and "Reset chains" used a borderless variant and read as static text in the stacked action column. | Removed the quiet variant; both use the standard bordered `.btn`. | Rebuilt; `mobile-390-sample.png` shows three distinct bordered actions. |
| 4 | LOW | Verification | `src/lib/receipts.test.ts` | A first test assumed only one sample value exceeds 2^53; 1.5 WETH in raw units also does. | Test now asserts the specific value is present among the >2^53 values. | 20/20 pass. |

Remaining, not fixed: none reproduced. Structural borders (`#d9dce3`, 1.37:1) are intentionally
light grouping lines, not controls, and are left as designed.

## 5. Limitations

- **Browser tool:** the assignment's `browser` MCP tool (Playwright MCP 0.0.82) was available, but
  this environment provided no managed preview server (`test/scratch/browser/preview.json` was
  never created), module scripts do not load from `file://`, and the foreground-command rule
  forbids leaving a server running. All rendered checks therefore ran through the Playwright
  library against the same Chromium build inside one bounded script (`test/scratch/verify.mjs`)
  that starts and stops its own server. Screenshots are real captures from that run.
- Not performed: screen-reader session, automated accessibility audit, native browser zoom,
  forced-colors rendering, RTL, physical devices, hover-state screenshots, intermediate widths.
- The verifier for this task checks paths and bytes only; behavior claims above rest on the
  worker's runs.

## 6. Completion

Complete for the stated scope. Build, typecheck, unit tests and the browser script all passed on
the final source; the export in `dist/` was rebuilt after the last source change.
