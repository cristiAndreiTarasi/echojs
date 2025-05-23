// middle/virtualList.js
import { effect } from '../core/reactivity.js';
import { registerDisposal, disposeNode } from '../core/lifecycle.js';

/**
 * Renders a large list reactively with batching, windowing, and key-based reuse.
 * 
 * @param {HTMLElement} container      Scrollable container element.
 * @param {() => any[]} getItems      Function returning the full items array.
 * @param {(item: any) => string} getKey  Unique key for each item.
 * @param {(item: any) => Node} renderItem  Render function for a single item.
 * @param {{
 *   buffer?: number,   // # items before/after viewport to render
 *   itemHeight: number // fixed height per item (px) needed for virtualization
 * }} [opts]
 * @returns {() => void}  Unmount function
 */
function virtualList(container, getItems, getKey, renderItem, {
    buffer = 5,
    itemHeight
} = {}) {
    // The wrapper that holds all item nodes
    const content = document.createElement('div');
    content.style.position = 'relative';
    container.innerHTML = '';
    container.appendChild(content);

    // Cache: key -> { node, index }
    const nodeCache = new Map();

    let unmountRoot;

    // Root effect: watches the items array for changes
    const rootEffect = effect(() => {
        const items = getItems();
        const total = items.length;
        const viewportHeight = container.clientHeight;
        const scrollTop = container.scrollTop;

        // Calculate window extents
        const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const endIdx = Math.min(
            total,
            Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer
        );

        // Ensure parent has correct total height for scrollbar
        content.style.height = `${total * itemHeight}px`;

        // Build in a fragment for batched DOM ops
        const frag = new DocumentFragment();

        // Track which keys should remain
        const activeKeys = new Set();

        for (let i = startIdx; i < endIdx; i++) {
            const item = items[i];
            const key  = getKey(item);
            activeKeys.add(key);

            let record = nodeCache.get(key);

            if (!record) {
                // Render & cache new node
                const node = renderItem(item);
                node.style.position = 'absolute';
                node.style.top = `${i * itemHeight}px`;
                nodeCache.set(key, { node, index: i });
                frag.appendChild(node);
            } else {
                // Reuse existing node
                const { node } = record;
                node.style.top = `${i * itemHeight}px`;
                record.index = i;
                frag.appendChild(node);
            }
        }

        // Remove old nodes
        for (const [key, record] of nodeCache) {
            if (!activeKeys.has(key)) {
                // Simply remove from DOM & cache
                const { node } = record;
                // no need to remove from DOM manually since fragment insertion moves nodes;
                // but if node is still in content, remove it:
                if (node.parentElement === content) {
                    content.removeChild(node);
                }
                nodeCache.delete(key);
            }
        }

        // Batch-append all active nodes
        content.appendChild(frag);
    });

    // Unmount function
    const unmount = () => {
        rootEffect.dispose();
        for (const { node } of nodeCache.values()) {
            disposeNode(node);
            if (node.parentElement === content) content.removeChild(node);
        }
        nodeCache.clear();
    };

    // Update on scroll
    container.addEventListener('scroll', () => {
        rootEffect(); // re-evaluate window on scroll
    });

    return unmount;
}

export { virtualList };
