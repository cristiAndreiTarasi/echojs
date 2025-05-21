const depMap = new WeakMap();
let activeEffect = null;

function effect(fn) {
    const wrapped = () => {
        activeEffect = wrapped;
        fn();
        activeEffect = null;
    };
    wrapped();
}

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

function trigger(target, prop) {
    const propsMap = depMap.get(target);
    if (!propsMap) return;
    const effects = propsMap.get(prop);
    if (effects) {
        effects.forEach(fn => fn());
    }
}

function createState(obj) {
    const handler = {
        get(target, prop, receiver) {
            track(target, prop);
            const val = Reflect.get(target, prop, receiver);
            return (typeof val === 'object' && val !== null)
                ? createState(val)
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
        ['push','pop','shift','unshift','splice','sort','reverse'].forEach(m => {
            const original = obj[m];
            obj[m] = function(...args) {
                const res = original.apply(this, args);
                trigger(obj, 'length'); // simple trigger
                trigger(obj, '[]');     // custom signal for array content
                return res;
            };
        });
    }

    return new Proxy(obj, handler);
}

export { createState, effect };
