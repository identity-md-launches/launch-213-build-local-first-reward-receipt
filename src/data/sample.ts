import type { SerializedReceipt } from '../lib/receipts';

/**
 * MOCK DATA. Transaction hashes, addresses and amounts are invented for
 * demonstration only and do not correspond to real on-chain events.
 *
 * The set deliberately contains:
 *  - items 1 and 2: two distinct transfers (different logIndex) in one transaction
 *  - item 3: an exact duplicate of item 1 (removed on import)
 *  - item 4: a Sepolia (11155111) transfer, hidden by the default chain filter
 *  - item 5: a value above Number.MAX_SAFE_INTEGER, kept exact as a string
 *  - item 6: a second USDC transfer so the per-token total has something to add
 */
export const SAMPLE_RECEIPTS: SerializedReceipt[] = [
  {
    chainId: 1,
    txHash: '0x8c1f0e4d2a7b6c5f9e3d1a0b4c8e7f6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
    logIndex: 3,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '125000000',
    timestamp: 1757685780,
  },
  {
    chainId: 1,
    txHash: '0x8c1f0e4d2a7b6c5f9e3d1a0b4c8e7f6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
    logIndex: 5,
    tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '1500000000000000000',
    timestamp: 1757685780,
  },
  {
    chainId: 1,
    txHash: '0x8c1f0e4d2a7b6c5f9e3d1a0b4c8e7f6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a',
    logIndex: 3,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '125000000',
    timestamp: 1757685780,
  },
  {
    chainId: 11155111,
    txHash: '0x3e9a7b1c5d2f8e0a4b6c9d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9a2b4c6d8e0f1a',
    logIndex: 0,
    tokenAddress: '0x5555555555555555555555555555555555555555',
    decimals: 18,
    from: '0x3333333333333333333333333333333333333333',
    to: '0x2222222222222222222222222222222222222222',
    value: '5000000000000000000',
    timestamp: 1757772180,
  },
  {
    chainId: 8453,
    txHash: '0xd4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a98c1f0e4d2a7b6c5f9e3d1a0b4c8e7f6a',
    logIndex: 12,
    tokenAddress: '0x6666666666666666666666666666666666666666',
    decimals: 18,
    from: '0x4444444444444444444444444444444444444444',
    to: '0x2222222222222222222222222222222222222222',
    value: '123456789012345678901234567',
    timestamp: 1757858580,
  },
  {
    chainId: 1,
    txHash: '0x0b4c8e7f6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a8c1f0e4d2a7b6c5f9e3d1a',
    logIndex: 1,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '75500000',
    timestamp: 1757944980,
  },
];

export const SAMPLE_JSON = JSON.stringify(SAMPLE_RECEIPTS, null, 2);
