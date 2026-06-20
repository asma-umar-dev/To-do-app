/* ============================================================
   TaskFlow Pro — script.js
   Author: Asma Umar
   ============================================================ */

// ============================================================
// STATE
// ============================================================
let tasks      = JSON.parse(localStorage.getItem('tf_tasks') || '[]');
let categories = JSON.parse(localStorage.getItem('tf_cats')  || '["Work","Personal","Study","Health"]');
let userName   = localStorage.getItem('tf_user') || 'Asma Umar';
let dark       = localStorage.getItem('tf_dark') === 'true';

let currentFilter = 'all';
let sortOrder     = 'newest';
let editingId     = null;
let deletingId    = null;
let searchQuery   = '';

// ============================================================
// CONSTANTS
// ============================================================
const QUOTES = [
  '"The secret of getting ahead is getting started."',
  '"Focus on being productive instead of busy."',
  '"Done is better than perfect."',
  '"Small steps every day lead to big results."',
  '"Your future is created by what you do today."'
];

const CAT_ICONS  = { Work: '💼', Personal: '👤', Study: '📚', Health: '💪' };
const CAT_COLORS = { Work: '#6366F1', Personal: '#EC4899', Study: '#10B981', Health: '#F59E0B' };

// ============================================================
// INIT
// ============================================================
function init() {
  applyDark();
  updateUser();
  updateClock();
  setInterval(updateClock, 1000);
  renderAll();
  document.getElementById('settingsName').value = userName;

  // Random motivational quote
  const q = QUOTES[new Date().getDay() % QUOTES.length];
  document.querySelector('.welcome-quote').textContent = q;

  updateCatSelects();
}

// ============================================================
// CLOCK & DATE
// ============================================================
function updateClock() {
  const now  = new Date();
  const h    = now.getHours().toString().padStart(2, '0');
  const m    = now.getMinutes().toString().padStart(2, '0');

  document.getElementById('timeDisplay').textContent = `${h}:${m}`;

  const period = now.getHours() < 12 ? 'AM' : 'PM';
  document.getElementById('timePeriod').textContent = period;

  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('welcomeDate').textContent = now.toLocaleDateString('en-US', opts);

  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  document.querySelector('.welcome-greeting').textContent = greeting;
}

// ============================================================
// NAVIGATION
// ============================================================
function navTo(view) {
  // Hide all views and remove active from nav
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate selected
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('nav-' + view).classList.add('active');

  // Update topbar titles
  const titles = {
    dashboard:  ['Dashboard',  'Welcome back to your workspace'],
    tasks:      ['My Tasks',   'Manage and track your tasks'],
    categories: ['Categories', 'Organize tasks by category'],
    analytics:  ['Analytics',  'Your productivity insights'],
    settings:   ['Settings',   'Customize your experience']
  };

  document.getElementById('topbarTitle').textContent = titles[view][0];
  document.getElementById('topbarSub').textContent   = titles[view][1];

  closeSidebar();

  // Render the correct view
  if (view === 'tasks')      renderTasks();
  if (view === 'categories') renderCategories();
  if (view === 'analytics')  renderAnalytics();
}

// ============================================================
// SIDEBAR (MOBILE)
// ============================================================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').style.display = 'block';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';
}

// ============================================================
// DARK MODE
// ============================================================
function applyDark() {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('darkToggle').classList.toggle('on', dark);
  const t2 = document.getElementById('darkToggle2');
  if (t2) t2.classList.toggle('on', dark);
}

function toggleDark() {
  dark = !dark;
  localStorage.setItem('tf_dark', dark);
  applyDark();
}

// ============================================================
// USER / PROFILE
// ============================================================
function updateUser() {
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAvatar').textContent    = initials;
  document.getElementById('sidebarUserName').textContent = userName;
  document.getElementById('welcomeName').textContent   = userName + ' 👋';
}

function saveName() {
  const val = document.getElementById('settingsName').value.trim();
  if (!val) { showToast('Name cannot be empty', 'error'); return; }
  userName = val;
  localStorage.setItem('tf_user', userName);
  updateUser();
  showToast('Profile updated!', 'success');
}

