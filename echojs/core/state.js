// state.js
// State creation and Proxy logic for deep/shallow reactive tracking

import { track, trigger } from './reactivity.js';

/** @type {WeakMap<Object, any>} */
const proxyCache = new WeakMap();

/**
 * Custom subclass of Array that hooks into the reactivity system.
 */
class ReactiveArray extends Array {
    static get [Symbol.species]() { return Array; }

    constructor(...args) {
        super(...(args.length === 1 && Array.isArray(args[0]) ? args[0] : args));
        this.proxy = null;
    }

    withProxy(proxy) {
        this.proxy = proxy;
        return this;
    }

    triggerMutation() {
        if (this.proxy) {
            trigger(this.proxy, 'length');
            trigger(this.proxy, '[]');
        }
    }

    push(...args) {
        const res = super.push(...args);
        this.triggerMutation();
        return res;
    }

    pop() {
        const res = super.pop();
        this.triggerMutation();
        return res;
    }

    shift() {
        const res = super.shift();
        this.triggerMutation();
        return res;
    }

    unshift(...args) {
        const res = super.unshift(...args);
        this.triggerMutation();
        return res;
    }

    splice(start, deleteCount, ...items) {
        const res = super.splice(start, deleteCount, ...items);
        this.triggerMutation();
        return res;
    }

    sort(compareFn) {
        super.sort(compareFn);
        this.triggerMutation();
        return this;
    }

    reverse() {
        super.reverse();
        this.triggerMutation();
        return this;
    }
}

/**
 * Creates a reactive proxy of an object or array.
 * @param {Object|Array} obj - The raw object or array to proxy
 * @param {Object} [options] - Options for state creation
 * @param {boolean} [options.deep=true] - Whether to deeply proxy nested objects
 * @returns {Proxy} - A reactive proxy
 */
function createState(obj, { deep = true } = {}) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (proxyCache.has(obj)) return proxyCache.get(obj);

    const handler = {
        get(target, prop, receiver) {
            track(target, prop);
            const val = Reflect.get(target, prop, receiver);
            if (deep && typeof val === 'object' && val !== null) {
                return createState(val, { deep });
            }
            return val;
        },
        set(target, prop, value) {
            const old = target[prop];
            const result = Reflect.set(target, prop, value);
            if (old !== value) trigger(target, prop);
            return result;
        }
    };

    let proxy;

    if (Array.isArray(obj)) {
        const safeArray = Array.from(obj);
        const reactiveArray = new ReactiveArray(...safeArray);
        proxy = new Proxy(reactiveArray.withProxy(reactiveArray), handler);
    } else {
        proxy = new Proxy(obj, handler);
    }

    proxyCache.set(obj, proxy);
    return proxy;
}

export { createState };
