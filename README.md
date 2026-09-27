# Reward receipt viewer

A local-first, single-page viewer for observed ERC-20 transfer receipts. Paste a JSON array of
receipts, and the page deduplicates them, hides test networks by default, shows exact per-token
totals and lets you export the result. Everything runs in the browser: no backend, no wallet
connection, no signatures, no transactions, no network requests.

Receipts are labeled throughout as **observed transfers**. A Transfer event shows that tokens
moved; it does not prove that a job paid a reward.

## Input format

Paste a JSON array (or the viewer's own JSON export, which wraps the array in `{ "receipts": [] }`)
of objects with these fields:

| Field          | Type                              | Notes                                                       |
| -------------- | --------------------------------- | ----------------------------------------------------------- |
| `chainId`      | positive integer                  | `11155111` (Sepolia) is excluded by default                 |
| `txHash`       | `0x` + 64 hex characters          | compared case-insensitively                                 |
| `logIndex`     | integer ≥ 0                       |                                                             |
| `tokenAddress` | `0x` + 40 hex characters          | totals group by chain + address, case-insensitively         |
| `decimals`     | integer 0–255                     |                                                             |
| `from`, `to`   | `0x` + 40 hex characters          |                                                             |
| `value`        | **decimal string** (or `0x` hex)  | raw token units; a JSON number is accepted only if it is a safe integer |
| `timestamp`    | integer Unix **seconds**          | millisecond values are rejected with a hint                 |

Rules the viewer applies:

- **Deduplication**: items with the same `chainId` + lowercase `txHash` + `logIndex` collapse to
  the first occurrence. If a dropped duplicate had different content, the import succeeds and a
  warning lists the conflicting items.
- **Exact arithmetic**: values are parsed as `BigInt`. Totals never pass through a JavaScript
  `Number`, so amounts above 2^53 stay exact. Formatted amounts are exact decimal strings, and the
  raw integer is shown alongside.
- **Validation**: the import is all-or-nothing. Every invalid item and field is listed with its
  1-based position and how to fix it. A value written as a JSON number that has already lost
  precision is rejected with an instruction to write it as a string.
- **Chain filter**: every chain found in the data appears as a checkbox. Sepolia starts unchecked.
  Totals and exports only include checked chains.
- **Persistence**: imported receipts and chain choices are stored in `localStorage` under
  `reward-receipt-viewer:v1`, so a refresh restores the same view. "Clear receipts" asks for
  confirmation, then removes them.
- **Export**: "Download JSON" writes the shown receipts, per-token totals (as exact integer
  strings), the chain filter and a `mockData` flag. "Download CSV" writes the shown receipts.

### Sample data

"Load sample data" imports six **mock** receipts (`src/data/sample.ts`). Hashes, addresses and
amounts are invented. The set contains two distinct transfers in one transaction, one exact
duplicate, one Sepolia transfer, and a value of `123456789012345678901234567` raw units, which is
far above `Number.MAX_SAFE_INTEGER`. While the sample is loaded, a "Mock data" badge sits next to
the results heading, the status line says so, and the JSON export carries `"mockData": true`.

## Install, preview, rebuild

Requires Node 20.19 or newer (built with Node 24.9 and npm 11.6).

```sh
npm ci            # install from package-lock.json
npm run dev       # Vite dev server with hot reload
npm run typecheck # tsc --noEmit
npm test          # vitest: parsing, dedupe, BigInt totals, validation, export
npm run build     # production export to dist/
npm run preview   # serve the built dist/ locally
npm run check     # typecheck + test + build
```

`dist/` is committed on purpose: the publisher serves it as-is and does not rebuild. After any
source change, run `npm run build` and commit the new `dist/`.

## Publish

`vite.config.ts` sets `base: './'`, so `dist/index.html` references its assets with relative URLs
(`./assets/...`). The folder can be dropped on any static host, at any subpath, including IPFS
gateways and ENS names. There is one page and no client-side routing, so no rewrite rules are
needed. Upload the contents of `dist/`; nothing else is required at run time.

## Project layout

```
index.html                 Vite entry
src/main.tsx               React bootstrap
src/App.tsx                page state, persistence, sections
src/components/            ImportPanel, ChainFilter, TotalsTable, TransfersTable, ExportPanel, EmptyState
src/lib/receipts.ts        validation, dedupe, BigInt totals, formatting
src/lib/receipts.test.ts   unit tests
src/lib/chains.ts          chain names and the default-exclusion rule
src/lib/storage.ts         localStorage persistence
src/lib/export.ts          JSON and CSV export
src/data/sample.ts         mock sample receipts
src/styles.css             design tokens and all styles
dist/                      committed production export
DESIGN.md                  implemented design system
TESTING.md                 test report and Better Interface review (copy in artifacts/validation.md)
```

## Validation summary

Commands run on the final source (details, findings and limitations in `TESTING.md`):

| Check                                     | Result                          |
| ----------------------------------------- | ------------------------------- |
| `npm run typecheck`                       | exit 0                          |
| `npm test` (vitest)                       | 20 passed                       |
| `npm run build`                           | exit 0, relative asset URLs     |
| Browser script against served `dist/`     | 82/82 checks at 1280, 390, 320  |

The browser script served `dist/` under a `/preview/` subpath and drove headless Chromium through
Playwright: empty, sample, filter-empty and error states; JSON and CSV downloads; refresh
persistence; keyboard walk with visible focus rings; console and resource failures; horizontal
overflow at 1280 px, 390 px and 320 px. Not performed: screen-reader sessions, native 200 % zoom,
physical devices, and an automated accessibility audit.
