// vanillareactive.js
// Lightweight reactive system for DOM and data synchronization
// Features:
// - Dependency tracking and effects (like signals/computed in reactive systems)
// - Works for nested objects and arrays
// - Can be used with custom DOM mounting strategies

// Core reactivity system
const depMap = new WeakMap(); // Maps targets to property -> effect sets
let activeEffect = null;       // Currently executing effect
let batched = false;
let queuedEffects = new Set();
let effectQueue = new Set();
const proxyCache = new WeakMap();

// Effect disposers and cleanup
const effectDisposers = new WeakMap();

// Error handling
// Error handling
let globalErrorHandler = (err) => console.error('Reactive error:', err);
function setErrorHandler(fn) { globalErrorHandler = fn; }

// Concurrency scheduler
function scheduleEffect(effectFn) {
    effectQueue.add(effectFn);
    queueMicrotask(() => {
        const effects = Array.from(effectQueue);
        effectQueue.clear();
        effects.forEach(fn => {
            try {
                fn();
            } catch (e) {
                globalErrorHandler(e);
            }
        });
    });
}


/**
 * Registers a reactive effect function to run when dependencies change.
 * @param {Function} fn - Function to track dependencies inside
 */
function effect(fn) {
    const wrapped = () => {
        if (wrapped.disposed) return; // Changed from 'dispose' to 'disposed'
        cleanup(wrapped);
        activeEffect = wrapped;

        try {
            fn();
        } catch (error) {
            globalErrorHandler(error);
        }
        
        activeEffect = null;
    };
    
    wrapped.deps = new Set();
    wrapped.disposed = false; 
    wrapped.dispose = () => {
        wrapped.disposed = true; 
        cleanup(wrapped);
    };

    function cleanup(effect) {
        effect.deps.forEach(dep => dep.delete(effect));
        effect.deps.clear();
    }

    wrapped();
    return wrapped;
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
    activeEffect.deps.add(dep);
}

/**
 * Triggers all effects registered for a given property.
 * Called automatically by Proxy 'set' trap.
 */
function trigger(target, prop) {
    const propsMap = depMap.get(target);
    if (!propsMap) return;

    const effects = propsMap.get(prop) || new Set();
    const lengthEffects = propsMap.get('length') || new Set();
    const allEffects = new Set([...effects, ...lengthEffects]);

    allEffects.forEach(effect => {
        if (batched) {
        queuedEffects.add(effect);
        } else {
        scheduleEffect(effect);
        }
    });
}

// Batched updates
function batch(fn) {
    if (batched) return fn();
    batched = true;

    try {
        fn();
    } finally {
        batched = false;
        const effects = Array.from(queuedEffects);
        queuedEffects.clear();
        effects.forEach(scheduleEffect);
    }
}

// Reactive array subclass
class ReactiveArray extends Array {
    static get [Symbol.species]() { return Array; }

    constructor(...args) {
        // Ensure valid array construction
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
 * Wraps an object or array in a Proxy to enable reactivity.
 * Nested objects are also automatically proxied.
 * @param {Object|Array} obj
 * @returns {Proxy}
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

function createShallowState(obj) {
    return createState(obj, { deep: false });
}

export { createState, createShallowState, effect, batch, setErrorHandler };
