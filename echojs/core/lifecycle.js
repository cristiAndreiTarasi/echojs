const disposalRegistry = new WeakMap();

/**
 * Registers a disposal function for a DOM node.
 * @param {Node} node - The DOM node to track.
 * @param {() => void} disposeFn - The cleanup function to call on disposal.
 */
export function registerDisposal(node, disposeFn) {
    disposalRegistry.set(node, disposeFn);
}

/**
 * Retrieves the disposal function for a node.
 * @param {Node} node - The DOM node to check.
 * @returns {void}
 */
export function disposeNode(node) {
    const fn = disposalRegistry.get(node);
    if (fn) fn();
    disposalRegistry.delete(node);
}
