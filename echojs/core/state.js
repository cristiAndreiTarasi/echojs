// state.js
// State creation and Proxy logic for deep/shallow reactive tracking

import { Mode } from '../common/constants.js';
import { track, trigger } from './reactivity.js';

/** @type {WeakMap<Object, any>} */
const proxyCache = new WeakMap();

/**
 * Creates a reactive proxy of an object or array.
 * @param {Object|Array} obj
 * @param {{ mode?: Mode }} [options]
 * @returns {Proxy} - A reactive proxy
 */
function createState(obj, { mode = Mode.SHALLOW } = {}) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (proxyCache.has(obj)) return proxyCache.get(obj);

    const childCache = new WeakMap();

    const handler = {
        get(target, prop, receiver) {
            track(target, prop);
            const val = Reflect.get(target, prop, receiver);

            if (mode === Mode.MANUAL) {
                return val;
            }

            if (mode === Mode.DEEP && typeof val === 'object' && val !== null) {
                if (childCache.has(val)) return childCache.get(val);
                const p = createState(val, { mode });
                childCache.set(val, p);
                return p;
            }

            return val;
        },

        set(target, prop, value, receiver) {
            const old = target[prop];
            const ok = Reflect.set(target, prop, value, receiver);
            if (old === value) return ok;

            const isArray = Array.isArray(target);
            const isNumericKey = !isNaN(prop);
            const isLengthProp = prop === 'length';

            // if it's an array index or length change, trigger both index & length
            if (isArray && (isNumericKey || isLengthProp)) {
                // index change
                if (isNumericKey) {
                    trigger(target, prop);
                }
                // always trigger length when array changes
                trigger(target, 'length');
            } else {
                // plain object or non-array prop
                trigger(target, prop);
            }

            return ok;
        }
    };

    const proxy = new Proxy(obj, handler);
    proxyCache.set(obj, proxy);
    return proxy;
}

export { createState };
