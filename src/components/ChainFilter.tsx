import { chainLabel, isTestNetwork } from '../lib/chains';

interface Props {
  chains: number[];
  isIncluded: (chainId: number) => boolean;
  onToggle: (chainId: number, included: boolean) => void;
}

export function ChainFilter({ chains, isIncluded, onToggle }: Props) {
  return (
    <fieldset className="fieldset">
      <legend className="field-label">Chains to include</legend>
      <p className="hint">
        Test networks are excluded by default. Totals and exports only count included chains.
      </p>
      <div className="checkbox-list">
        {chains.map((chainId) => {
          const id = `chain-${chainId}`;
          return (
            <div className="checkbox-row" key={chainId}>
              <input
                type="checkbox"
                id={id}
                checked={isIncluded(chainId)}
                onChange={(e) => onToggle(chainId, e.target.checked)}
              />
              <label htmlFor={id}>
                {chainLabel(chainId)}
                {isTestNetwork(chainId) ? <span className="badge badge-neutral">Test network</span> : null}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
