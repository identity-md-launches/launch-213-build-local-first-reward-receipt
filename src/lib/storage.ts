import { parseReceiptValue, serializeReceipt, type Receipt } from './receipts';

export type DataSource = 'sample' | 'pasted';

export interface PersistedState {
  version: 1;
  source: DataSource;
  receipts: ReturnType<typeof serializeReceipt>[];
  /** Explicit per-chain choices; chains not listed follow the default rule. */
  chainOverrides: Record<string, boolean>;
  importedAt: number;
  duplicatesRemoved: number;
}

export interface LoadedState {
  source: DataSource;
  receipts: Receipt[];
  chainOverrides: Record<string, boolean>;
  importedAt: number;
  duplicatesRemoved: number;
}

export const STORAGE_KEY = 'reward-receipt-viewer:v1';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadState(): LoadedState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw) as Partial<PersistedState>;
    if (doc.version !== 1 || !Array.isArray(doc.receipts)) return null;
    const parsed = parseReceiptValue(doc.receipts);
    if (!parsed.ok) return null;
    return {
      source: doc.source === 'sample' ? 'sample' : 'pasted',
      receipts: parsed.receipts,
      chainOverrides: typeof doc.chainOverrides === 'object' && doc.chainOverrides ? doc.chainOverrides : {},
      importedAt: typeof doc.importedAt === 'number' ? doc.importedAt : Date.now(),
      duplicatesRemoved: typeof doc.duplicatesRemoved === 'number' ? doc.duplicatesRemoved : 0,
    };
  } catch {
    return null;
  }
}

export function saveState(state: LoadedState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const doc: PersistedState = {
    version: 1,
    source: state.source,
    receipts: state.receipts.map(serializeReceipt),
    chainOverrides: state.chainOverrides,
    importedAt: state.importedAt,
    duplicatesRemoved: state.duplicatesRemoved,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  getStorage()?.removeItem(STORAGE_KEY);
}
