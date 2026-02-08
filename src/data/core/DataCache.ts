import { ObservableStore } from "./ObservableStore"
import { IDatabaseAdapter } from "./IDatabaseAdapter"

export class DataCache {
  private stores = new Map<string, ObservableStore<any>>()
  private unsubscribers = new Map<string, () => void>()

  constructor(private adapter: IDatabaseAdapter) {}

  getStore<T>(key: string, initial: T): ObservableStore<T> {
    if (!this.stores.has(key)) {
      // LOG: Cache Miss. 
      // If you see this repeatedly for the same key, your cache isn't persisting correctly.
      console.log(`[DataCache] Cache MISS for "${key}". Creating new Store.`);
      
      // Pass the key as a debug label to the store
      this.stores.set(key, new ObservableStore<T>(initial, key))
    } else {
        // LOG: Cache Hit.
        console.debug(`[DataCache] Cache HIT for "${key}".`);
    }
    return this.stores.get(key)!
  }

  ensureListening<T>(key: string, initial: T) {
    if (this.unsubscribers.has(key)) {
        // LOG: Redundant Call.
        // Prevents duplicate network subscriptions.
        console.debug(`[DataCache] Already listening to "${key}". Skipping setup.`);
        return
    }

    console.log(`[DataCache] Setting up UPSTREAM connection for "${key}"`);
    const store = this.getStore<T>(key, initial)

    // Using the adapter to get data from the source (Firebase/API)
    const unsubscribe = this.adapter.subscribe<T>(key, data => {
      // LOG: Data Propagation.
      // Shows data moving from Adapter -> Cache Store
      console.debug(`[DataCache] Received upstream data for "${key}". Updating Store.`);
      store.set(data)
    })

    this.unsubscribers.set(key, unsubscribe)
  }

  releaseIfUnused(key: string) {
    const store = this.stores.get(key)
    if (!store) return

    if (!store.hasSubscribers()) {
      // LOG: Garbage Collection / Cleanup.
      // Critical for verifying we aren't keeping Firebase connections open for dead components.
      console.log(`[DataCache] Key "${key}" has no local subscribers. Closing upstream connection.`);
      
      this.unsubscribers.get(key)?.()
      this.unsubscribers.delete(key)
    } else {
        console.debug(`[DataCache] Key "${key}" still has subscribers. Keeping connection alive.`);
    }
  }
}