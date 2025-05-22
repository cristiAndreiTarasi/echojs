import { createState } from "./state.js";

/** @type {Map<string, any>} */
const localStateMap = new Map();

/**
 * Creates or retrieves a shallow reactive state scoped to a unique key.
 * @param {string} key - A unique key for the local state
 * @param {Object|Array} [initial={}] - Initial value for the state
 * @returns {any} - Reactive proxy object or array
*/
export function createLocalState(key, initial = {}) {
    if (!localStateMap.has(key)) {
        localStateMap.set(key, createShallowState(initial));
    }
    return localStateMap.get(key);
}

/**
 * Creates a shallow reactive proxy (no deep proxying of nested objects).
 * @param {Object|Array} obj - The raw object or array
 * @returns {Proxy} - A shallow reactive proxy
 * @private
 */
function createShallowState(obj) {
    return createState(obj, { deep: false });
}

/**
 * Deletes ephemeral state associated with a key.
 * @param {string} key
*/
export function disposeLocalState(key) {
    localStateMap.delete(key);
}
