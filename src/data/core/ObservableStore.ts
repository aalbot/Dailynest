import { Listener } from "./types"; // Assuming types are stored somewhere, based on your context

export class ObservableStore<T> {
    private value: T
    private listeners = new Set<Listener<T>>()

    constructor(initialValue: T, private debugLabel: string = "AnonymousStore") {
        this.value = initialValue
        // LOG: Creation event to track when new stores are instantiated
        console.debug(`[ObservableStore:${this.debugLabel}] Created with initial value:`, initialValue);
    }

    get(): T {
        return this.value
    }

    set(value: T) {
        const oldValue = this.value;
        this.value = value

        // LOG: Critical Data Change. 
        // We log Old vs New to trace state mutations.
        console.log(`[ObservableStore:${this.debugLabel}] SET Value`, {
            from: oldValue,
            to: value
        });

        this.listeners.forEach(listener => listener(value))
    }

    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener)

        // LOG: Lifecycle event. 
        // instant emit happens here, useful to know if a component got data immediately upon subscribing.
        console.debug(`[ObservableStore:${this.debugLabel}] New Subscriber added. Emitting current value.`);

        listener(this.value)

        return () => {
            // LOG: Lifecycle event. 
            // Helps identify memory leaks or premature unmounting.
            console.debug(`[ObservableStore:${this.debugLabel}] Subscriber removed.`);
            this.listeners.delete(listener)
        }
    }

    hasSubscribers(): boolean {
        return this.listeners.size > 0
    }
}