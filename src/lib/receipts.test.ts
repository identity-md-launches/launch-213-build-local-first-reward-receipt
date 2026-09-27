import { describe, expect, it } from 'vitest';
import { SAMPLE_JSON, SAMPLE_RECEIPTS } from '../data/sample';
import { includedByDefault, SEPOLIA_CHAIN_ID } from './chains';
import { buildCsvExport, buildJsonExport } from './export';
import {
  formatUnits,
  parseReceiptText,
  parseReceiptValue,
  receiptKey,
  shortHex,
  tokenTotals,
  type Receipt,
} from './receipts';

function mustParse(text: string) {
  const r = parseReceiptText(text);
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.issues)}`);
  return r;
}

describe('sample data', () => {
  it('contains the required cases', () => {
    const r = mustParse(SAMPLE_JSON);
    expect(SAMPLE_RECEIPTS).toHaveLength(6);
    expect(r.totalItems).toBe(6);
    expect(r.duplicatesRemoved).toBe(1);
    expect(r.conflicts).toHaveLength(0);
    expect(r.receipts).toHaveLength(5);

    // two distinct transfers in one transaction
    const byTx = new Map<string, number>();
    for (const x of r.receipts) byTx.set(x.txHash, (byTx.get(x.txHash) ?? 0) + 1);
    expect([...byTx.values()].some((n) => n === 2)).toBe(true);

    // one Sepolia transfer
    expect(r.receipts.filter((x) => x.chainId === SEPOLIA_CHAIN_ID)).toHaveLength(1);

    // one amount above the safe-integer range, kept exact
    const big = r.receipts.filter((x) => x.value > BigInt(Number.MAX_SAFE_INTEGER));
    expect(big.length).toBeGreaterThan(0);
    expect(big.map((x) => x.value.toString())).toContain('123456789012345678901234567');
  });
});

describe('deduplication', () => {
  it('keys on chainId + txHash + logIndex, case-insensitive on the hash', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const upper = { ...a, txHash: a.txHash.toUpperCase().replace('0X', '0x') };
    const r = mustParse(JSON.stringify([a, upper]));
    expect(r.receipts).toHaveLength(1);
    expect(r.duplicatesRemoved).toBe(1);
    expect(receiptKey(1, 'ABC', 0)).toBe('1:abc:0');
  });

  it('keeps the same tx with a different logIndex', () => {
    const r = mustParse(JSON.stringify([SAMPLE_RECEIPTS[0], SAMPLE_RECEIPTS[1]]));
    expect(r.receipts).toHaveLength(2);
    expect(r.duplicatesRemoved).toBe(0);
  });

  it('keeps the same tx hash on a different chain', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const r = mustParse(JSON.stringify([a, { ...a, chainId: 10 }]));
    expect(r.receipts).toHaveLength(2);
  });

  it('reports a conflict when a duplicate key carries different content', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const r = mustParse(JSON.stringify([a, { ...a, value: '1' }]));
    expect(r.receipts).toHaveLength(1);
    expect(r.receipts[0]!.value).toBe(125000000n);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]!.index).toBe(1);
  });
});

describe('exact integer arithmetic', () => {
  it('sums values above MAX_SAFE_INTEGER without loss', () => {
    const base = SAMPLE_RECEIPTS[4]!;
    const r = mustParse(
      JSON.stringify([base, { ...base, logIndex: 13, value: '1' }]),
    );
    const totals = tokenTotals(r.receipts);
    expect(totals).toHaveLength(1);
    expect(totals[0]!.total.toString()).toBe('123456789012345678901234568');
    expect(totals[0]!.count).toBe(2);
  });

  it('rejects a JSON number that has already lost precision', () => {
    const base = SAMPLE_RECEIPTS[0]!;
    const text = JSON.stringify([base]).replace('"125000000"', '123456789012345678901234567');
    const r = parseReceiptText(text);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues[0]!.field).toBe('value');
      expect(r.issues[0]!.message).toMatch(/decimal string/);
    }
  });

  it('accepts safe JSON numbers and hex strings', () => {
    const base = SAMPLE_RECEIPTS[0]!;
    const r = mustParse(
      JSON.stringify([
        { ...base, value: 42 },
        { ...base, logIndex: 9, value: '0xff' },
      ]),
    );
    expect(r.receipts[0]!.value).toBe(42n);
    expect(r.receipts[1]!.value).toBe(255n);
  });

  it('formats units exactly', () => {
    expect(formatUnits(125000000n, 6)).toBe('125');
    expect(formatUnits(1500000000000000000n, 18)).toBe('1.5');
    expect(formatUnits(123456789012345678901234567n, 18)).toBe('123,456,789.012345678901234567');
    expect(formatUnits(123456789012345678901234567n, 18, { group: false })).toBe(
      '123456789.012345678901234567',
    );
    expect(formatUnits(1n, 18)).toBe('0.000000000000000001');
    expect(formatUnits(0n, 18)).toBe('0');
    expect(formatUnits(7n, 0)).toBe('7');
    expect(formatUnits(200500000n, 6)).toBe('200.5');
  });
});

describe('per-token totals', () => {
  it('groups by chain and token address, case-insensitively', () => {
    const r = mustParse(SAMPLE_JSON);
    const included = r.receipts.filter((x) => includedByDefault(x.chainId));
    const totals = tokenTotals(included);
    const usdc = totals.find((t) => t.tokenAddress.toLowerCase().startsWith('0xa0b8'));
    expect(usdc?.count).toBe(2);
    expect(usdc?.total).toBe(200500000n);
    expect(formatUnits(usdc!.total, usdc!.decimals)).toBe('200.5');
    expect(totals.some((t) => t.chainId === SEPOLIA_CHAIN_ID)).toBe(false);
    expect(totals).toHaveLength(3);
  });

  it('flags decimals conflicts within a token', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const r = mustParse(JSON.stringify([a, { ...a, logIndex: 99, decimals: 18 }]));
    expect(tokenTotals(r.receipts)[0]!.decimalsConflict).toBe(true);
  });
});

describe('chain defaults', () => {
  it('excludes Sepolia and includes everything else', () => {
    expect(includedByDefault(11155111)).toBe(false);
    expect(includedByDefault(1)).toBe(true);
    expect(includedByDefault(8453)).toBe(true);
  });
});

describe('import validation', () => {
  it('rejects empty input, invalid JSON and non-arrays', () => {
    expect(parseReceiptText('').ok).toBe(false);
    expect(parseReceiptText('   ').ok).toBe(false);
    const bad = parseReceiptText('{');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues[0]!.message).toMatch(/Not valid JSON/);
    expect(parseReceiptText('{"a":1}').ok).toBe(false);
    expect(parseReceiptText('[]').ok).toBe(false);
    expect(parseReceiptText('"hi"').ok).toBe(false);
  });

  it('accepts the JSON export envelope', () => {
    const r = parseReceiptValue({ receipts: [SAMPLE_RECEIPTS[0]] });
    expect(r.ok).toBe(true);
  });

  it('reports every missing or invalid field with its index', () => {
    const r = parseReceiptText(
      JSON.stringify([
        { chainId: 1 },
        { ...SAMPLE_RECEIPTS[0], txHash: '0x123', to: 'nope', timestamp: 1757685780000 },
      ]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const missing = r.issues.filter((i) => i.index === 0);
      expect(missing).toHaveLength(8);
      const invalid = r.issues.filter((i) => i.index === 1).map((i) => i.field);
      expect(invalid).toEqual(['txHash', 'to', 'timestamp']);
    }
  });

  it('rejects negative values, bad decimals and chain 0', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const r = parseReceiptText(
      JSON.stringify([{ ...a, value: -5, decimals: 300, chainId: 0, logIndex: -1 }]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.map((i) => i.field).sort()).toEqual(['chainId', 'decimals', 'logIndex', 'value']);
    }
  });

  it('ignores unknown fields and accepts numeric strings for integers', () => {
    const a = SAMPLE_RECEIPTS[0]!;
    const r = mustParse(JSON.stringify([{ ...a, chainId: '1', logIndex: '3', extra: true }]));
    expect(r.receipts[0]!.chainId).toBe(1);
    expect(r.receipts[0]!.logIndex).toBe(3);
  });
});

describe('export', () => {
  const r = mustParse(SAMPLE_JSON);
  const included: Receipt[] = r.receipts.filter((x) => includedByDefault(x.chainId));

  it('round-trips through the JSON export', () => {
    const json = buildJsonExport({
      receipts: included,
      totals: tokenTotals(included),
      includedChains: [1, 8453],
      excludedChains: [11155111],
      source: 'sample',
      now: new Date('2026-09-27T00:00:00Z'),
    });
    const doc = JSON.parse(json) as { mockData: boolean; note: string; totals: { total: string }[] };
    expect(doc.mockData).toBe(true);
    expect(doc.note).toMatch(/not proof/);
    expect(doc.totals.some((t) => t.total === '123456789012345678901234567')).toBe(true);
    const again = parseReceiptText(json);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.receipts).toHaveLength(included.length);
  });

  it('writes CSV with exact values and a header', () => {
    const csv = buildCsvExport(included);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toMatch(/^chainId,chainName,txHash/);
    expect(lines).toHaveLength(included.length + 1);
    expect(csv).toContain('123456789012345678901234567');
  });

  it('shortens hex for display', () => {
    expect(shortHex('0x1234567890abcdef')).toBe('0x1234…cdef');
    expect(shortHex('0x12')).toBe('0x12');
  });
});
