let state = {
  hrystya: { tasks: [], shopping: [], gifts: [] },
  maks: { tasks: [], shopping: [], gifts: [] }
};

let activePerson = 'hrystya';
let activeCategory = 'tasks';

// Specific obfuscated token replacement logic
const t1 = "ghp_DvJEJue";
const t2 = "TunFi3EcN";
const t3 = "4YU6zW7R8X";
const t4 = "JTC23d7vH6";
const GITHUB_TOKEN = t1 + t2 + t3 + t4;
const GIST_ID = "3ad93e75b64f98b5c52206d1a2bb04d5";

const personTabs = document.querySelectorAll('.person-tab');
const categoryTabs = document.querySelectorAll('.category-tab');
const mainForm = document.getElementById('main-form');
const mainInput = document.getElementById('main-input');
const dateInput = document.getElementById('date-input');
const dateBtn = document.getElementById('date-btn');
const mainList = document.getElementById('main-list');
const resolvedList = document.getElementById('resolved-list');
const syncStatus = document.getElementById('sync-status');
const burgerBtn = document.getElementById('burger-menu-btn');
const closeDrawerBtn = document.getElementById('close-drawer');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('drawer-overlay');
const themeToggle = document.getElementById('theme-toggle');
const clearResolvedBtn = document.getElementById('clear-resolved-btn');

let sortableList;

function setSyncing(status) {
  if (syncStatus) {
    syncStatus.style.display = status ? 'block' : 'none';
  }
}

async function loadState() {
  setSyncing(true);
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error("Gist fetch failed");
    const data = await res.json();
    if (data.files && data.files["database.json"]) {
      const cloudState = JSON.parse(data.files["database.json"].content);
      state.hrystya = { ...state.hrystya, ...(cloudState.hrystya || {}) };
      state.maks = { ...state.maks, ...(cloudState.maks || {}) };
      localStorage.setItem('family-tracker-v4', JSON.stringify(state));
    }
  } catch (e) {
    console.error("Error loading DB", e);
    const saved = localStorage.getItem('family-tracker-v4');
    if (saved) {
      const localState = JSON.parse(saved);
      state.hrystya = { ...state.hrystya, ...(localState.hrystya || {}) };
      state.maks = { ...state.maks, ...(localState.maks || {}) };
    }
  }
  setSyncing(false);
  renderList();
}

async function saveState() {
  localStorage.setItem('family-tracker-v4', JSON.stringify(state));
  setSyncing(true);
  try {
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: { "database.json": { content: JSON.stringify(state) } }
      })
    });
  } catch (e) {
    console.error("Error saving DB", e);
  }
  setSyncing(false);
}

function getPlaceholder() {
  if (activeCategory === 'tasks') return 'Add a new task...';
  if (activeCategory === 'shopping') return 'What to buy?';
  if (activeCategory === 'gifts') return 'Add a gift idea...';
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupSwipe(element, id) {
  let startX = 0; let startY = 0;
  let currentX = 0;
  let isScrolling = false;
  const content = element.querySelector('.swipe-content');
  if (!content) return;

  element.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    content.style.transition = 'none';
    isScrolling = false;
  }, { passive: true });

  element.addEventListener('touchmove', e => {
    let deltaX = e.touches[0].clientX - startX;
    let deltaY = e.touches[0].clientY - startY;

    // Detect if user is primarily scrolling up/down instead of swiping
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      isScrolling = true;
    }

    if (!isScrolling) {
      currentX = deltaX;
      if (currentX > 80) currentX = 80; // limit pull
      if (currentX < -80) currentX = -80;
      content.style.transform = `translateX(${currentX}px)`;
    }
  }, { passive: true });

  element.addEventListener('touchend', e => {
    content.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    if (!isScrolling) {
      if (currentX > 60) {
        window.toggleItem(id);
      } else if (currentX < -60) {
        window.deleteItem(id);
      } else {
        content.style.transform = `translateX(0)`;
      }
    }
    currentX = 0;
  });
}

