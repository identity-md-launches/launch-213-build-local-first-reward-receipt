/**
 * Receipt parsing, validation, deduplication and exact-integer totals.
 *
 * Every amount is a bigint. Nothing here goes through a JavaScript Number,
 * so values above Number.MAX_SAFE_INTEGER stay exact.
 */

export const RECEIPT_FIELDS = [
  'chainId',
  'txHash',
  'logIndex',
  'tokenAddress',
  'decimals',
  'from',
  'to',
  'value',
  'timestamp',
] as const;

export interface Receipt {
  /** `${chainId}:${txHash lowercase}:${logIndex}` */
  key: string;
  chainId: number;
  /** As supplied (case preserved). */
  txHash: string;
  logIndex: number;
  /** As supplied (case preserved). Grouping uses the lowercase form. */
  tokenAddress: string;
  decimals: number;
  from: string;
  to: string;
  value: bigint;
  /** Unix seconds. */
  timestamp: number;
}

/** JSON-safe shape used by storage and export. */
export interface SerializedReceipt {
  chainId: number;
  txHash: string;
  logIndex: number;
  tokenAddress: string;
  decimals: number;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

export interface Issue {
  /** Zero-based position in the array, or null for a document-level issue. */
  index: number | null;
  field: string | null;
  message: string;
}

export interface ParseSuccess {
  ok: true;
  receipts: Receipt[];
  /** Number of items dropped because their key matched an earlier item. */
  duplicatesRemoved: number;
  /** Duplicate keys whose other fields differed from the kept item. */
  conflicts: Issue[];
  totalItems: number;
}

export interface ParseFailure {
  ok: false;
  issues: Issue[];
}

export type ParseResult = ParseSuccess | ParseFailure;

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL_RE = /^[0-9]+$/;
const HEX_RE = /^0x[0-9a-fA-F]+$/;
const MAX_DECIMALS = 255;
/** Anything past this (year ~5138 in seconds) is almost certainly milliseconds. */
const MAX_TIMESTAMP_SECONDS = 99_999_999_999;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function readInteger(
  raw: unknown,
  opts: { min: number; max?: number },
): { value: number } | { error: string } {
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string' && DECIMAL_RE.test(raw.trim())) {
    n = Number(raw.trim());
  } else {
    return { error: 'must be a whole number' };
  }
  if (!Number.isSafeInteger(n)) {
    return { error: 'must be a whole number within the safe integer range' };
  }
  if (n < opts.min) return { error: `must be ${opts.min} or greater` };
  if (opts.max !== undefined && n > opts.max) return { error: `must be ${opts.max} or less` };
  return { value: n };
}

function readBigInt(raw: unknown): { value: bigint } | { error: string } {
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (DECIMAL_RE.test(s)) return { value: BigInt(s) };
    if (HEX_RE.test(s)) return { value: BigInt(s) };
    return { error: 'must be a decimal integer string such as "1500000000000000000"' };
  }
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 0) {
      return { error: 'must be a non-negative integer' };
    }
    if (!Number.isSafeInteger(raw)) {
      return {
        error:
          'is larger than JavaScript can hold as a number and has already lost precision; write it as a decimal string',
      };
    }
    return { value: BigInt(raw) };
  }
  return { error: 'must be a decimal integer string such as "1500000000000000000"' };
}

function readHex(raw: unknown, re: RegExp, what: string): { value: string } | { error: string } {
  if (typeof raw !== 'string') return { error: `must be a ${what} string` };
  const s = raw.trim();
  if (!re.test(s)) return { error: `must be a ${what}` };
  return { value: s };
}

export function receiptKey(chainId: number, txHash: string, logIndex: number): string {
  return `${chainId}:${txHash.toLowerCase()}:${logIndex}`;
}

