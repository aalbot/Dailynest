import { useEffect, useState } from "react"
import { DataProvider } from "../core/DataProvider"

export function useData<T>(
  provider: DataProvider,
  key: string,
  initial: T
): T {
  // LOG: Hook Initialization.
  // Note: This runs on every render, so we use console.debug to avoid noise,
  // or rely on the useEffect log below for meaningful lifecycle events.
  const [data, setData] = useState<T>(initial)

  useEffect(() => {
    // LOG: Mount Event.
    // This tells you exactly when a component requested data.
    console.log(`[useData Hook] MOUNTED. Observing key: "${key}"`);

    const observable = provider.observe<T>(key, initial)
    
    const unsubscribe = observable.subscribe((newData) => {
        // LOG: React State Update.
        // This triggers a re-render of the UI.
        console.debug(`[useData Hook] Received Update for "${key}". Triggering re-render.`);
        setData(newData)
    })

    // Cleanup function
    return () => {
        // LOG: Unmount Event.
        // If this doesn't fire when you navigate away, you have a memory leak.
        console.log(`[useData Hook] UNMOUNTED. Unsubscribing from key: "${key}"`);
        unsubscribe()
    }
  }, [key, provider]) // Added provider to deps array for correctness

  return data
}