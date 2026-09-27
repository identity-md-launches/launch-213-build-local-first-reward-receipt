import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChainFilter } from './components/ChainFilter';
import { EmptyState } from './components/EmptyState';
import { ExportPanel } from './components/ExportPanel';
import { ImportPanel } from './components/ImportPanel';
import { TotalsTable } from './components/TotalsTable';
import { TransfersTable } from './components/TransfersTable';
import { SAMPLE_JSON } from './data/sample';
import { includedByDefault } from './lib/chains';
import { parseReceiptText, tokenTotals, type Issue, type Receipt } from './lib/receipts';
import { clearState, loadState, saveState, type DataSource } from './lib/storage';

interface Dataset {
  source: DataSource;
  receipts: Receipt[];
  importedAt: number;
  duplicatesRemoved: number;
}

interface ImportFeedback {
  kind: 'error' | 'success';
  issues: Issue[];
  message: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function App() {
  const initial = useMemo(() => loadState(), []);
  const [dataset, setDataset] = useState<Dataset | null>(
    initial
      ? {
          source: initial.source,
          receipts: initial.receipts,
          importedAt: initial.importedAt,
          duplicatesRemoved: initial.duplicatesRemoved,
        }
      : null,
  );
  const [chainOverrides, setChainOverrides] = useState<Record<string, boolean>>(
    initial?.chainOverrides ?? {},
  );
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    initial ? `Restored ${plural(initial.receipts.length, 'receipt', 'receipts')} from this browser.` : '',
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // Persist on every change so a refresh restores the same view.
  useEffect(() => {
    if (dataset) {
      saveState({ ...dataset, chainOverrides });
    } else {
      clearState();
    }
  }, [dataset, chainOverrides]);

  const chains = useMemo(() => {
    const ids = new Set<number>();
    for (const r of dataset?.receipts ?? []) ids.add(r.chainId);
    return [...ids].sort((a, b) => a - b);
  }, [dataset]);

  const isIncluded = useCallback(
    (chainId: number) => chainOverrides[String(chainId)] ?? includedByDefault(chainId),
    [chainOverrides],
  );

  const includedChains = chains.filter(isIncluded);
  const excludedChains = chains.filter((c) => !isIncluded(c));

  const shown = useMemo(
    () => (dataset?.receipts ?? []).filter((r) => isIncluded(r.chainId)),
    [dataset, isIncluded],
  );
  const totals = useMemo(() => tokenTotals(shown), [shown]);

  const importText = (source: DataSource, raw: string) => {
    const result = parseReceiptText(raw);
    if (!result.ok) {
      setFeedback({
        kind: 'error',
        issues: result.issues,
        message: `Unable to import. Fix ${plural(result.issues.length, 'problem', 'problems')} below and try again.`,
      });
      setStatusMessage('');
      textareaRef.current?.focus();
      return;
    }
    setDataset({
      source,
      receipts: result.receipts,
      importedAt: Date.now(),
      duplicatesRemoved: result.duplicatesRemoved,
    });
    setChainOverrides({});
    const parts = [`Imported ${plural(result.receipts.length, 'receipt', 'receipts')}.`];
    if (result.duplicatesRemoved > 0) {
      parts.push(`Removed ${plural(result.duplicatesRemoved, 'exact duplicate', 'duplicates')}.`);
    }
    if (source === 'sample') parts.push('This is mock sample data.');
    setFeedback(
      result.conflicts.length > 0
        ? {
            kind: 'success',
            issues: result.conflicts,
            message: `${plural(result.conflicts.length, 'duplicate key', 'duplicate keys')} had different content. Check the items below.`,
          }
        : null,
    );
    setStatusMessage(parts.join(' '));
    // Move the reader to the results after a successful import.
    window.requestAnimationFrame(() => resultsHeadingRef.current?.focus());
  };

  const handleImport = () => importText('pasted', text);

  const handleLoadSample = () => {
    setText(SAMPLE_JSON);
    importText('sample', SAMPLE_JSON);
  };

  const handleClear = () => {
    const count = dataset?.receipts.length ?? 0;
    const ok = window.confirm(
      `Remove ${plural(count, 'receipt', 'receipts')} from this browser? Exports you already downloaded are not affected.`,
    );
    if (!ok) return;
    setDataset(null);
    setChainOverrides({});
    setText('');
    setFeedback(null);
    setStatusMessage('Receipts removed from this browser.');
    textareaRef.current?.focus();
  };

  const handleToggleChain = (chainId: number, included: boolean) => {
    setChainOverrides((prev) => ({ ...prev, [String(chainId)]: included }));
  };

  const handleResetChains = () => setChainOverrides({});

  const hasOverrides = chains.some((c) => chainOverrides[String(c)] !== undefined && chainOverrides[String(c)] !== includedByDefault(c));

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <p className="eyebrow">Local-first tool</p>
          <h1>Reward receipt viewer</h1>
          <p className="lede">
            Paste ERC-20 transfer receipts to review them offline. Receipts are observed transfers,
            not proof that a job paid a reward. Nothing you paste leaves this browser, and the page
            never asks for a wallet signature or sends a transaction.
          </p>
        </div>
      </header>

      <main id="main" className="container" tabIndex={-1}>
        <ImportPanel
          text={text}
          onTextChange={setText}
          onImport={handleImport}
          onLoadSample={handleLoadSample}
          onClear={dataset ? handleClear : null}
          feedback={feedback}
          textareaRef={textareaRef}
        />

        <p className="status" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {dataset ? (
          <>
            <section className="panel" aria-labelledby="filters-heading">
              <div className="panel-heading">
                <h2 id="filters-heading">Filters</h2>
                {hasOverrides ? (
                  <button type="button" className="btn" onClick={handleResetChains}>
                    Reset chains
                  </button>
                ) : null}
              </div>
              <ChainFilter chains={chains} isIncluded={isIncluded} onToggle={handleToggleChain} />
            </section>

            <section className="panel" aria-labelledby="results-heading">
              <div className="panel-heading">
                <h2 id="results-heading" ref={resultsHeadingRef} tabIndex={-1}>
                  Observed transfers
                </h2>
                {dataset.source === 'sample' ? (
                  <span className="badge badge-mock">Mock data</span>
                ) : null}
              </div>
              <p className="muted">
                Showing {shown.length} of {dataset.receipts.length} deduplicated{' '}
                {dataset.receipts.length === 1 ? 'receipt' : 'receipts'}
                {dataset.duplicatesRemoved > 0
                  ? ` (${plural(dataset.duplicatesRemoved, 'exact duplicate', 'exact duplicates')} removed on import)`
                  : ''}
                . Each row is a Transfer event seen on chain. It shows that tokens moved, not why.
              </p>

              {shown.length === 0 ? (
                <EmptyState
                  title="All receipts are hidden by the chain filter"
                  body={`Include at least one chain above to see ${plural(dataset.receipts.length, 'receipt', 'receipts')}.`}
                  actionLabel="Reset chains"
                  onAction={handleResetChains}
                />
              ) : (
                <>
                  <h3 id="totals-heading">Totals per token</h3>
                  <TotalsTable totals={totals} labelledBy="totals-heading" />
                  <h3 id="transfers-heading">Transfers</h3>
                  <TransfersTable receipts={shown} labelledBy="transfers-heading" />
                </>
              )}
            </section>

            <ExportPanel
              receipts={shown}
              totals={totals}
              includedChains={includedChains}
              excludedChains={excludedChains}
              source={dataset.source}
            />
          </>
        ) : (
          <EmptyState
            title="No receipts yet"
            body="Paste a JSON array of transfer receipts above, or load the mock sample to see how deduplication, chain filters and totals work."
            actionLabel="Load sample data"
            onAction={handleLoadSample}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Data is kept in this browser's local storage only. Sample data is mock data and is
            labeled as such. No wallet, no signatures, no network requests.
          </p>
        </div>
      </footer>
    </>
  );
}
