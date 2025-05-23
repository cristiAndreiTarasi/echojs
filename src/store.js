
import { createState } from '../echojs/core/state.js';

/* State */
export const store = createState({
    todos: [],
    totalAdded: 0,
});

/* Selectors */
export const getTodos = () => store.todos;
export const getTotalCount = () => store.totalAdded;

/* Actions */
let nextId = 1;
export function addTodo(text) {
    store.todos = [...store.todos, { id: nextId++, text }];
    store.totalAdded++;
}

export function removeTodo(id) {
    store.todos = store.todos.filter(t => t.id !== id);
}