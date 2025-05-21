import { createState, effect } from './vanillareactive.js';

// Reactive global state for persistent application data
let nextId = 1;
const state = createState({
    todos: []
});

// Removes a todo item from the persistent state array
function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
}

// Local-only state: stores ephemeral UI state (e.g., counters) per todo item
// These are not persisted or part of the main state
const localStates = new Map();

// Component factory for a todo list item
function spunItem(item) {
    // Lazily initialize and cache local state for this item
    if (!localStates.has(item.id)) {
        localStates.set(item.id, createState({ count: 0 }));
    }
    const localState = localStates.get(item.id);

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

    // Remove from both global and local state
    removeBtn.addEventListener('click', () => {
        localStates.delete(item.id);
        deleteTodo(item.id);
    });

    // Increment local UI-only counter
    incBtn.addEventListener('click', () => {
        localState.count++;
    });

    // Reactive binding of the counter display
    effect(() => {
        countSpan.textContent = localState.count;
    });

    return li;
}

// Binds a reactive state array to a container element using a render function
function mountReactive(el, state, renderFn) {
    const cache = new Map();

    effect(() => {
        // Remove DOM nodes for todos that no longer exist
        for (const [id, node] of cache.entries()) {
            if (!state.todos.some(todo => todo.id === id)) {
                el.removeChild(node);
                cache.delete(id);
            }
        }

        // Add new DOM nodes for todos that are not yet rendered
        state.todos.forEach(item => {
            if (!cache.has(item.id)) {
                const node = renderFn(item);
                cache.set(item.id, node);
                el.appendChild(node);
            }
        });
    });
}

// Handle form submission to add new todos
document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const value = input.value.trim();
    if (value) {
        state.todos.push({ id: nextId++, text: value });
        input.value = '';
    }
});

// When DOM is ready, mount reactive list
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('todoList');
    mountReactive(container, state, spunItem);
});
