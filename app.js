import { effect, batch } from './echojs/reactivity.js';
import { createState, createShallowState } from './echojs/state.js';

// --- Reactive State Management ---
let nextId = 1;
const state = createState({
    todos: []
});

// --- Component Utilities ---
const disposalRegistry = new WeakMap(); // Tracks cleanup functions for DOM nodes
const localStates = new Map();         // Component-scoped state

function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
}

// Component factory for a todo list item
function createTodoItem(item) {
    // Component state (shallow for performance)
    const localState = createShallowState({ count: 0 });
    localStates.set(item.id, localState);

    // Create the DOM node
    const template = document.createElement('template');
    template.innerHTML = `
        <li data-id="${item.id}">
            <span style="cursor:pointer">${item.text}</span>
            <button class="remove">&times;</button>
            <button class="increment">+1</button>
            <span class="count">0</span>
        </li>
    `.trim();

    const li = template.content.firstChild;
    const removeBtn = li.querySelector('.remove');
    const incBtn = li.querySelector('.increment');
    const countSpan = li.querySelector('.count');

    // --- Event Handlers ---
    removeBtn.addEventListener('click', () => {
        deleteTodo(item.id);
    });

    incBtn.addEventListener('click', () => {
        localState.count++;
    });

    // --- Reactive Bindings ---
    const disposeEffect = effect(() => {
        countSpan.textContent = localState.count;
    });

    // --- Cleanup Registration ---
    const dispose = () => {
        disposeEffect.dispose();
        localStates.delete(item.id);
    };

    disposalRegistry.set(li, dispose);
    return li;
}

// --- List Manager ---
function mountTodoList(container, state) {
    const nodeCache = new Map(); // Tracks mounted nodes

    const rootEffect = effect(() => {
        // Cleanup removed items
        Array.from(nodeCache.keys()).forEach(id => {
            if (!state.todos.some(todo => todo.id === id)) {
                const node = nodeCache.get(id);
                const dispose = disposalRegistry.get(node);
                dispose?.();
                container.removeChild(node);
                nodeCache.delete(id);
            }
        });

        // Add new items
        state.todos.forEach(item => {
            if (!nodeCache.has(item.id)) {
                const node = createTodoItem(item);
                nodeCache.set(item.id, node);
                container.appendChild(node);
            }
        });
    });

    return () => {
        rootEffect.dispose();
        Array.from(nodeCache.values()).forEach(node => {
            const dispose = disposalRegistry.get(node);
            dispose?.();
            container.removeChild(node);
        });
        nodeCache.clear();
    };
}

// --- Form Handling ---
document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text) {
        batch(() => {
            state.todos.push({
                id: nextId++,
                text: text
            });
            input.value = '';
        });
    }
});

// --- Application Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('todoList');
    const unmount = mountTodoList(container, state);

    document.getElementById('addMany')?.addEventListener('click', () => {
        batch(() => {
            for (let i = 0; i < 100; i++) {
                state.todos.push({
                    id: nextId++,
                    text: `Item ${nextId}`
                });
            }
        });
    });

    window.addEventListener('beforeunload', unmount);
});