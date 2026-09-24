import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'
import { registerTaskMutations } from '@/features/tasks/mutations'
import { env } from './env'

const WEEK = 1000 * 60 * 60 * 24 * 7

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve cached data first, then refetch when online. Works offline.
      networkMode: 'offlineFirst',
      staleTime: 30_000,
      // Must be >= persister maxAge or restored queries are garbage-collected.
      gcTime: WEEK,
      retry: 1,
    },
    mutations: {
      // 'online' pauses mutations while offline; they resume on reconnect.
      networkMode: 'online',
    },
  },
})

// Mutation logic lives in defaults (not in hooks) so paused mutations restored
// from IndexedDB after a reload still know which function to run.
registerTaskMutations(queryClient)

/** Query cache + paused mutations are persisted to IndexedDB. */
export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'tms-query-cache',
  throttleTime: 1000,
})

export const persistOptions = {
  persister,
  maxAge: WEEK,
  // Bump the app version to discard caches written by an incompatible build.
  buster: env.appVersion,
}