/** Validate one array item. Returns a receipt or a list of field issues. */
export function validateItem(
  item: unknown,
  index: number,
): { receipt: Receipt } | { issues: Issue[] } {
  if (!isRecord(item)) {
    return { issues: [{ index, field: null, message: 'must be an object with the receipt fields' }] };
  }
  const issues: Issue[] = [];
  const push = (field: string, message: string) => issues.push({ index, field, message });

  for (const f of RECEIPT_FIELDS) {
    if (!(f in item) || item[f] === null || item[f] === undefined || item[f] === '') {
      push(f, 'is missing');
    }
  }
  if (issues.length > 0) return { issues };

  const chainId = readInteger(item.chainId, { min: 1 });
  if ('error' in chainId) push('chainId', chainId.error);

  const txHash = readHex(item.txHash, HASH_RE, '0x-prefixed 32-byte transaction hash (64 hex characters)');
  if ('error' in txHash) push('txHash', txHash.error);

  const logIndex = readInteger(item.logIndex, { min: 0 });
  if ('error' in logIndex) push('logIndex', logIndex.error);

  const tokenAddress = readHex(item.tokenAddress, ADDRESS_RE, '0x-prefixed 20-byte address (40 hex characters)');
  if ('error' in tokenAddress) push('tokenAddress', tokenAddress.error);

  const decimals = readInteger(item.decimals, { min: 0, max: MAX_DECIMALS });
  if ('error' in decimals) push('decimals', decimals.error);

  const from = readHex(item.from, ADDRESS_RE, '0x-prefixed 20-byte address (40 hex characters)');
  if ('error' in from) push('from', from.error);

  const to = readHex(item.to, ADDRESS_RE, '0x-prefixed 20-byte address (40 hex characters)');
  if ('error' in to) push('to', to.error);

  const value = readBigInt(item.value);
  if ('error' in value) push('value', value.error);

  const timestamp = readInteger(item.timestamp, { min: 0, max: MAX_TIMESTAMP_SECONDS });
  if ('error' in timestamp) {
    push('timestamp', `${timestamp.error} (Unix seconds, not milliseconds)`);
  }

  if (
    'error' in chainId ||
    'error' in txHash ||
    'error' in logIndex ||
    'error' in tokenAddress ||
    'error' in decimals ||
    'error' in from ||
    'error' in to ||
    'error' in value ||
    'error' in timestamp
  ) {
    return { issues };
  }
  const r: Receipt = {
    key: receiptKey(chainId.value, txHash.value, logIndex.value),
    chainId: chainId.value,
    txHash: txHash.value,
    logIndex: logIndex.value,
    tokenAddress: tokenAddress.value,
    decimals: decimals.value,
    from: from.value,
    to: to.value,
    value: value.value,
    timestamp: timestamp.value,
  };
  return { receipt: r };
}

function sameContent(a: Receipt, b: Receipt): boolean {
  return (
    a.tokenAddress.toLowerCase() === b.tokenAddress.toLowerCase() &&
    a.decimals === b.decimals &&
    a.from.toLowerCase() === b.from.toLowerCase() &&
    a.to.toLowerCase() === b.to.toLowerCase() &&
    a.value === b.value &&
    a.timestamp === b.timestamp
  );
}

/** Drop later items whose chainId+txHash+logIndex key was already seen. */
export function dedupe(receipts: Receipt[]): {
  receipts: Receipt[];
  duplicatesRemoved: number;
  conflicts: Issue[];
} {
  const seen = new Map<string, { receipt: Receipt; index: number }>();
  const kept: Receipt[] = [];
  const conflicts: Issue[] = [];
  let duplicatesRemoved = 0;
  receipts.forEach((r, index) => {
    const prior = seen.get(r.key);
    if (prior) {
      duplicatesRemoved += 1;
      if (!sameContent(prior.receipt, r)) {
        conflicts.push({
          index,
          field: null,
          message: `has the same chainId, txHash and logIndex as item ${prior.index + 1} but different content; item ${prior.index + 1} was kept`,
        });
      }
      return;
    }
    seen.set(r.key, { receipt: r, index });
    kept.push(r);
  });
  return { receipts: kept, duplicatesRemoved, conflicts };
}

