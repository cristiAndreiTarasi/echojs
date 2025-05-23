import { batchUpdates } from '../../echojs/core/reactivity.js';
import { addTodo, getTotalCount, store } from './store.js';
import { effect } from '../echojs/core/reactivity.js';
import { bindList } from '../echojs/middle/bindList.js';

// --- Form Handling ---
document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text) {
        /**
         * Grouping multiple state updates in a `batch` prevents unnecessary
         * re-running of reactive effects in between updates.
         * 
         * Without `batch`, the first state change (adding to `todos`)
         * might trigger effects that rerender views.
         * 
         * With `batch`, the changes are "held" until all are complete.
         * This ensures a single, efficient update to the UI.
         */
        batchUpdates(() => {
            addTodo(text); 
            input.value = '';
        });

        /**
         * But we could use a 2 phase batcahUpdates if we have heavy computations
         * we can separate data batching from iui rendering
         * 
         * batchUpdates(
         *   () => {
         *     // Phase 1: all your heavy mutates here…
         *     addTodo(text);
         *     // potentially dozens of changes or complex loops…
         *   },
         *   () => {
         *     // Phase 2: run *after* all reactive effects have flushed,
         *     // if you have extra cleanup or post-render logic
         *     input.value = '';
         *     logAnalytics(); // fire after UI update
         *   }
         * );
        */
    }
});

// --- Application Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
    // const ul = document.getElementById('todoList');
    // const unmount = bindList(ul, () => store.todos);

    // For virtualization:
    const big = document.getElementById('todoList');
    const unmountBig = bindList(big, () => store.todos, {
        virtual: { itemHeight: 50, buffer: 10 }
    });

    const counterEl = document.getElementById('counter');

    effect(() => {
        counterEl.textContent = `Total todos added: ${getTotalCount()}`;
    });

    // window.addEventListener('beforeunload', unmount);
    window.addEventListener('beforeunload', unmountBig);
});