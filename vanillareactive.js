// vanillareactive.js
// Lightweight reactive system for DOM and data synchronization
// Features:
// - Dependency tracking and effects (like signals/computed in reactive systems)
// - Works for nested objects and arrays
// - Can be used with custom DOM mounting strategies

const depMap = new WeakMap(); // Maps targets to property -> effect sets
let activeEffect = null;       // Currently executing effect

/**
 * Registers a reactive effect function to run when dependencies change.
 * @param {Function} fn - Function to track dependencies inside
 */
function effect(fn) {
    const wrapped = () => {
        activeEffect = wrapped;
        fn();
        activeEffect = null;
    };
    wrapped();
}

/**
 * Tracks the dependency for the given target and property.
 * Called automatically by Proxy 'get' trap.
 */
function track(target, prop) {
    if (!activeEffect) return;
    let propsMap = depMap.get(target);
    if (!propsMap) {
        propsMap = new Map();
        depMap.set(target, propsMap);
    }
    let dep = propsMap.get(prop);
    if (!dep) {
        dep = new Set();
        propsMap.set(prop, dep);
    }
    dep.add(activeEffect);
}

/**
 * Triggers all effects registered for a given property.
 * Called automatically by Proxy 'set' trap.
 */
function trigger(target, prop) {
    const propsMap = depMap.get(target);
    if (!propsMap) return;
    const effects = propsMap.get(prop);
    if (effects) {
        effects.forEach(fn => fn());
    }
}

/**
 * Wraps an object or array in a Proxy to enable reactivity.
 * Nested objects are also automatically proxied.
 * @param {Object|Array} obj
 * @returns {Proxy}
 */
function createState(obj) {
    const handler = {
        get(target, prop, receiver) {
            track(target, prop);
            const val = Reflect.get(target, prop, receiver);
            return (typeof val === 'object' && val !== null)
                ? createState(val) // Deep proxy
                : val;
        },
        set(target, prop, value) {
            const old = target[prop];
            const result = Reflect.set(target, prop, value);
            if (old !== value) {
                trigger(target, prop);
            }
            return result;
        }
    };

    if (Array.isArray(obj)) {
        // Patch array methods to trigger updates
        ['push','pop','shift','unshift','splice','sort','reverse'].forEach(m => {
            const original = obj[m];
            obj[m] = function(...args) {
                const res = original.apply(this, args);
                trigger(obj, 'length'); // trigger updates on structural change
                trigger(obj, '[]');     // custom signal to represent content mutation
                return res;
            };
        });
    }

    return new Proxy(obj, handler);
}

export { createState, effect };
