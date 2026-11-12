import { parseProgress, progressCommand, type ProgressCommand } from '@/domain/progress';
export const progressKey = 'tinyme:progress:v1';
export const readProgress = (storage: Pick<Storage, 'getItem'>) => parseProgress(storage.getItem(progressKey));
/** Save the complete task + XP event atomically before reporting success. */
export function saveProgressCommand(storage: Pick<Storage, 'getItem' | 'setItem'>, command: ProgressCommand) {
  const current = readProgress(storage);
  const next = progressCommand(current, command);
  if (next !== current) storage.setItem(progressKey, JSON.stringify(next));
  return next;
}
