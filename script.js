const STORAGE_KEYS = {
  tasks: "dailyday_tasks",
  habits: "dailyday_habits",
  theme: "dailyday_theme"
};

const DEFAULT_HABITS = [
  { id: crypto.randomUUID(), title: "Drink Water", streak: 0, doneToday: false, lastDoneDate: "" },
  { id: crypto.randomUUID(), title: "Exercise", streak: 0, doneToday: false, lastDoneDate: "" },
  { id: crypto.randomUUID(), title: "Read 20 Minutes", streak: 0, doneToday: false, lastDoneDate: "" }
];

const state = {
  tasks: [],
  habits: [],
  editTaskId: null,
  activeView: "homeView"
};

const el = {
  greetingText: document.getElementById("greetingText"),
  todayDate: document.getElementById("todayDate"),
  taskList: document.getElementById("taskList"),
  emptyTasks: document.getElementById("emptyTasks"),
  taskCount: document.getElementById("taskCount"),
  progressBar: document.getElementById("progressBar"),
  progressLabel: document.getElementById("progressLabel"),
  motivationText: document.getElementById("motivationText"),
  addTaskFab: document.getElementById("addTaskFab"),
  taskModal: document.getElementById("taskModal"),
  closeModal: document.getElementById("closeModal"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskTime: document.getElementById("taskTime"),
  taskPriority: document.getElementById("taskPriority"),
  modalTitle: document.getElementById("modalTitle"),
  taskTemplate: document.getElementById("taskItemTemplate"),
  habitTemplate: document.getElementById("habitItemTemplate"),
  habitList: document.getElementById("habitList"),
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.getElementById("themeIcon"),
  profileTasksDone: document.getElementById("profileTasksDone"),
  profileHabitStreak: document.getElementById("profileHabitStreak")
};

function init() {
  loadState();
  normalizeDailyHabits();
  renderHeader();
  renderTasks();
  renderHabits();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "light");
  bindEvents();
}

function bindEvents() {
  el.addTaskFab.addEventListener("click", openAddModal);
  el.closeModal.addEventListener("click", closeModal);
  el.taskModal.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
  el.taskForm.addEventListener("submit", onTaskSubmit);

  el.navItems.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

  el.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    pulse(el.themeToggle);
  });
}

function setActiveView(viewId) {
  state.activeView = viewId;
  el.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  el.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
}

function loadState() {
  const storedTasks = localStorage.getItem(STORAGE_KEYS.tasks);
  const storedHabits = localStorage.getItem(STORAGE_KEYS.habits);

  state.tasks = storedTasks ? JSON.parse(storedTasks) : [];
  state.habits = storedHabits ? JSON.parse(storedHabits) : structuredClone(DEFAULT_HABITS);
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
}

function saveHabits() {
  localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(state.habits));
}

