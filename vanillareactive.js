/**
 * A tiny reactive engine:
 * - reactive state via Proxy
 * - dependency tracking (track/trigger)
 * - array reactivity
 * - declarative template rendering (data-each, data-bind, data-on)
 */

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
                return res;
            };
        });
    }

    return new Proxy(obj, handler);
}

/**
 * Mounts and renders all templates bound with data-each
 * @param {HTMLElement} root 
 * @param {object} state 
 */
function mount(root, state) {
    root.querySelectorAll('[data-each]').forEach(container => {
        const templateId = container.dataset.template;
        const keypath = container.dataset.each;
        const template = document.getElementById(templateId);

        if (!template || !keypath) {
            console.warn(`Missing template or keypath in`, container);
            return;
        }

        effect(() => {
            container.innerHTML = '';
            const arr = keypath.split('.').reduce((o,k) => o?.[k], state) || [];
            if (!Array.isArray(arr)) return;

            arr.forEach(item => {
                const clone = template.content.cloneNode(true);
                const rootEl = clone.firstElementChild;

                rootEl?.querySelectorAll('[data-bind]').forEach(el => {
                    const [prop, path] = el.dataset.bind.split(':').map(s => s.trim());
                    if (prop && path) {
                        const key = path.replace(/^item\./, '');
                        el[prop] = item[key];
                    }
                });

                rootEl?.querySelectorAll('[data-on]').forEach(el => {
                    const [event, expr] = el.dataset.on.split(':').map(s => s.trim());
                    el.addEventListener(event, () => {
                        new Function('state', 'item', expr)(state, item);
                    });
                });

                container.appendChild(clone);
            });
        });
    });
}

export { createState, effect, track, trigger, mount };
