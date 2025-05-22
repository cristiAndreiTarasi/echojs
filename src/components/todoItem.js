import { createLocalState, disposeLocalState } from '../../echojs/core/local.js';
import { registerDisposal } from '../../echojs/core/lifecycle.js';
import { effect } from '../../echojs/core/reactivity.js';
import { removeTodo } from '../store.js';

// Component factory for a todo list item
export const createTodoItem = item => {
    // 1. Create shallow local state for this item.
    //    You can easily add more fields here (e.g. editing, completed, etc.).
    const localState = createLocalState(item.id, { 
        count: 0,
        // completed: false,
        // editingText: item.text,
        // …any other piece of per-item state
     });

    // Create the DOM node
    const template = document.createElement('template');
    template.innerHTML = `
        <li data-id="${item.id}">
            <span style="cursor:pointer">${item.text}</span>
            <button class="remove">&times;</button>
            <button class="increment">Add +1</button>
            <span class="count">0</span>
        </li>
    `.trim();

    const li = template.content.firstChild;
    const removeBtn = li.querySelector('.remove');
    const incBtn = li.querySelector('.increment');
    const countSpan = li.querySelector('.count');

    // --- Event Handlers ---
    removeBtn.addEventListener('click', () => {
        removeTodo(item.id);
    });

    incBtn.addEventListener('click', () => {
        localState.count++;
    });

    // 4. Reactive bindings: collect all disposers in an array.
    //    If you add more state fields, just push more effects here.
    const disposers = [];

    // --- Reactive Bindings ---
    disposers.push(
        effect(() => {
            countSpan.textContent = localState.count;
        })
    );

    // e.g. if you later add a completed flag:
    // disposers.push(
    //     effect(() => {
    //       li.classList.toggle('done', localState.completed);
    //     })
    // );

    // --- Cleanup Registration ---
    registerDisposal(li, () => {
        // stop all effects tied to this node
        disposers.forEach(d => d.dispose());
        // clear the shallow proxy key
        disposeLocalState(item.id); 
    });

    return li;
}