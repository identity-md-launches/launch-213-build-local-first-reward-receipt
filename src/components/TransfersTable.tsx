import { chainName } from '../lib/chains';
import { formatTimestamp, formatUnits, shortHex, type Receipt } from '../lib/receipts';

interface Props {
  receipts: Receipt[];
  labelledBy: string;
}

export function TransfersTable({ receipts, labelledBy }: Props) {
  return (
    <div className="table-wrap">
      <table className="data-table" aria-labelledby={labelledBy}>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Chain</th>
            <th scope="col">Token</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col" className="num">
              Amount
            </th>
            <th scope="col">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr key={r.key}>
              <td data-label="When">{formatTimestamp(r.timestamp)}</td>
              <td data-label="Chain">{chainName(r.chainId)}</td>
              <td data-label="Token">
                <span className="mono" title={r.tokenAddress}>
                  {shortHex(r.tokenAddress)}
                </span>
              </td>
              <td data-label="From">
                <span className="mono" title={r.from}>
                  {shortHex(r.from)}
                </span>
              </td>
              <td data-label="To">
                <span className="mono" title={r.to}>
                  {shortHex(r.to)}
                </span>
              </td>
              <td data-label="Amount" className="num amount">
                {formatUnits(r.value, r.decimals)}
              </td>
              <td data-label="Transaction">
                <details className="details">
                  <summary>
                    <span className="mono">{shortHex(r.txHash)}</span> log {r.logIndex}
                  </summary>
                  <dl className="kv">
                    <dt>Transaction hash</dt>
                    <dd className="mono">{r.txHash}</dd>
                    <dt>Log index</dt>
                    <dd>{r.logIndex}</dd>
                    <dt>Token</dt>
                    <dd className="mono">{r.tokenAddress}</dd>
                    <dt>From</dt>
                    <dd className="mono">{r.from}</dd>
                    <dt>To</dt>
                    <dd className="mono">{r.to}</dd>
                    <dt>Raw value</dt>
                    <dd className="mono">
                      {r.value.toString(10)} ({r.decimals} decimals)
                    </dd>
                  </dl>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
