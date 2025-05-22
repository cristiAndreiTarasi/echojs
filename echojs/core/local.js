import { Mode } from "../middle/constants.js";
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
        localStateMap.set(key, createState(obj, { mode: Mode.SHALLOW }));
    }
    return localStateMap.get(key);
}

/**
 * Deletes ephemeral state associated with a key.
 * @param {string} key
*/
export function disposeLocalState(key) {
    localStateMap.delete(key);
}
