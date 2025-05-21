import { registerDisposal } from './echojs/lifecycle.js';
import { mountList } from './echojs/list.js';
import { createLocalState, disposeLocalState } from './echojs/local.js';
import { effect, batch } from './echojs/reactivity.js';
import { createState } from './echojs/state.js';

// --- Reactive State Management ---
let nextId = 1;
const store = createState({
    todos: [],
});

// Component factory for a todo list item
function createTodoItem(item) {
    // Component state (shallow for performance)
    const localState = createLocalState(item.id, { count: 0 });

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
        store.todos = store.todos.filter(t => t.id !== item.id);
    });

    incBtn.addEventListener('click', () => {
        localState.count++;
    });

    // --- Reactive Bindings ---
    const disposeEffect = effect(() => {
        countSpan.textContent = localState.count;
    });

    // --- Cleanup Registration ---
    registerDisposal(li, () => {
        disposeEffect.dispose();
        disposeLocalState(item.id);
    });

    return li;
}

// --- Form Handling ---
document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text) {
        batch(() => {
            store.todos = [...store.todos, {
                id: nextId++,
                text: text
            }];
            input.value = '';
        });
    }
});

// --- Application Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('todoList');
    const unmount = mountList(
        container,
        () => store.todos,
        item => item.id,
        createTodoItem
    );

    window.addEventListener('beforeunload', unmount);
});