function renderHeader() {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good Evening";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  el.greetingText.textContent = greeting;
  el.todayDate.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function renderTasks() {
  el.taskList.innerHTML = "";
  const sortedTasks = [...state.tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  sortedTasks.forEach((task) => {
    const node = el.taskTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.toggle("completed", task.completed);

    const title = node.querySelector(".task-title");
    const time = node.querySelector(".task-time");
    const priority = node.querySelector(".task-priority");
    const checkBtn = node.querySelector(".check-btn");
    const editBtn = node.querySelector(".edit-btn");
    const deleteBtn = node.querySelector(".delete-btn");

    title.textContent = task.title;
    time.textContent = task.time ? `At ${task.time}` : "No specific time";
    priority.textContent = capitalize(task.priority);
    priority.classList.add(`priority-${task.priority}`);

    checkBtn.addEventListener("click", () => toggleTask(task.id));
    editBtn.addEventListener("click", () => openEditModal(task.id));
    deleteBtn.addEventListener("click", () => deleteTask(task.id, node));

    el.taskList.appendChild(node);
  });

  el.taskCount.textContent = String(state.tasks.length);
  el.emptyTasks.style.display = state.tasks.length ? "none" : "block";
  updateProgress();
  updateProfile();
}

function onTaskSubmit(event) {
  event.preventDefault();
  const title = el.taskTitle.value.trim();
  const time = el.taskTime.value;
  const priority = el.taskPriority.value;

  if (!title) return;

  if (state.editTaskId) {
    const existingTask = state.tasks.find((task) => task.id === state.editTaskId);
    if (!existingTask) return;
    existingTask.title = title;
    existingTask.time = time;
    existingTask.priority = priority;
  } else {
    state.tasks.unshift({
      id: crypto.randomUUID(),
      title,
      time,
      priority,
      completed: false,
      createdAt: Date.now()
    });
  }

  saveTasks();
  renderTasks();
  closeModal();
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
  pulse(el.progressBar);
}

function deleteTask(taskId, itemNode) {
  itemNode.style.opacity = "0";
  itemNode.style.transform = "translateX(18px)";
  setTimeout(() => {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    saveTasks();
    renderTasks();
  }, 180);
}

function updateProgress() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  el.progressBar.style.width = `${percent}%`;
  el.progressLabel.textContent = `${percent}%`;

  if (total > 0 && completed === total) {
    el.motivationText.textContent = "All tasks done. Great job, keep the momentum!";
    pulse(el.motivationText);
  } else if (total === 0) {
    el.motivationText.textContent = "One small step at a time.";
  } else {
    el.motivationText.textContent = "Keep going, your future self will thank you.";
  }
}

function openAddModal() {
  state.editTaskId = null;
  el.modalTitle.textContent = "Add Task";
  el.taskForm.reset();
  el.taskPriority.value = "medium";
  showModal();
}

function openEditModal(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.editTaskId = taskId;
  el.modalTitle.textContent = "Edit Task";
  el.taskTitle.value = task.title;
  el.taskTime.value = task.time;
  el.taskPriority.value = task.priority;
  showModal();
}

function showModal() {
  el.taskModal.classList.remove("hidden");
  setTimeout(() => el.taskTitle.focus(), 50);
}

function closeModal() {
  el.taskModal.classList.add("hidden");
}

function normalizeDailyHabits() {
  const today = todayKey();
  let changed = false;

  state.habits.forEach((habit) => {
    if (habit.lastDoneDate !== today && habit.doneToday) {
      habit.doneToday = false;
      changed = true;
    }
    if (habit.lastDoneDate === undefined) {
      habit.lastDoneDate = "";
      changed = true;
    }
  });

  if (changed) saveHabits();
}

function renderHabits() {
  el.habitList.innerHTML = "";
  state.habits.forEach((habit) => {
    const node = el.habitTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = habit.id;
    node.classList.toggle("done", habit.doneToday);
    node.querySelector(".habit-title").textContent = habit.title;
    node.querySelector(".habit-streak").textContent = `Streak: ${habit.streak} day${habit.streak === 1 ? "" : "s"}`;

    const toggleBtn = node.querySelector(".habit-toggle");
    toggleBtn.textContent = habit.doneToday ? "Done" : "Mark";
    toggleBtn.addEventListener("click", () => toggleHabit(habit.id));

    el.habitList.appendChild(node);
  });

  updateProfile();
}

function toggleHabit(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  const today = todayKey();
  if (!habit.doneToday) {
    if (habit.lastDoneDate !== today) {
      habit.streak += 1;
    }
    habit.doneToday = true;
    habit.lastDoneDate = today;
  } else {
    habit.doneToday = false;
    habit.streak = Math.max(0, habit.streak - 1);
    habit.lastDoneDate = "";
  }

  saveHabits();
  renderHabits();
}

function updateProfile() {
  const tasksDone = state.tasks.filter((task) => task.completed).length;
  const habitStreakTotal = state.habits.reduce((sum, habit) => sum + habit.streak, 0);
  el.profileTasksDone.textContent = String(tasksDone);
  el.profileHabitStreak.textContent = String(habitStreakTotal);
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  el.themeIcon.textContent = dark ? "☀️" : "🌙";
}

function pulse(node) {
  node.classList.remove("flash");
  void node.offsetWidth;
  node.classList.add("flash");
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

init();
