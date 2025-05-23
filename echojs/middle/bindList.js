// middle/binder.js

import { reactiveList } from './reactiveList.js';
import { virtualList  } from './virtualList.js';

/** 
 * Registry of per-array render configurations.
 * We key by the raw proxy object.
 * @type {WeakMap<any[], { key: (item:any)=>string, render: (item:any)=>Node }>}
 */
const rendererRegistry = new WeakMap();

/**
 * Register how to extract a key and render a DOM node for
 * each item in a reactive array.
 *
 * @param {any[]} array
 * @param {{ key: (item:any)=>string, render: (item:any)=>Node }} cfg
 */
export function registerListRenderer(array, cfg) {
    if (!Array.isArray(array)) {
        throw new Error('registerListRenderer: first argument must be an array');
    }

    if (typeof cfg.key !== 'function' || typeof cfg.render !== 'function') {
        throw new Error('registerListRenderer: cfg must have key() and render() functions');
    }

    rendererRegistry.set(array, { key: cfg.key, render: cfg.render });
}

/**
 * Bind a reactive array to a container in either full or virtualized mode.
 *
 * @param {HTMLElement} container
 * @param {any[]}        array   - A reactive array from createState()
 * @param {{
 *   virtual?: { itemHeight: number, buffer?: number }
 * }} [opts]
 * @returns {() => void}  Unmount function
 */
export function bindList(container, getItems, opts = {}) {
    const array = getItems();
    const cfg = rendererRegistry.get(array);

    if (!cfg) {
        throw new Error('bindList: no renderer registered for this array. ' +
        'Call registerListRenderer(array, { key, render }) first.');
    }

    // Choose full or virtualized
    if (opts.virtual) {
        return virtualList(
            container,
            getItems,
            cfg.key,
            cfg.render,
            opts.virtual
        );
    } else {
        return reactiveList(
            container,
            getItems,
            cfg.key,
            cfg.render,
        );
    }
}
