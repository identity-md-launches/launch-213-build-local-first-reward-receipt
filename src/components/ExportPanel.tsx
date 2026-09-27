import { useState } from 'react';
import {
  buildCsvExport,
  buildJsonExport,
  downloadText,
  exportFilename,
} from '../lib/export';
import type { Receipt, TokenTotal } from '../lib/receipts';

interface Props {
  receipts: Receipt[];
  totals: TokenTotal[];
  includedChains: number[];
  excludedChains: number[];
  source: 'sample' | 'pasted';
}

export function ExportPanel({ receipts, totals, includedChains, excludedChains, source }: Props) {
  const [message, setMessage] = useState('');
  const nothing = receipts.length === 0;

  const exportJson = () => {
    const name = exportFilename('json');
    downloadText(
      name,
      buildJsonExport({ receipts, totals, includedChains, excludedChains, source }),
      'application/json',
    );
    setMessage(`Downloaded ${name}.`);
  };

  const exportCsv = () => {
    const name = exportFilename('csv');
    downloadText(name, buildCsvExport(receipts), 'text/csv');
    setMessage(`Downloaded ${name}.`);
  };

  return (
    <section className="panel" aria-labelledby="export-heading">
      <h2 id="export-heading">Export</h2>
      <p className="hint">
        Exports contain only the transfers currently shown, with values as exact integer strings.
        The JSON file can be pasted back into this viewer.
        {nothing ? ' Include at least one chain to enable export.' : ''}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={exportJson} disabled={nothing}>
          Download JSON
        </button>
        <button type="button" className="btn" onClick={exportCsv} disabled={nothing}>
          Download CSV
        </button>
      </div>
      <p className="status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