// ============================================================
// STATS COMPUTATION
// ============================================================
function computeStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(t => !t.done && t.due && new Date(t.due) < today).length;
  const pct     = total ? Math.round(done / total * 100) : 0;
  return { total, done, pending, overdue, pct };
}

function updateStats() {
  const s = computeStats();

  document.getElementById('statTotal').textContent   = s.total;
  document.getElementById('statDone').textContent    = s.done;
  document.getElementById('statPending').textContent = s.pending;
  document.getElementById('statPct').textContent     = s.pct + '%';
  document.getElementById('navBadge').textContent    = s.pending;

  // Circular progress ring
  const circum = 376;
  const offset = circum - (circum * s.pct / 100);
  document.getElementById('ringFill').style.strokeDashoffset = offset;
  document.getElementById('ringPct').textContent = s.pct + '%';

  // Progress sidebar stats
  document.getElementById('ps-total').textContent   = s.total;
  document.getElementById('ps-done').textContent    = s.done;
  document.getElementById('ps-pending').textContent = s.pending;
  document.getElementById('ps-overdue').textContent = s.overdue;
}

// ============================================================
// RECENT TASKS (DASHBOARD)
// ============================================================
function renderRecent() {
  const list  = document.getElementById('recentTasksList');
  const emp   = document.getElementById('recentEmpty');
  const recent = [...tasks].sort((a, b) => b.created - a.created).slice(0, 5);

  if (!recent.length) {
    list.innerHTML = '';
    emp.classList.add('show');
    return;
  }

  emp.classList.remove('show');
  list.innerHTML = recent.map(t => taskCardHTML(t, true)).join('');
}

