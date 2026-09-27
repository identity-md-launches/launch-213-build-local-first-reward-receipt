import type { RefObject } from 'react';
import type { Issue } from '../lib/receipts';

interface Feedback {
  kind: 'error' | 'success';
  issues: Issue[];
  message: string;
}

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onImport: () => void;
  onLoadSample: () => void;
  /** Null hides the clear action when there is nothing to clear. */
  onClear: (() => void) | null;
  feedback: Feedback | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const MAX_LISTED_ISSUES = 25;

function issueText(issue: Issue): string {
  const where = issue.index === null ? '' : `Item ${issue.index + 1}`;
  const field = issue.field ? `${where ? ': ' : ''}${issue.field}` : '';
  const prefix = `${where}${field}`;
  return prefix ? `${prefix} ${issue.message}` : issue.message;
}

export function ImportPanel({
  text,
  onTextChange,
  onImport,
  onLoadSample,
  onClear,
  feedback,
  textareaRef,
}: Props) {
  const isError = feedback?.kind === 'error';
  const listed = feedback ? feedback.issues.slice(0, MAX_LISTED_ISSUES) : [];
  const hidden = feedback ? feedback.issues.length - listed.length : 0;

  return (
    <section className="panel" aria-labelledby="import-heading">
      <h2 id="import-heading">Import receipts</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onImport();
        }}
      >
        <label className="field-label" htmlFor="receipts-json">
          Receipts JSON
        </label>
        <p className="hint" id="receipts-hint">
          A JSON array of objects with chainId, txHash, logIndex, tokenAddress, decimals, from, to,
          value and timestamp (Unix seconds). Write value as a decimal string so large amounts keep
          exact precision. Duplicates of the same chainId, txHash and logIndex are removed.
        </p>
        <textarea
          id="receipts-json"
          ref={textareaRef}
          className="textarea"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={8}
          spellCheck={false}
          autoComplete="off"
          placeholder='[{"chainId": 1, "txHash": "0x…", "logIndex": 3, "tokenAddress": "0x…", "decimals": 6, "from": "0x…", "to": "0x…", "value": "125000000", "timestamp": 1757685780}]'
          aria-describedby={isError ? 'receipts-hint import-feedback' : 'receipts-hint'}
          aria-invalid={isError ? true : undefined}
        />
        <div className="actions">
          <button type="submit" className="btn btn-primary">
            Import receipts
          </button>
          <button type="button" className="btn" onClick={onLoadSample}>
            Load sample data
          </button>
          {onClear ? (
            <button type="button" className="btn" onClick={onClear}>
              Clear receipts
            </button>
          ) : null}
        </div>
      </form>
      {feedback ? (
        <div
          id="import-feedback"
          className={isError ? 'notice notice-error' : 'notice notice-warning'}
          role={isError ? 'alert' : 'status'}
        >
          <p className="notice-title">{feedback.message}</p>
          {listed.length > 0 ? (
            <ul className="issue-list">
              {listed.map((issue, i) => (
                <li key={i}>{issueText(issue)}</li>
              ))}
            </ul>
          ) : null}
          {hidden > 0 ? <p className="muted">And {hidden} more.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
