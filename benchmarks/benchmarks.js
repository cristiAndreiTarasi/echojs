import { createState } from '../echojs/core/state.js';
import { effect, batchUpdates } from '../echojs/core/reactivity.js';
import { createLocalState, disposeLocalState } from '../echojs/core/local.js';
import { reactiveList } from '../echojs/middle/utilities.js';

function logMessage(message) {
    const log = document.getElementById('benchmark-log');
    const div = document.createElement('div');
    div.textContent = message;
    log.appendChild(div);
}

function logMemory(label = '') {
    if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        logMessage(`${label} Memory: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB used / ${(totalJSHeapSize / 1024 / 1024).toFixed(2)} MB total`);
    } else {
        logMessage(`${label} Memory metrics not available`);
    }
}

const benchmarks = [
    {
        name: 'Register 100k Effects',
        run: () => {
            const state = createState({ value: 0 });
            for (let i = 0; i < 100_000; i++) {
                effect(() => state.value);
            }
        }
    },
    {
        name: 'Trigger 100k Effects',
        run: () => {
            const state = createState({ value: 0 });
            for (let i = 0; i < 100_000; i++) {
                effect(() => state.value);
            }
            state.value++;
        }
    },
    {
        name: 'Batch Updates x10k',
        run: () => {
            const state = createState({ value: 0 });
            effect(() => state.value);
            batchUpdates(() => {
                for (let i = 0; i < 10_000; i++) {
                    state.value++;
                }
            });
        }
    },
    {
        name: 'Deep State Access (1000 levels)',
        run: () => {
            let obj = { val: 0 };
            for (let i = 0; i < 1000; i++) obj = { child: obj };
            const state = createState(obj);
            let node = state;
            for (let i = 0; i < 1000; i++) node = node.child;
        }
    },
    {
        name: 'Local State Lifecycle x50k',
        run: () => {
            for (let i = 0; i < 50_000; i++) {
                const state = createLocalState(i, { value: i });
                disposeLocalState(i);
            }
        }
    },
    {
        name: 'Reactive List Mount (10k items)',
        run: () => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const data = Array.from({ length: 10_000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
            let current = data;

            const unmount = reactiveList(container, () => current, i => i.id, i => {
                const el = document.createElement('div');
                el.textContent = i.text;
                return el;
            });

            // remove half after short delay
            setTimeout(() => {
                current = data.slice(0, 5000);
                logMessage('Updated list (removed half)');
            }, 500);

            // unmount after 1s
            setTimeout(() => {
                unmount();
                document.body.removeChild(container);
                logMessage('Unmounted reactive list');
            }, 1000);
        }
    },
    {
        name: 'Massive State Creation (100k)',
        run: () => {
            const items = [];
            for (let i = 0; i < 100_000; i++) {
                items.push(createState({ id: i, value: Math.random() }));
            }
        }
    }
];

export function runBenchmarks() {
    const progress = document.getElementById('progress-bar');
    const total = benchmarks.length;

    (async function executeBenchmarks() {
        for (let i = 0; i < total; i++) {
            const { name, run } = benchmarks[i];

            const start = performance.now();
            await new Promise(resolve => {
                requestIdleCallback(() => {
                    run();
                    resolve();
                });
            });
            const duration = (performance.now() - start).toFixed(2);
            logMessage(`${name}: ${duration} ms`);

            progress.value = i + 1;
        }

        logMemory('After all benchmarks');
        logMessage('✅ Benchmark complete.');
    })();
}
