import { effect } from './reactivity.js';
import { disposeNode } from './lifecycle.js';

/**
 * Mounts a reactive list of items into a DOM container.
 * Handles diffing, cleanup, and DOM updates.
 *
 * @param {HTMLElement} container - DOM node to render into
 * @param {Array} items - Reactive list of items
 * @param {Function} getKey - Function to extract a unique ID from item
 * @param {Function} renderItem - Function to render an item to a DOM node
 * @returns {Function} Unmount callback
 */
export function mountList(container, getItems, getKey, renderItem) {
    const nodeCache = new Map(); // id => DOM node

    const rootEffect = effect(() => {
        const items = getItems();
        const seenIds = new Set();

        // Mount new or existing items
        items.forEach(item => {
            const id = getKey(item);
            seenIds.add(id);

            if (!nodeCache.has(id)) {
                const node = renderItem(item);
                nodeCache.set(id, node);
                container.appendChild(node);
            }
        });

        // Unmount removed items
        Array.from(nodeCache.keys()).forEach(id => {
            if (!seenIds.has(id)) {
                const node = nodeCache.get(id);
                disposeNode(node);
                container.removeChild(node);
                nodeCache.delete(id);
            }
        });
    });

    return () => {
        rootEffect.dispose();
        Array.from(nodeCache.values()).forEach(node => {
            disposeNode(node);
            container.removeChild(node);
        });
        nodeCache.clear();
    };
}
