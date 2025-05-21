import { createState, observeDOM } from './vanillareactive.js';

const state = createState({
    todos: [
        { id: 1, text: 'First Item' }
    ],
    newTodo: ''
});

function addTodo() {
    if (state.newTodo.trim()) {
        state.todos.push({
            id: Date.now(),
            text: state.newTodo
        });
        state.newTodo = '';
    }
}

function deleteTodo(id) {
    const index = state.todos.findIndex(todo => todo.id === id);
    if (index > -1) {
        state.todos.splice(index, 1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    observeDOM(document.body, state);

    document.getElementById('add-todo-btn').addEventListener('click', addTodo);

    document.querySelector('ul').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const listItem = e.target.closest('li');
            const textContent = listItem.querySelector('span').textContent;
            const todo = state.todos.find(todo => todo.text === textContent);
            if (todo) deleteTodo(todo.id);
        }
    });

    // Optional performance test
    setTimeout(() => {
        const newItems = Array.from({ length: 10 }, (_, i) => ({
            id: Date.now() + i,
            text: `Item ${i + 2}`
        }));
        state.todos.push(...newItems);
    }, 1000);
});