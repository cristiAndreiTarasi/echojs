/**
 * @typedef {() => void} EffectFunction
 * @typedef {EffectFunction & { '
    * deps: Set<Set<EffectFunction>>, 
    * disposed: boolean, 
    * dispose: () => void 
 * }} WrappedEffect
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

/** Pool of disposed wrappers, by original callback fn */
const wrapperPool = new WeakMap();

/**
 * Sets a custom global error handler for effect execution.
 * @param {(error: unknown) => void} fn
 */
function setErrorHandler(fn) {
    globalErrorHandler = fn;
}

/**
 * Internal: Cleans up dependencies from an effect
 * Fast-path: if no deps, skip.
 * @param {WrappedEffect} effect
 */
function cleanup(effect) {
    if (effect.deps.size === 0) return; // fast path
    for (const dep of effect.deps) dep.delete(effect);
    effect.deps.clear();
}

/**
 * Schedules an effect to run in the next microtask.
 * Coalesces duplicates via a Set and an “already queued” check.
 * @param {WrappedEffect} effectFn
 */
function scheduleEffect(effectFn) {
    // if it’s low-priority, use requestIdleCallback
    if (effectFn.idle && typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
            try { effectFn(); }
            catch (e) { globalErrorHandler(e); }
        });
        return;
    }

    // otherwise microtask as before
    if (effectQueue.has(effectFn)) return; // already schedules
    effectQueue.add(effectFn);

    queueMicrotask(() => {
        const effects = Array.from(effectQueue);
        effectQueue.clear();
        
        effects.forEach(fn => {
            try { fn(); }
            catch (e) { globalErrorHandler(e); }
        });
    });
}

/**
 * Registers a reactive effect that re-runs when its dependencies change.
 * Uses a pool of wrappers to reduce GC churn.
 * @param {() => void} fn
 * @param {{ idle?: boolean }} [opts]
 */
function effect(fn, { idle = false } = {}) {
    // Try to reuse a disposed wrapper for this fn
    const pool = wrapperPool.get(fn) || [];
    let wrapped = pool.pop();
    
    if (!wrapped) {
        wrapped = () => {
            if (wrapped.disposed) return;
            cleanup(wrapped);
            activeEffect = wrapped;

            try {
                fn();
            } catch (error) {
                globalErrorHandler(error);
            } finally {
                activeEffect = null;
            }
        };

        wrapped.deps = new Set();
        wrapped.disposed = false;
        
        wrapped.dispose = () => {
            if (wrapped.disposed) return;
            wrapped.disposed = true;
            cleanup(wrapped);

            //return to pool
            const p = wrapperPool.get(fn) || [];
            wrapperPool.set(fn, p);
        };
    } else {
        // reinitialize
        wrapped.deps = new set();
        wrapped.disposed = false;
    }
    
    wrapped.idle = idle;  // mark its scheduling preference
    wrapped(); // run immediately to collect initial deps
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

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.add(dep);
    }
}

/**
 * Triggers reactivity for a property on a target object.
 * @param {Object} target
 * @param {string | symbol} prop
 */
function trigger(target, prop) {
    const propsMap = depMap.get(target);
    if (!propsMap) return;

    const effectsToRun = new Set();
    const addDeps = depSet => depSet && depSet.forEach(fn => effectsToRun.add(fn));
    
    //numeric index on an Array?
    if (Array.isArray(target) && !isNaN(prop)) {
        //only trigger effects for this exact index
        const idxDeps = propsMap.get(prop);
        addDeps(idxDeps);

        // if new index >= old length, also trigger length deps
        const idx = Number(prop);

        if (idx >= target.length) {
            const lenDeps = propsMap.get('length');
            addDeps(lenDeps);
        }
    } else {
        // non array or non numeric -> trigger exactly that key
        const deps = propsMap.get(prop);
        addDeps(deps);
    }
    
    //schedule
    effectsToRun.forEach(effect => {
        if (batched) {
            queuedEffects.add(effect);
        } else {
            scheduleEffect(effect);
        }
    });
}

/**
 * Two-phase batch:
 *  - Phase 1: run all state mutations under batched=true
 *  - Phase 2: after internal effects flush, run your `renderFn` as a microtask
 *
 * @param {() => void} dataFn - heavy state mutations
 * @param {() => void} [renderFn] - optionsl UI-flush or side-effects
 */
function batchUpdates(dataFn, renderFn) {
    // Phase 1: collect all triggers
    batched = true;

    try {
        dataFn();
    } finally {
        batched = false;
        // flush all reactive effects now
        const toNotify = Array.from(queuedEffects);

        queuedEffects.clear();
        toNotify.forEach(scheduleEffect);

        //Phase 2: let user run render/update logic
        if (typeof renderFn === 'function') {
            queueMicrotask(renderFn);
        }
    }
}

export { effect, track, trigger, batchUpdates, setErrorHandler };