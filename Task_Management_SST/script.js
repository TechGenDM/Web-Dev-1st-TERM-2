// ========================
// ELEMENT SELECTORS
// ========================
const addBtn = document.querySelector(".add-btn");
const removeBtn = document.querySelector(".remove-btn");
const modalCont = document.querySelector(".modal-cont");
const mainCont = document.querySelector(".main-cont");
const textAreaCont = document.querySelector(".textArea-cont");
const allPriorityColors = document.querySelectorAll(".priority-color");
const toolboxColors = document.querySelectorAll(".color");

// search elements
const searchBtn = document.querySelector(".search-btn");
const searchOverlay = document.querySelector(".search-overlay");
const searchInput = document.querySelector("#searchInput");

// focus mode elements
const focusOverlay = document.querySelector(".focus-overlay");
const focusTaskText = document.querySelector(".focus-task-text");
const focusTimerDisplay = document.querySelector(".focus-timer-display");
const focusStartBtn = document.querySelector(".focus-start-btn");
const focusPauseBtn = document.querySelector(".focus-pause-btn");
const focusResetBtn = document.querySelector(".focus-reset-btn");
const focusMeta = document.querySelector(".focus-meta");
const focusCloseBtn = document.querySelector(".focus-close-btn");

// ding sound
const dingSound = document.getElementById("dingSound");

// ========================
// GLOBALS
// ========================
const colors = ["lightpink", "lightgreen", "lightblue", "black"];
const lockClass = "fa-lock";
const unlockClass = "fa-lock-open";

let addTaskFlag = false;
let removeTaskFlag = false;

// active priority color in modal
let modalPriorityColor = "black";
const defaultActiveColor = document.querySelector(".priority-color.active");
if (defaultActiveColor) {
  modalPriorityColor = defaultActiveColor.classList[0];
}

// tickets array: { ticketColor, ticketTask, ticketID, focusMinutes, sessions, completed }
let ticketsArr = [];

// drag & drop
let dragSrcId = null;

// focus mode state
let currentFocusId = null;
const focusDurationSeconds = 25 * 60; // 25-minute sessions
let focusRemainingSeconds = focusDurationSeconds;
let focusInterval = null;
let focusRunning = false;

// ========================
// ADD TASK - MODAL TOGGLE
// ========================
addBtn.addEventListener("click", () => {
  addTaskFlag = !addTaskFlag;

  if (addTaskFlag) {
    modalCont.style.display = "flex";
    textAreaCont.focus();
  } else {
    modalCont.style.display = "none";
  }
});

// ========================
// DELETE MODE TOGGLE
// ========================
removeBtn.addEventListener("click", () => {
  removeTaskFlag = !removeTaskFlag;

  if (removeTaskFlag) {
    alert("Delete mode is ON. Click a ticket to delete it.");
    removeBtn.style.opacity = "0.75";
  } else {
    removeBtn.style.opacity = "1";
  }
});

// ========================
// PRIORITY COLOR SELECTION
// ========================
allPriorityColors.forEach((colorElem) => {
  colorElem.addEventListener("click", () => {
    allPriorityColors.forEach((elem) => elem.classList.remove("active"));
    colorElem.classList.add("active");
    modalPriorityColor = colorElem.classList[0]; // lightpink, etc.
  });
});

// ========================
// CREATE TICKET ON SHIFT
// ========================
modalCont.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    const taskContent = textAreaCont.value.trim();
    if (!taskContent) return;

    createTicket(modalPriorityColor, taskContent);

    // reset modal
    textAreaCont.value = "";
    modalCont.style.display = "none";
    addTaskFlag = false;
  }
});