// ============================================================
// TASK CARD HTML GENERATOR
// ============================================================
function taskCardHTML(t, mini = false) {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const isOverdue = !t.done && t.due && new Date(t.due) < today;
  const dueStr   = t.due ? new Date(t.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return `
    <div class="task-card ${t.priority} ${t.done ? 'done' : ''}" id="tc-${t.id}">
      <div class="task-checkbox" onclick="toggleTask('${t.id}')"></div>
      <div class="task-body">
        <div class="task-title">${escHTML(t.title)}</div>
        ${t.desc && !mini ? `<div class="task-desc">${escHTML(t.desc)}</div>` : ''}
        <div class="task-meta">
          <span class="task-cat">${escHTML(t.category)}</span>
          <span class="priority-badge ${t.priority}">${t.priority}</span>
          ${dueStr ? `
            <span class="task-due ${isOverdue ? 'overdue' : ''}">
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2"/>
                <path stroke-width="2" d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              ${dueStr}${isOverdue ? ' · Overdue' : ''}
            </span>` : ''
          }
        </div>
      </div>
      ${!mini ? `
        <div class="task-actions">
          <button class="task-btn edit" onclick="openEditModal('${t.id}')" title="Edit">✏️</button>
          <button class="task-btn del"  onclick="openDeleteModal('${t.id}')" title="Delete">🗑️</button>
        </div>` : ''
      }
    </div>`;
}

// ============================================================
// RENDER TASKS LIST
// ============================================================
function renderTasks() {
  let filtered = [...tasks];
  const today  = new Date(); today.setHours(0, 0, 0, 0);

  // Apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.desc || '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  // Apply tab filter
  if      (currentFilter === 'completed') filtered = filtered.filter(t => t.done);
  else if (currentFilter === 'pending')   filtered = filtered.filter(t => !t.done);
  else if (currentFilter === 'overdue')   filtered = filtered.filter(t => !t.done && t.due && new Date(t.due) < today);
  else if (currentFilter === 'high')      filtered = filtered.filter(t => t.priority === 'high');

  // Apply sort
  const pmap = { high: 0, medium: 1, low: 2 };
  if      (sortOrder === 'newest')   filtered.sort((a, b) => b.created - a.created);
  else if (sortOrder === 'oldest')   filtered.sort((a, b) => a.created - b.created);
  else if (sortOrder === 'priority') filtered.sort((a, b) => pmap[a.priority] - pmap[b.priority]);
  else if (sortOrder === 'due') {
    filtered.sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  }
  else if (sortOrder === 'alpha') filtered.sort((a, b) => a.title.localeCompare(b.title));

  const list = document.getElementById('tasksList');
  const emp  = document.getElementById('tasksEmpty');

  if (!filtered.length) {
    list.innerHTML = '';
    emp.classList.add('show');
    return;
  }

  emp.classList.remove('show');
  list.innerHTML = filtered.map(t => taskCardHTML(t)).join('');
}

// ============================================================
// CATEGORIES VIEW
// ============================================================
function renderCategories() {
  const grid = document.getElementById('catsGrid');

  const catHTML = categories.map(cat => {
    const total = tasks.filter(t => t.category === cat).length;
    const done  = tasks.filter(t => t.category === cat && t.done).length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    const icon  = CAT_ICONS[cat]  || '📌';
    const color = CAT_COLORS[cat] || '#6366F1';

    return `
      <div class="cat-card" onclick="filterByCategory('${escHTML(cat)}')">
        <div class="cat-icon">${icon}</div>
        <div class="cat-name">${escHTML(cat)}</div>
        <div class="cat-count">${total} task${total !== 1 ? 's' : ''} · ${done} completed</div>
        <div class="cat-bar">
          <div class="cat-bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
      </div>`;
  }).join('');

  grid.innerHTML = catHTML + `
    <div class="add-cat-card" onclick="addCategory()">
      <span>➕</span>
      <p>New Category</p>
    </div>`;
}

function filterByCategory(cat) {
  navTo('tasks');
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.filter-tab').classList.add('active');
  currentFilter  = 'all';
  searchQuery    = cat;
  document.getElementById('searchInput').value = cat;
  renderTasks();
}

function addCategory() {
  const name = prompt('Enter category name:');
  if (!name || !name.trim()) return;
  const n = name.trim();

  if (categories.includes(n)) { showToast('Category already exists', 'error'); return; }

  categories.push(n);
  localStorage.setItem('tf_cats', JSON.stringify(categories));
  updateCatSelects();
  renderCategories();
  showToast(`Category "${n}" created!`, 'success');
}

function updateCatSelects() {
  const sel = document.getElementById('taskCategory');
  if (!sel) return;
  sel.innerHTML = categories.map(c =>
    `<option value="${escHTML(c)}">${CAT_ICONS[c] || '📌'} ${escHTML(c)}</option>`
  ).join('');
}

// ============================================================
// ANALYTICS VIEW
// ============================================================
function renderAnalytics() {
  const s = computeStats();

  // --- Priority Chart ---
  const pCounts = {
    High:   tasks.filter(t => t.priority === 'high').length,
    Medium: tasks.filter(t => t.priority === 'medium').length,
    Low:    tasks.filter(t => t.priority === 'low').length
  };
  const pMax    = Math.max(...Object.values(pCounts), 1);
  const pColors = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };

  document.getElementById('priorityChart').innerHTML = Object.entries(pCounts).map(([k, v]) => `
    <div class="bar-group">
      <div class="bar" style="height:${Math.max(v / pMax * 100, 4)}%; background:${pColors[k]}"></div>
      <div class="bar-label">${k}<br>${v}</div>
    </div>`).join('');

  // --- Category Chart ---
  const catMax = Math.max(...categories.map(c => tasks.filter(t => t.category === c).length), 1);

  document.getElementById('categoryChart').innerHTML = categories.map(c => {
    const cnt   = tasks.filter(t => t.category === c).length;
    const color = CAT_COLORS[c] || '#6366F1';
    return `
      <div class="bar-group">
        <div class="bar" style="height:${Math.max(cnt / catMax * 100, 4)}%; background:${color}"></div>
        <div class="bar-label">${CAT_ICONS[c] || '📌'} ${c.slice(0, 5)}<br>${cnt}</div>
      </div>`;
  }).join('');

  // --- Insights ---
  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const overdue     = tasks.filter(t => !t.done && t.due && new Date(t.due) < today).length;
  const highPending = tasks.filter(t => !t.done && t.priority === 'high').length;

  const insights = [
    { icon: '🎯', text: 'Overall completion rate',  val: s.pct + '%' },
    { icon: '⚡', text: 'High priority pending',    val: highPending  },
    { icon: '⚠️', text: 'Overdue tasks',            val: overdue      },
    { icon: '📌', text: 'Total categories used',    val: categories.length }
  ];

  document.getElementById('insightList').innerHTML = insights.map(i => `
    <div class="insight-item">
      <div class="insight-icon">${i.icon}</div>
      <div class="insight-text">${i.text}</div>
      <div class="insight-val">${i.val}</div>
    </div>`).join('');

  // --- Activity Heatmap (28 days) ---
  const now   = new Date();
  let   cells = '';

  for (let d = 27; d >= 0; d--) {
    const day    = new Date(now);
    day.setDate(now.getDate() - d);
    day.setHours(0, 0, 0, 0);
    const dayStr = day.toISOString().split('T')[0];
    const cnt    = tasks.filter(t => t.done && t.completedDate && t.completedDate.startsWith(dayStr)).length;
    const opacity = cnt === 0 ? 0.08 : Math.min(0.3 + cnt * 0.2, 1);
    cells += `<div class="heat-cell" style="background:rgba(99,102,241,${opacity})" title="${dayStr}: ${cnt} tasks"></div>`;
  }

  document.getElementById('heatmap').innerHTML = cells;
}