/** Parse an already-decoded JSON value. Accepts an array or `{ receipts: [...] }`. */
export function parseReceiptValue(doc: unknown): ParseResult {
  let items: unknown;
  if (Array.isArray(doc)) {
    items = doc;
  } else if (isRecord(doc) && Array.isArray(doc.receipts)) {
    items = doc.receipts;
  } else {
    return {
      ok: false,
      issues: [{ index: null, field: null, message: 'Paste a JSON array of receipt objects.' }],
    };
  }
  const arr = items as unknown[];
  if (arr.length === 0) {
    return {
      ok: false,
      issues: [{ index: null, field: null, message: 'The array is empty. Paste at least one receipt.' }],
    };
  }
  const issues: Issue[] = [];
  const parsed: Receipt[] = [];
  arr.forEach((item, index) => {
    const result = validateItem(item, index);
    if ('issues' in result) issues.push(...result.issues);
    else parsed.push(result.receipt);
  });
  if (issues.length > 0) return { ok: false, issues };
  const d = dedupe(parsed);
  return {
    ok: true,
    receipts: d.receipts,
    duplicatesRemoved: d.duplicatesRemoved,
    conflicts: d.conflicts,
    totalItems: arr.length,
  };
}

/** Parse pasted text. */
export function parseReceiptText(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return {
      ok: false,
      issues: [{ index: null, field: null, message: 'Paste a JSON array of receipts before importing.' }],
    };
  }
  let doc: unknown;
  try {
    doc = JSON.parse(trimmed);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown error';
    return {
      ok: false,
      issues: [{ index: null, field: null, message: `Not valid JSON (${detail}). Fix the syntax and try again.` }],
    };
  }
  return parseReceiptValue(doc);
}

export function serializeReceipt(r: Receipt): SerializedReceipt {
  return {
    chainId: r.chainId,
    txHash: r.txHash,
    logIndex: r.logIndex,
    tokenAddress: r.tokenAddress,
    decimals: r.decimals,
    from: r.from,
    to: r.to,
    value: r.value.toString(10),
    timestamp: r.timestamp,
  };
}

export function tokenKey(chainId: number, tokenAddress: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

export interface TokenTotal {
  key: string;
  chainId: number;
  tokenAddress: string;
  decimals: number;
  count: number;
  total: bigint;
  /** True when receipts for this token disagreed on `decimals`; the first seen value is used. */
  decimalsConflict: boolean;
}

/** Exact per-token totals over the given receipts, in first-seen order. */
export function tokenTotals(receipts: Receipt[]): TokenTotal[] {
  const map = new Map<string, TokenTotal>();
  for (const r of receipts) {
    const key = tokenKey(r.chainId, r.tokenAddress);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += r.value;
      if (existing.decimals !== r.decimals) existing.decimalsConflict = true;
    } else {
      map.set(key, {
        key,
        chainId: r.chainId,
        tokenAddress: r.tokenAddress,
        decimals: r.decimals,
        count: 1,
        total: r.value,
        decimalsConflict: false,
      });
    }
  }
  return [...map.values()];
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Exact decimal rendering of a bigint with `decimals` fractional digits.
 * Integer part is grouped with commas; trailing fractional zeros are trimmed.
 */
export function formatUnits(value: bigint, decimals: number, options?: { group?: boolean }): string {
  const group = options?.group ?? true;
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const digits = abs.toString(10);
  let intPart: string;
  let fracPart: string;
  if (decimals === 0) {
    intPart = digits;
    fracPart = '';
  } else if (digits.length <= decimals) {
    intPart = '0';
    fracPart = digits.padStart(decimals, '0');
  } else {
    intPart = digits.slice(0, digits.length - decimals);
    fracPart = digits.slice(digits.length - decimals);
  }
  fracPart = fracPart.replace(/0+$/, '');
  const shownInt = group ? groupThousands(intPart) : intPart;
  const out = fracPart ? `${shownInt}.${fracPart}` : shownInt;
  return negative ? `-${out}` : out;
}

export function shortHex(hex: string, head = 6, tail = 4): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

const utcFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Human date in UTC, deterministic across machines. */
export function formatTimestamp(unixSeconds: number): string {
  return `${utcFormatter.format(new Date(unixSeconds * 1000))} UTC`;
}

export function isoTimestamp(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}
