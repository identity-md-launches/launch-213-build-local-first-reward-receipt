/** Sepolia is a test network and is hidden by default. */
export const SEPOLIA_CHAIN_ID = 11155111;

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'OP Mainnet',
  56: 'BNB Smart Chain',
  100: 'Gnosis',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum One',
  43114: 'Avalanche',
  59144: 'Linea',
  534352: 'Scroll',
  11155111: 'Sepolia test network',
};

export function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

export function chainLabel(chainId: number): string {
  const name = CHAIN_NAMES[chainId];
  return name ? `${name} (${chainId})` : `Chain ${chainId}`;
}

export function isTestNetwork(chainId: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID;
}

/** Default inclusion rule: every chain except Sepolia. */
export function includedByDefault(chainId: number): boolean {
  return !isTestNetwork(chainId);
}