// ============================================================
// MODALS
// ============================================================
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitleText').textContent = 'New Task';
  document.getElementById('modalIcon').textContent      = '✨';
  document.getElementById('taskTitle').value    = '';
  document.getElementById('taskDesc').value     = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskDue').value      = '';
  updateCatSelects();
  openModal('taskModal');
}

function openEditModal(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  editingId = id;
  document.getElementById('modalTitleText').textContent = 'Edit Task';
  document.getElementById('modalIcon').textContent      = '✏️';
  document.getElementById('taskTitle').value    = t.title;
  document.getElementById('taskDesc').value     = t.desc || '';
  document.getElementById('taskPriority').value = t.priority;
  document.getElementById('taskDue').value      = t.due || '';
  updateCatSelects();
  document.getElementById('taskCategory').value = t.category;
  openModal('taskModal');
}

function openDeleteModal(id) {
  deletingId = id;
  openModal('deleteModal');
}

function openModal(id)  { document.getElementById(id).classList.add('open');    }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============================================================
// SAVE / EDIT TASK
// ============================================================
function saveTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { showToast('Task title is required', 'error'); return; }

  const existing = editingId ? tasks.find(t => t.id === editingId) : null;

  const task = {
    id:            editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    title,
    desc:          document.getElementById('taskDesc').value.trim(),
    priority:      document.getElementById('taskPriority').value,
    category:      document.getElementById('taskCategory').value,
    due:           document.getElementById('taskDue').value || null,
    done:          existing ? existing.done          : false,
    created:       existing ? existing.created       : Date.now(),
    completedDate: existing ? existing.completedDate : null
  };

  if (editingId) {
    tasks = tasks.map(t => t.id === editingId ? task : t);
    showToast('Task updated!', 'success');
  } else {
    tasks.unshift(task);
    showToast('Task created!', 'success');
  }

  save();
  closeModal('taskModal');
  renderAll();
}

// ============================================================
// TOGGLE TASK COMPLETE
// ============================================================
function toggleTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  t.done          = !t.done;
  t.completedDate = t.done ? new Date().toISOString() : null;

  save();
  showToast(t.done ? 'Task completed! 🎉' : 'Task reopened', 'info');
  renderAll();
}

// ============================================================
// DELETE TASK
// ============================================================
function confirmDelete() {
  if (!deletingId) return;
  tasks = tasks.filter(t => t.id !== deletingId);
  save();
  closeModal('deleteModal');
  showToast('Task deleted', 'error');
  renderAll();
}

