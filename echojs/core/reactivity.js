/**
 * @typedef {() => void} EffectFunction
 * @typedef {EffectFunction & { deps: Set<Set<EffectFunction>>, disposed: boolean, dispose: () => void }} WrappedEffect
 */

/** @type {WeakMap<Object, Map<string | symbol, Set<WrappedEffect>>>} */
const depMap = new WeakMap();

/** @type {WrappedEffect | null} */
let activeEffect = null;

/** @type {Set<WrappedEffect>} */
let effectQueue = new Set();

/** @type {boolean} */
let batched = false;

/** @type {Set<WrappedEffect>} */
let queuedEffects = new Set();

/** @type {(error: unknown) => void} */
let globalErrorHandler = (err) => console.error('Reactive error:', err);

/**
 * Sets a custom global error handler for effect execution.
 * @param {(error: unknown) => void} fn
 */
function setErrorHandler(fn) {
    globalErrorHandler = fn;
}

/**
 * Internal: Cleans up dependencies from an effect
 * @param {WrappedEffect} effect
 */
function cleanup(effect) {
    effect.deps.forEach(dep => dep.delete(effect));
    effect.deps.clear();
}

/**
 * Schedules an effect to be executed on the microtask queue.
 * @param {WrappedEffect} effectFn
 */
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
 * Registers a reactive effect that re-runs when its dependencies change.
 * @param {EffectFunction} fn
 * @returns {WrappedEffect}
 */
function effect(fn) {
    const wrapped = () => {
        if (wrapped.disposed) return;
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
    wrapped();
    return wrapped;
}

/**
 * Tracks access to a property for dependency collection.
 * @param {Object} target
 * @param {string | symbol} prop
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
 * Triggers reactivity for a property on a target object.
 * @param {Object} target
 * @param {string | symbol} prop
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

/**
 * Batches multiple state updates to minimize re-runs of dependent effects.
 * @param {() => void} fn
 */
function batchUpdates(fn) {
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

export { effect, track, trigger, batchUpdates, setErrorHandler };