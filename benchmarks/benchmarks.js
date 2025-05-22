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
    },
    {
        name: 'Effect Churn (100k create/dispose)',
        run: () => {
            for (let i = 0; i < 100_000; i++) {
            const state = createState({ value: i });
            const eff = effect(() => state.value);
            eff.dispose();
            }
        }
    },
    {
        name: 'Array Index Writes (10k updates)',
        run: () => {
            const arr = createState(Array(10_000).fill(0));
            effect(() => arr.reduce((a, b) => a + b));
            batchUpdates(() => {
                for (let i = 0; i < 10_000; i++) {
                    arr[i] = Math.random();
                }
            });
        }
    },
    {
        name: 'Deep Mutation (1k levels)',
        run: () => {
            let obj = {};
            let current = obj;
            for (let i = 0; i < 1000; i++) {
                current.child = { value: 0 };
                current = current.child;
            }
            const state = createState(obj);
            effect(() => state.child.child /* ...1k times */.value);
            current.value = 1;
        }
    },
    {
        name: 'Nested Updates Propagation (Depth-10)',
        run: () => {
            let root = {};
            let current = root;
            for (let i = 0; i < 10; i++) {
                current.child = { value: 0 };
                current = current.child;
            }
            const state = createState(root);

            // Get deepest node
            let deepest = root;
            for (let i = 0; i < 10; i++) deepest = deepest.child;

            let effectRun = false;
            effect(() => {
                deepest.value; // Track deepest node
                effectRun = true;
            });

            const start = performance.now();
            batchUpdates(() => {
                deepest.value = 1; // Mutate deepest node
            });
            const duration = performance.now() - start;

            if (!effectRun) logMessage('⚠️ Effect did not trigger!');
            return duration;
        }
    },
    {
        name: 'List In-Place Updates (5k Items)',
        run: () => {
            return new Promise(async (resolve) => {
                const container = document.createElement('div');
                document.body.appendChild(container);

                const data = Array.from({ length: 10_000 }, (_, i) => ({
                    id: i,
                    text: `Item ${i}`,
                }));
                const state = createState({ items: data });

                // Mount list
                const unmount = reactiveList(
                    container,
                    () => state.items,
                    item => item.id,
                    item => {
                        const el = document.createElement('div');
                        el.textContent = item.text;
                        el.dataset.expected = item.text + '!'; // Store expected
                        return el;
                    }
                );

                // Update 5k items
                const start = performance.now();
                batchUpdates(() => {
                    state.items.slice(0, 5000).forEach(item => {
                        item.text += '!';
                    });
                });

                // Wait for DOM flush
                await new Promise(resolve => setTimeout(resolve, 0));
                const duration = performance.now() - start;

                // Validate
                let errorCount = 0;
                for (let i = 0; i < 5000; i++) {
                    const expected = container.children[i]?.dataset.expected;
                    if (container.children[i]?.textContent !== expected) {
                        errorCount++;
                    }
                }
                if (errorCount > 0) {
                logMessage(`⚠️ ${errorCount} DOM nodes failed to update`);
                }

                unmount();
                document.body.removeChild(container);
                resolve(duration);
            });
        }
    },
    {
        name: 'Sustained Updates (100k increments)',
        run: () => {
            const state = createState({ count: 0 });
            effect(() => document.title = state.count);
            
            let cycles = 0;
            const interval = setInterval(() => {
                batchUpdates(() => { state.count++ });
                if (++cycles >= 100) clearInterval(interval);
            }, 10);
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