// ============================================================
// PERSIST TO LOCALSTORAGE
// ============================================================
function save() {
  localStorage.setItem('tf_tasks', JSON.stringify(tasks));
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  updateStats();
  renderRecent();
  renderTasks();
}

// ============================================================
// FILTER & SORT
// ============================================================
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderTasks();
}

function setSortOrder(val) {
  sortOrder = val;
  renderTasks();
}

function handleSearch(val) {
  searchQuery = val;
  if (document.getElementById('view-tasks').classList.contains('active')) {
    renderTasks();
  }
}

// ============================================================
// SETTINGS — ACCENT COLOR
// ============================================================
function setAccent(c1, c2, el) {
  document.querySelectorAll('.theme-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  document.documentElement.style.setProperty('--accent',        c1);
  document.documentElement.style.setProperty('--accent2',       c2);
  document.documentElement.style.setProperty('--sidebar-active', c1);
  showToast('Theme updated!', 'success');
}

// ============================================================
// SETTINGS — RESET DATA
// ============================================================
function confirmReset() {
  if (confirm('Are you sure? This will permanently delete all your tasks. This cannot be undone.')) {
    tasks = [];
    save();
    renderAll();
    showToast('All data has been reset', 'info');
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');

  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon"></span><span class="toast-msg">${escHTML(msg)}</span>`;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Auto-dismiss after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================================
// UTILITY — HTML ESCAPE
// ============================================================
function escHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); navTo('tasks'); }
    if (e.key === 'n') { e.preventDefault(); openAddModal(); }
    if (e.key === '1') { e.preventDefault(); navTo('dashboard'); }
    if (e.key === '2') { e.preventDefault(); navTo('tasks'); }
    if (e.key === '3') { e.preventDefault(); navTo('categories'); }
  }
  if (e.key === 'Escape') {
    closeModal('taskModal');
    closeModal('deleteModal');
  }
});

// ============================================================
// DEMO DATA — Seed on first load
// ============================================================
function seedDemo() {
  if (tasks.length) return; // Don't overwrite existing data

  const fmt    = d  => d.toISOString().split('T')[0];
  const past   = n  => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
  const future = n  => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };

  tasks = [
    {
      id: 'd1', title: 'Review Q2 product roadmap',
      desc: 'Go through all planned features and prioritize them',
      priority: 'high', category: 'Work',
      due: future(2), done: false,
      created: Date.now() - 5 * 86400000, completedDate: null
    },
    {
      id: 'd2', title: 'Update portfolio website',
      desc: 'Add new case studies and update skills section',
      priority: 'medium', category: 'Personal',
      due: future(5), done: false,
      created: Date.now() - 4 * 86400000, completedDate: null
    },
    {
      id: 'd3', title: 'Morning workout routine',
      desc: '30 min cardio + strength training',
      priority: 'medium', category: 'Health',
      due: fmt(new Date()), done: true,
      created: Date.now() - 3 * 86400000, completedDate: new Date().toISOString()
    },
    {
      id: 'd4', title: 'Read Chapter 5 — Design Patterns',
      desc: 'Focus on SOLID principles',
      priority: 'low', category: 'Study',
      due: future(7), done: false,
      created: Date.now() - 2 * 86400000, completedDate: null
    },
    {
      id: 'd5', title: 'Submit tax documents',
      desc: '',
      priority: 'high', category: 'Personal',
      due: past(2), done: false,
      created: Date.now() - 6 * 86400000, completedDate: null
    },
    {
      id: 'd6', title: 'Team standup preparation',
      desc: 'Prepare weekly updates and blockers list',
      priority: 'medium', category: 'Work',
      due: future(1), done: true,
      created: Date.now() - 86400000, completedDate: new Date().toISOString()
    },
    {
      id: 'd7', title: 'Meal prep for the week',
      desc: '',
      priority: 'low', category: 'Health',
      due: fmt(new Date()), done: false,
      created: Date.now() - 86400000, completedDate: null
    }
  ];

  save();
}

// ============================================================
// START APP
// ============================================================
seedDemo();
init();