// ========================
// CREATE TICKET FUNCTION
// ========================
function createTicket(ticketColor, ticketTask, ticketID) {
  const id = ticketID || shortid(); // generate id if not provided

  const ticketCont = document.createElement("div");
  ticketCont.setAttribute("class", "ticket-cont");
  ticketCont.setAttribute("draggable", "true");
  ticketCont.dataset.id = id;

  ticketCont.innerHTML = `
    <div class="ticket-color ${ticketColor}"></div>
    <div class="ticket-id">${id}</div>
    <div class="task-area" contenteditable="false">${ticketTask}</div>
    <div class="ticket-done" title="Mark task as done">
      <i class="fa-regular fa-circle-check"></i>
    </div>
    <div class="ticket-lock">
      <i class="fa-solid fa-lock"></i>
    </div>
    <div class="ticket-footer">
      <div class="ticket-focus" title="Focus on this task">
        <i class="fa-solid fa-bullseye"></i>
        Focus
      </div>
      <div class="ticket-focus-stats">
        ⏱ 0 min • 0 sessions
      </div>
    </div>
  `;

  mainCont.appendChild(ticketCont);

  // push into array only for new tickets
  if (!ticketID) {
    ticketsArr.push({
      ticketColor,
      ticketTask,
      ticketID: id,
      focusMinutes: 0,
      sessions: 0,
      completed: false,
    });
  }

  handleRemoval(ticketCont, id);
  handleLock(ticketCont, id);
  handleColor(ticketCont, id);
  handleFocus(ticketCont, id);
  handleDone(ticketCont, id);
  enableDragAndDrop(ticketCont);
}

// ========================
// DELETE TICKET WHEN IN DELETE MODE
// ========================
function handleRemoval(ticketCont, id) {
  ticketCont.addEventListener("click", () => {
    if (!removeTaskFlag) return;

    ticketCont.remove();

    const idx = getTicketIdx(id);
    if (idx !== -1) {
      ticketsArr.splice(idx, 1);
    }
  });
}

// ========================
// LOCK / UNLOCK TICKET TEXT
// ========================
function handleLock(ticketCont, id) {
  const ticketLockElem = ticketCont.querySelector(".ticket-lock i");
  const ticketTaskArea = ticketCont.querySelector(".task-area");

  ticketLockElem.addEventListener("click", (e) => {
    e.stopPropagation(); // don't trigger delete on click

    const isLocked = ticketLockElem.classList.contains(lockClass);

    if (isLocked) {
      ticketLockElem.classList.remove(lockClass);
      ticketLockElem.classList.add(unlockClass);
      ticketTaskArea.setAttribute("contenteditable", "true");
      ticketTaskArea.focus();
    } else {
      ticketLockElem.classList.remove(unlockClass);
      ticketLockElem.classList.add(lockClass);
      ticketTaskArea.setAttribute("contenteditable", "false");

      // update text in array
      const idx = getTicketIdx(id);
      if (idx !== -1) {
        ticketsArr[idx].ticketTask = ticketTaskArea.innerText.trim();
      }
    }
  });
}

// ========================
// DONE ICON / COMPLETED STATE
// ========================
function handleDone(ticketCont, id) {
  const doneElem = ticketCont.querySelector(".ticket-done");
  const taskArea = ticketCont.querySelector(".task-area");

  // set initial state from data
  const ticket = ticketsArr.find((t) => t.ticketID === id);
  if (ticket && ticket.completed) {
    doneElem.classList.add("done");
    taskArea.classList.add("completed");
  }

  doneElem.addEventListener("click", (e) => {
    e.stopPropagation(); // avoid delete or drag
    const ticket = ticketsArr.find((t) => t.ticketID === id);
    if (!ticket) return;

    const isDone = doneElem.classList.contains("done");

    if (isDone) {
      // unmark as done
      doneElem.classList.remove("done");
      taskArea.classList.remove("completed");
      ticket.completed = false;
    } else {
      // mark as done
      doneElem.classList.add("done");
      taskArea.classList.add("completed");
      ticket.completed = true;

      // 🔔 play ding sound
      if (dingSound) {
        dingSound.currentTime = 0;
        dingSound
          .play()
          .catch(() => {
            // ignore if browser blocks autoplay
          });
      }
    }
  });
}

