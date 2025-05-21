import { createState, effect } from './vanillareactive.js';

let nextId = 1;
const state = createState({
    todos: [],
    removeTodo(id) {
        state.todos = state.todos.filter(t => t.id !== id);
    }
});

function spunItem(item) {
    const localState = createState({ count: 0 });

    const template = document.createElement('template');
    template.innerHTML = `
        <li data-id="${item.id}">
            <span style="cursor:pointer">${item.text}</span>
            <button class="remove">×</button>
            <button class="increment">+1</button>
            <span class="count">0</span>
        </li>
    `.trim();

    const li = template.content.firstChild;

    li.querySelector('.remove').addEventListener('click', () => state.removeTodo(item.id));
    li.querySelector('.increment').addEventListener('click', () => localState.count++);

    const countSpan = li.querySelector('.count');

    effect(() => {
        countSpan.textContent = localState.count;
    });

    return li;
}

function renderTodoList(container, todos) {
    // Static map to track rendered todos by id
    if (!renderTodoList.rendered) {
        renderTodoList.rendered = new Map();
    }
    const rendered = renderTodoList.rendered;

    // Remove items that no longer exist
    for (const [id, el] of rendered.entries()) {
        if (!todos.some(todo => todo.id === id)) {
            container.removeChild(el);
            rendered.delete(id);
        }
    }

    // Add new items only
    todos.forEach(item => {
        if (!rendered.has(item.id)) {
            const el = spunItem(item);
            rendered.set(item.id, el);
            container.appendChild(el);
        }
    });
}

document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const value = input.value.trim();
    if (value) {
        state.todos.push({ id: nextId++, text: value });
        input.value = '';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('todoList');

    effect(() => {
        // Trigger on array changes
        // state.todos.length; 
        state.todos['[]'];  // Custom read to enable trigger
        renderTodoList(container, state.todos);
    });
});
