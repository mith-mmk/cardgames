import { openDB } from 'idb';

const DB_NAME = 'solitaire-collections';
const STORE_NAME = 'state';
const STATE_KEY = 'v1';

const database = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export async function readPersistentState<T>(): Promise<T | undefined> {
  return (await database).get(STORE_NAME, STATE_KEY) as Promise<T | undefined>;
}

export async function writePersistentState<T>(state: T): Promise<void> {
  await (await database).put(STORE_NAME, state, STATE_KEY);
}
