import { chainName } from '../lib/chains';
import { formatUnits, shortHex, type TokenTotal } from '../lib/receipts';

interface Props {
  totals: TokenTotal[];
  labelledBy: string;
}

export function TotalsTable({ totals, labelledBy }: Props) {
  return (
    <div className="table-wrap">
      <table className="data-table" aria-labelledby={labelledBy}>
        <thead>
          <tr>
            <th scope="col">Chain</th>
            <th scope="col">Token</th>
            <th scope="col" className="num">
              Transfers
            </th>
            <th scope="col" className="num">
              Total
            </th>
            <th scope="col" className="num">
              Raw units
            </th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.key}>
              <td data-label="Chain">{chainName(t.chainId)}</td>
              <td data-label="Token">
                <span className="mono" title={t.tokenAddress}>
                  {shortHex(t.tokenAddress)}
                </span>
                {t.decimalsConflict ? (
                  <span className="badge badge-warning">Decimals differ</span>
                ) : null}
              </td>
              <td data-label="Transfers" className="num">
                {t.count}
              </td>
              <td data-label="Total" className="num amount">
                {formatUnits(t.total, t.decimals)}
              </td>
              <td data-label="Raw units" className="num mono raw">
                {t.total.toString(10)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