// ========================
// CHANGE TICKET COLOR ON CLICK
// ========================
function handleColor(ticketCont, id) {
  const ticketColorBand = ticketCont.querySelector(".ticket-color");

  ticketColorBand.addEventListener("click", (e) => {
    e.stopPropagation(); // don't delete when clicking color

    const currentColor =
      colors.find((c) => ticketColorBand.classList.contains(c)) || colors[0];
    const currentIdx = colors.indexOf(currentColor);
    const newIdx = (currentIdx + 1) % colors.length;
    const newColor = colors[newIdx];

    ticketColorBand.classList.remove(currentColor);
    ticketColorBand.classList.add(newColor);

    const idx = getTicketIdx(id);
    if (idx !== -1) {
      ticketsArr[idx].ticketColor = newColor;
    }
  });
}

// ========================
// FOCUS MODE PER TICKET
// ========================
function handleFocus(ticketCont, id) {
  const focusBtn = ticketCont.querySelector(".ticket-focus");
  const statsElem = ticketCont.querySelector(".ticket-focus-stats");

  // initial stats text from data
  const ticket = ticketsArr.find((t) => t.ticketID === id);
  if (ticket && statsElem) {
    const mins = ticket.focusMinutes || 0;
    const sessions = ticket.sessions || 0;
    statsElem.textContent = `⏱ ${mins} min • ${sessions} session${
      sessions === 1 ? "" : "s"
    }`;
  }

  focusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openFocusForTicket(id);
  });
}

function openFocusForTicket(id) {
  stopFocusTimer(); // stop any existing timer
  currentFocusId = id;
  focusRemainingSeconds = focusDurationSeconds;
  updateFocusTimerDisplay();

  const ticket = ticketsArr.find((t) => t.ticketID === id);
  const taskText = ticket ? ticket.ticketTask : "";
  focusTaskText.textContent = taskText || "Focus time";

  updateFocusMeta();

  focusOverlay.style.display = "flex";
}

// timer controls
focusStartBtn.addEventListener("click", () => {
  startFocusTimer();
});

focusPauseBtn.addEventListener("click", () => {
  stopFocusTimer();
});

focusResetBtn.addEventListener("click", () => {
  resetFocusTimer();
});

focusCloseBtn.addEventListener("click", () => {
  stopFocusTimer();
  focusOverlay.style.display = "none";
  currentFocusId = null;
});

focusOverlay.addEventListener("click", (e) => {
  if (e.target === focusOverlay) {
    stopFocusTimer();
    focusOverlay.style.display = "none";
    currentFocusId = null;
  }
});

// focus timer helpers
function startFocusTimer() {
  if (!currentFocusId || focusRunning) return;

  focusRunning = true;
  focusTimerDisplay.classList.remove("focus-finished");

  focusInterval = setInterval(() => {
    focusRemainingSeconds--;
    if (focusRemainingSeconds <= 0) {
      focusRemainingSeconds = 0;
      updateFocusTimerDisplay();
      completeFocusSession();
    } else {
      updateFocusTimerDisplay();
    }
  }, 1000);
}

function stopFocusTimer() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  focusRunning = false;
}

function resetFocusTimer() {
  stopFocusTimer();
  focusRemainingSeconds = focusDurationSeconds;
  updateFocusTimerDisplay();
  focusTimerDisplay.classList.remove("focus-finished");
}

function completeFocusSession() {
  stopFocusTimer();

  if (!currentFocusId) return;

  const ticket = ticketsArr.find((t) => t.ticketID === currentFocusId);
  if (ticket) {
    const mins = Math.round(focusDurationSeconds / 60);
    ticket.focusMinutes = (ticket.focusMinutes || 0) + mins;
    ticket.sessions = (ticket.sessions || 0) + 1;

    updateTicketFocusStats(ticket.ticketID);
    updateFocusMeta();
  }

  focusTimerDisplay.classList.add("focus-finished");
}

function updateFocusTimerDisplay() {
  focusTimerDisplay.textContent = formatTime(focusRemainingSeconds);
}

function updateFocusMeta() {
  if (!currentFocusId) {
    focusMeta.textContent = "";
    return;
  }
  const ticket = ticketsArr.find((t) => t.ticketID === currentFocusId);
  if (!ticket) {
    focusMeta.textContent = "";
    return;
  }
  const mins = ticket.focusMinutes || 0;
  const sessions = ticket.sessions || 0;
  focusMeta.textContent = `Total focused on this task: ${mins} min • ${sessions} session${
    sessions === 1 ? "" : "s"
  }`;
}

