import { effect } from '../core/reactivity.js';
import { disposeNode } from '../core/lifecycle.js';

/**
 * Mounts a reactive list of items into a DOM container.
 * Handles diffing, cleanup, and DOM updates.
 *
 * @template T
 * @param {HTMLElement} container
 * @param {() => T[]} getItems
 * @param {(item: T) => string} getKey
 * @param {(item: T) => Node} renderItem
 * @returns {() => void}
 */
export function reactiveList(container, getItems, getKey, renderItem) {
    // Cache mapping item IDs to their corresponding DOM nodes
    /** @type {Map<string, Node>} */
    const nodeCache = new Map(); // id => DOM node

    // Root effect watches the reactive array (via getItems())
    const rootEffect = effect(() => {
        const items = getItems();
        const seenIds = new Set();

        // Mount new or existing items
        items.forEach(item => {
            const id = getKey(item);
            seenIds.add(id);

            // If this item hasn't been rendered before, render & append it
            if (!nodeCache.has(id)) {
                const node = renderItem(item);
                nodeCache.set(id, node);
                container.appendChild(node);
            }
        });

        // Unmount removed items
        // For each previously cached node, if its ID is no longer in seenIds,
        // we need to tear it down and remove it from the DOM & cache.
        Array.from(nodeCache.keys()).forEach(id => {
            if (!seenIds.has(id)) {
                const node = nodeCache.get(id);

                // Run any cleanup tied to this node (effects, listeners, local state)
                disposeNode(node);

                // Physically remove the element from the DOM
                container.removeChild(node);

                // Remove the reference from our cache so it can be GC'd
                nodeCache.delete(id);
            }
        });
    });

    // Return a full unmount function:
    //  - Dispose the root effect so no further diffing occurs
    //  - Clean up & remove all remaining nodes
    //  - Clear the cache
    return () => {
        // Stop watching the array entirely
        rootEffect.dispose();

        // For each node still in the cache:
        Array.from(nodeCache.values()).forEach(node => {
            disposeNode(node);            // run per-node cleanup
            container.removeChild(node);  // remove from DOM
        });

        // Finally clear the cache map
        nodeCache.clear();
    };
}
