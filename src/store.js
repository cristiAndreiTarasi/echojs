import { createState } from "../echojs/core/state.js";

/* State */
const store = createState({
    todos: [],
});

/* Selectors */
export const getTodos = () => store.todos;

/* Actions */
let nextId = 1;
export function addTodo(text) {
    store.todos = [...store.todos, { id: nextId++, text }];
}

export function removeTodo(id) {
    store.todos = store.todos.filter(t => t.id !== id);
}