function updateTicketFocusStats(id) {
  const ticket = ticketsArr.find((t) => t.ticketID === id);
  if (!ticket) return;

  const card = mainCont.querySelector(`.ticket-cont[data-id="${id}"]`);
  if (!card) return;

  const statsElem = card.querySelector(".ticket-focus-stats");
  if (!statsElem) return;

  const mins = ticket.focusMinutes || 0;
  const sessions = ticket.sessions || 0;
  statsElem.textContent = `⏱ ${mins} min • ${sessions} session${
    sessions === 1 ? "" : "s"
  }`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ========================
// FILTER BY PRIORITY COLORS (NAVBAR DOTS)
// ========================
toolboxColors.forEach((colorElem) => {
  const color = colorElem.classList[0]; // lightpink, etc.

  // single click → show only that color
  colorElem.addEventListener("click", () => {
    const filtered = ticketsArr.filter(
      (ticket) => ticket.ticketColor === color
    );
    renderTickets(filtered);
  });

  // double click → show all
  colorElem.addEventListener("dblclick", () => {
    renderTickets(ticketsArr);
  });
});

// re-render helper (used by filter + search + drag)
function renderTickets(list) {
  mainCont.innerHTML = "";
  list.forEach((ticket) => {
    createTicket(ticket.ticketColor, ticket.ticketTask, ticket.ticketID);
  });
}

// ========================
// SEARCH OVERLAY + FILTER
// ========================
searchBtn.addEventListener("click", () => {
  searchOverlay.style.display = "flex";
  searchInput.value = "";
  searchInput.focus();
  renderTickets(ticketsArr); // start from full list
});

searchOverlay.addEventListener("click", (e) => {
  if (e.target === searchOverlay) {
    closeSearchOverlay();
  }
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSearchOverlay();
  }
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();

  const filtered = ticketsArr.filter((ticket) =>
    ticket.ticketTask.toLowerCase().includes(query)
  );

  renderTickets(filtered);
});

function closeSearchOverlay() {
  searchOverlay.style.display = "none";
  searchInput.value = "";
  renderTickets(ticketsArr);
}

// ========================
// DRAG & DROP LOGIC
// ========================
function enableDragAndDrop(ticketCont) {
  ticketCont.addEventListener("dragstart", handleDragStart);
  ticketCont.addEventListener("dragover", handleDragOver);
  ticketCont.addEventListener("drop", handleDrop);
  ticketCont.addEventListener("dragleave", handleDragLeave);
  ticketCont.addEventListener("dragend", handleDragEnd);
}

function handleDragStart(e) {
  const ticketCont = e.currentTarget;
  dragSrcId = ticketCont.dataset.id;
  ticketCont.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
  e.preventDefault(); // allow drop
  e.dataTransfer.dropEffect = "move";

  const ticketCont = e.currentTarget;
  if (!ticketCont.classList.contains("drag-over")) {
    ticketCont.classList.add("drag-over");
  }
}

function handleDrop(e) {
  e.preventDefault();
  const targetCont = e.currentTarget;
  targetCont.classList.remove("drag-over");

  const targetId = targetCont.dataset.id;
  if (!dragSrcId || dragSrcId === targetId) return;

  const srcIdx = getTicketIdx(dragSrcId);
  const targetIdx = getTicketIdx(targetId);
  if (srcIdx === -1 || targetIdx === -1) return;

  // reorder array
  const [movedTicket] = ticketsArr.splice(srcIdx, 1);
  ticketsArr.splice(targetIdx, 0, movedTicket);

  // re-render in new order
  renderTickets(ticketsArr);
}

function handleDragLeave(e) {
  const ticketCont = e.currentTarget;
  ticketCont.classList.remove("drag-over");
}

function handleDragEnd(e) {
  const ticketCont = e.currentTarget;
  ticketCont.classList.remove("dragging");
  dragSrcId = null;
}

// ========================
// UTIL: GET TICKET INDEX
// ========================
function getTicketIdx(ticketID) {
  return ticketsArr.findIndex((ticket) => ticket.ticketID === ticketID);
}
