import { chainName } from './chains';
import {
  formatUnits,
  isoTimestamp,
  serializeReceipt,
  type Receipt,
  type TokenTotal,
} from './receipts';

export const EXPORT_NOTE =
  'Observed ERC-20 transfer events. A transfer is not proof that it was a job reward.';

export interface ExportOptions {
  receipts: Receipt[];
  totals: TokenTotal[];
  includedChains: number[];
  excludedChains: number[];
  source: 'sample' | 'pasted';
  now?: Date;
}

export function buildJsonExport(opts: ExportOptions): string {
  const doc = {
    format: 'reward-receipt-viewer/1',
    exportedAt: (opts.now ?? new Date()).toISOString(),
    note: EXPORT_NOTE,
    mockData: opts.source === 'sample',
    chainFilter: {
      included: opts.includedChains,
      excluded: opts.excludedChains,
    },
    totals: opts.totals.map((t) => ({
      chainId: t.chainId,
      chainName: chainName(t.chainId),
      tokenAddress: t.tokenAddress,
      decimals: t.decimals,
      transfers: t.count,
      total: t.total.toString(10),
      totalFormatted: formatUnits(t.total, t.decimals, { group: false }),
    })),
    receipts: opts.receipts.map(serializeReceipt),
  };
  return JSON.stringify(doc, null, 2);
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvExport(receipts: Receipt[]): string {
  const header = [
    'chainId',
    'chainName',
    'txHash',
    'logIndex',
    'tokenAddress',
    'decimals',
    'from',
    'to',
    'value',
    'valueFormatted',
    'timestamp',
    'timestampIso',
  ];
  const rows = receipts.map((r) =>
    [
      r.chainId,
      chainName(r.chainId),
      r.txHash,
      r.logIndex,
      r.tokenAddress,
      r.decimals,
      r.from,
      r.to,
      r.value.toString(10),
      formatUnits(r.value, r.decimals, { group: false }),
      r.timestamp,
      isoTimestamp(r.timestamp),
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\r\n') + '\r\n';
}

export function exportFilename(ext: 'json' | 'csv', now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `observed-transfers-${stamp}.${ext}`;
}

/** Trigger a browser download of a text file. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