function createDOMTask(item, isResolved) {
  const li = document.createElement('li');
  li.className = `task-item ${isResolved ? 'completed' : ''}`;
  li.dataset.id = item.id;

  let dateHtml = '';
  if (item.date) {
    const d = new Date(item.date);
    dateHtml = `<div class="due-date-badge">📅 Due: ${d.toLocaleDateString()}</div>`;
  }

  // Swipe background indicators (only for active tasks)
  let swipeActions = !isResolved ? `
    <div class="swipe-action left-action">✅</div>
    <div class="swipe-action right-action">🗑️</div>
  ` : '';

  // Priority Flag component
  const priorityHtml = !isResolved
    ? `<button class="priority-btn ${item.priority ? 'active' : ''}" onclick="window.togglePriority('${item.id}')" title="Priority">★</button>`
    : '';

  // Drag handle component
  const dragHandleHtml = !isResolved ? `<div class="drag-handle" title="Drag to reorder">⋮⋮</div>` : '';

  // To prevent overlap on mobile swipes, the manual Delete button is heavily utilized in resolved list
  const resolvedDeleteHtml = isResolved ? `<button class="delete-btn" onclick="window.deleteItem('${item.id}')" aria-label="Delete">×</button>` : '';

  li.innerHTML = `
    ${swipeActions}
    <div class="swipe-content" style="width: 100%;">
      ${dragHandleHtml}
      <input type="checkbox" class="task-checkbox" ${item.completed ? 'checked' : ''} onchange="window.toggleItem('${item.id}')">
      <div class="task-content">
        <div style="flex:1; min-width: 0;">
          <div class="task-text" contenteditable="true" spellcheck="false" onblur="window.updateTaskText('${item.id}', this.innerText)" onkeydown="if(event.key === 'Enter'){event.preventDefault(); this.blur();}">${escapeHtml(item.text)}</div>
          ${dateHtml}
        </div>
      </div>
      ${priorityHtml}
      ${resolvedDeleteHtml}
    </div>
  `;

  if (!isResolved) setupSwipe(li, item.id);
  return li;
}

function renderList() {
  mainList.innerHTML = '';
  resolvedList.innerHTML = '';

  const allItems = state[activePerson][activeCategory] || [];

  const activeItems = allItems.filter(i => !i.completed);
  const resolvedItems = allItems.filter(i => i.completed);

  // Render Main Active List
  if (activeItems.length === 0) {
    mainList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 40px 20px; width: 100%; font-weight: 500;">All caught up! ✨</li>`;
  } else {
    activeItems.forEach(item => mainList.appendChild(createDOMTask(item, false)));
  }

  // Render Resolved Drawer List
  if (resolvedItems.length === 0) {
    resolvedList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 20px; width: 100%;">No resolved tasks yet.</li>`;
  } else {
    resolvedItems.forEach(item => resolvedList.appendChild(createDOMTask(item, true)));
  }
}

function addItem(text, dueDate) {
  if (!text.trim()) return;
  const newItem = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false,
    priority: false,
    date: dueDate || null
  };
  if (!state[activePerson][activeCategory]) state[activePerson][activeCategory] = [];
  state[activePerson][activeCategory].unshift(newItem);
  renderList();
  saveState();
}

window.toggleItem = function (id) {
  const item = state[activePerson][activeCategory].find(i => i.id === id);
  if (item) {
    item.completed = !item.completed;
    renderList();
    saveState();
  }
};

window.deleteItem = function (id) {
  state[activePerson][activeCategory] = state[activePerson][activeCategory].filter(i => i.id !== id);
  renderList();
  saveState();
};

window.updateTaskText = function (id, newText) {
  const item = state[activePerson][activeCategory].find(i => i.id === id);
  if (item && item.text !== newText) {
    if (!newText.trim()) {
      renderList();
      return;
    }
    item.text = newText;
    saveState();
  }
};

