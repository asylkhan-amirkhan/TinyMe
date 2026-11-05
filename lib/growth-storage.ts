import { applyGrowth, emptyGrowth, parseGrowth, type GrowthCommand } from '../domain/growth';

export const guestGrowthKey = 'tinyme:growth:guest:v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export function readGuestGrowth(storage: Pick<Storage, 'getItem'>) {
  const saved = storage.getItem(guestGrowthKey);
  return saved ? parseGrowth(JSON.parse(saved)) : emptyGrowth();
}
/** The caller must hold the cross-tab Web Lock for guestGrowthKey. */
export function commitGuestGrowth(storage: StoragePort, command: GrowthCommand, at: string) {
  const before = readGuestGrowth(storage);
  const state = applyGrowth(before, command, at);
  // A quota/permission error must throw before any success is acknowledged.
  storage.setItem(guestGrowthKey, JSON.stringify(state));
  return { state, changed: state !== before };
}
