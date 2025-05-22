import { reactiveList } from '../echojs/middle/utilities.js';
import { batch } from '../echojs/core/reactivity.js';
import { addTodo, getTodos } from './store.js';
import { createTodoItem } from './components/todoItem.js';



// --- Form Handling ---
document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text) {
        batch(() => {
            addTodo(input.value.trim());
            input.value = '';
        });
    }
});

// --- Application Bootstrap ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('todoList');
    const unmount = reactiveList(
        container,
        getTodos,
        item => item.id,
        createTodoItem
    );

    window.addEventListener('beforeunload', unmount);
});