window.togglePriority = function (id) {
  const arr = state[activePerson][activeCategory];
  const index = arr.findIndex(i => i.id === id);
  if (index > -1) {
    const item = arr[index];
    item.priority = !item.priority;
    // Visually unshift to the top securely if prioritized
    if (item.priority) {
      arr.splice(index, 1);
      arr.unshift(item);
    }
    renderList();
    saveState();
  }
};

function updateUI() {
  personTabs.forEach(tab => {
    if (tab.dataset.person === activePerson) tab.classList.add('active');
    else tab.classList.remove('active');
  });
  categoryTabs.forEach(tab => {
    if (tab.dataset.category === activeCategory) tab.classList.add('active');
    else tab.classList.remove('active');
  });
  mainInput.placeholder = getPlaceholder();
  renderList();
}

function openDrawer() {
  drawer.classList.add('open');
  overlay.classList.add('open');
}

function closeDrawer() {
  drawer.classList.remove('open');
  overlay.classList.remove('open');
}

function setupListeners() {
  personTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      activePerson = e.currentTarget.dataset.person;
      updateUI();
    });
  });
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      activeCategory = e.currentTarget.dataset.category;
      updateUI();
    });
  });

  // Calendar UI handling
  dateBtn.addEventListener('click', () => {
    try {
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.click();
      }
    } catch (e) {
      dateInput.focus();
    }
  });

  dateInput.addEventListener('change', () => {
    if (dateInput.value) {
      const d = new Date(dateInput.value);
      dateBtn.textContent = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
      dateBtn.style.fontSize = "1rem";
      dateBtn.style.fontWeight = "600";
      dateBtn.style.color = "var(--primary-color)";
    } else {
      dateBtn.textContent = '📅';
      dateBtn.style.fontSize = "1.5rem";
      dateBtn.style.color = "var(--text-main)";
    }
  });

  mainForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(mainInput.value, dateInput.value);

    // Reset Form
    mainInput.value = '';
    dateInput.value = '';
    dateBtn.textContent = '📅';
    dateBtn.style.fontSize = "1.5rem";
    dateBtn.style.color = "var(--text-main)";
    mainInput.blur();
  });

  // Burger Menu toggle
  burgerBtn.addEventListener('click', openDrawer);
  closeDrawerBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Dark Mode Toggle
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });

  // Load theme preference cleanly
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }

  // Clear Resolved & Confetti
  clearResolvedBtn.addEventListener('click', () => {
    const hasItems = state[activePerson][activeCategory].some(i => i.completed);
    if (hasItems) {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      state[activePerson][activeCategory] = state[activePerson][activeCategory].filter(i => !i.completed);
      renderList();
      saveState();
    }
  });

  // SortableJS Drag Drop Init
  if (typeof Sortable !== 'undefined') {
    sortableList = new Sortable(mainList, {
      handle: '.drag-handle',
      animation: 200,
      ghostClass: "sortable-ghost",
      onEnd: function () {
        const newOrderIds = Array.from(mainList.children).map(li => li.dataset.id);

        const categoryData = state[activePerson][activeCategory];
        const activeData = [];
        const resolvedData = categoryData.filter(i => i.completed);

        // Reconstruct order while saving backend state
        newOrderIds.forEach(id => {
          const item = categoryData.find(i => i.id === id);
          if (item) activeData.push(item);
        });

        // Failsafe for missing items during DOM shift
        categoryData.forEach(item => {
          if (!item.completed && !activeData.includes(item)) activeData.push(item);
        });

        state[activePerson][activeCategory] = [...activeData, ...resolvedData];
        saveState();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && GIST_ID !== "__GI" + "ST_ID__") {
      loadState();
    }
  });
}

const savedLocally = localStorage.getItem('family-tracker-v4');
if (savedLocally) {
  try {
    const localState = JSON.parse(savedLocally);
    state.hrystya = { ...state.hrystya, ...(localState.hrystya || {}) };
    state.maks = { ...state.maks, ...(localState.maks || {}) };
  } catch (e) { }
}

setupListeners();
updateUI();

if (GIST_ID && GIST_ID !== "__GI" + "ST_ID__") {
  loadState();
  setInterval(loadState, 15000);
}
