export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const wrappedCallback = (...args) => {
            this.off(event, wrappedCallback);
            callback(...args);
        };

        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event).add(wrappedCallback);

        // Return unsubscribe function
        return () => {
            this.off(event, wrappedCallback);
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        // Remove from regular listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.listeners.get(event).size === 0) {
                this.listeners.delete(event);
            }
        }

        // Remove from once listeners
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).delete(callback);
            if (this.onceListeners.get(event).size === 0) {
                this.onceListeners.delete(event);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     */
    emit(event, ...args) {
        // Call regular listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }

        // Call once listeners
        if (this.onceListeners.has(event)) {
            const callbacks = Array.from(this.onceListeners.get(event));
            this.onceListeners.delete(event);
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in once event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Check if an event has listeners
     * @param {string} event - Event name
     * @returns {boolean} True if event has listeners
     */
    hasListeners(event) {
        return (
            (this.listeners.has(event) && this.listeners.get(event).size > 0) ||
            (this.onceListeners.has(event) && this.onceListeners.get(event).size > 0)
        );
    }

    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).size;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).size;
        }
        return count;
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} [event] - Event name (optional)
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
        }
    }

    /**
     * Get all registered event names
     * @returns {string[]} Array of event names
     */
    eventNames() {
        const events = new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
        return Array.from(events);
    }
}
