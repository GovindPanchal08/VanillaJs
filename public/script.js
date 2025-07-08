// Load tasks from localStorage or initiali// real time updates using WebSocket
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let projects = JSON.parse(localStorage.getItem("projects")) || [
  { id: "proj-1", name: "Default Project", tasks: tasks },
];
// console.log("Projects:", projects);
let currentProjectId = "proj-1"; // default

document.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();
  renderTasks();
  renderProjectList();
});
function renderProjectList() {
  const projectList = document.getElementById("projects");
  projectList.innerHTML = ""; // Clear

  projects.forEach((project) => {
    const li = document.createElement("li");

    const btn = document.createElement("button");
    btn.className = "hover:text-violet-600";
    btn.textContent = `📁 ${project.name}`;
    btn.addEventListener("click", () => setActiveProject(project.id));
    let btn2 = document.createElement("button");
    if (project.id !== "proj-1") {
      btn2.className = "text-red-500 hover:scale-90 ml-2";
      btn2.textContent = "Delete";
      btn2.addEventListener("click", () => DeleteProject(project.id));
    }
    li.appendChild(btn);
    li.appendChild(btn2);
    projectList.appendChild(li);
  });
}

// render tasks in kanban view
function renderTasks(
  filteredTasks = projects.find((p) => p.id === currentProjectId)?.tasks
) {
  const columns = {
    todo: document.getElementById("todo-column"),
    inprogress: document.getElementById("inprogress-column"),
    done: document.getElementById("done-column"),
  };

  // Clear existing
  Object.values(columns).forEach((col) => (col.innerHTML = ""));
  // Filter tasks based on current project
  // let project = projects.find((p) => p.id === currentProjectId);
  // Render tasks
  filteredTasks.forEach((task) => {
    const card = document.createElement("div");
    card.setAttribute("draggable", "true");

    card.className =
      "bg-white p-4 rounded-xl shadow hover:shadow-md transition border-l-4 group relative" +
      (task.status === "todo"
        ? " border-indigo-500"
        : task.status === "inprogress"
        ? " border-yellow-400"
        : " border-green-500");

    card.innerHTML = `
  <!-- Header: Title + Priority -->
  <div class="flex justify-between items-start mb-1">
    <h4 class="text-lg font-semibold text-gray-800">${task.title}</h4>
    <span class="text-xs px-2 py-1 rounded-full ${
      task.priority === "high"
        ? "bg-red-100 text-red-600"
        : task.priority === "medium"
        ? "bg-yellow-100 text-yellow-600"
        : "bg-gray-100 text-gray-600"
    }">${task.priority}</span>
  </div>

  <!-- Description -->
  <p class="text-sm text-gray-600 mb-2">${task.description}</p>

  <!-- Footer: Assignee, Due Date -->
  <div class="flex justify-between text-xs text-gray-500 mb-2">
    <span>👤 ${task.assignee}</span>
    <span>📅 ${task.dueDate}</span>
  </div>

  <!-- Action Buttons -->
  <div class="flex justify-between items-center text-sm gap-3">
    <button onclick="toggleComments('${
      task.id
    }')" class="text-violet-600 hover:underline">💬 Comments</button>
    <button onclick="deleteTask('${
      task.id
    }')" class="text-red-500 hover:scale-90">🗑️</button>
  </div>

  <!-- Comments Section -->
 <div id="comments-${task.id}" class="mt-3 hidden">
  ${
    task.comments.length > 0
      ? renderNestedComments(task.comments, task.id)
      : "<p class='text-xs text-gray-400 italic'>No comments yet.</p>"
  }

  <!-- Top-level comment input -->
  <input
    type="text"
    placeholder="Add a comment..."
    class="w-full text-xs border rounded px-2 py-1 mt-2"
    onkeydown="if(event.key==='Enter') addNestedReply('${
      task.id
    }', '', this.value, this)"
  />
</div>

`;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
      card.style.opacity = "0.5"; //
    });

    columns[task.status]?.appendChild(card);
  });
}

// open and close task modal
function openTaskModal() {
  document.getElementById("taskModal").classList.remove("hidden");
}
function closeTaskModal() {
  document.getElementById("taskModal").classList.add("hidden");
  document.getElementById("taskForm").reset();
}

// calander view
function renderCalendarView(
  filteredTasks = projects.find((p) => p.id === currentProjectId).tasks
) {
  const calendarContainer = document.getElementById("calendar");
  const taskMap = {};

  const today = new Date();

  // Group tasks by due date
  filteredTasks.forEach((task) => {
    const date = new Date(task.dueDate);
    const key = date.toISOString().split("T")[0];
    if (!taskMap[key]) {
      taskMap[key] = [];
    }
    taskMap[key].push(task);
  });

  // Sort date keys in ascending order
  const sortedDates = Object.keys(taskMap).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  calendarContainer.innerHTML = `
  <h2 class="text-3xl font-bold text-gray-900 mt-8 mb-6 flex items-center gap-3">
    📅 Task Calendar
    <span class="text-base font-normal text-gray-500"> — Stay ahead of your deadlines</span>
  </h2>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    ${sortedDates
      .map((dueDate) => {
        const taskCards = taskMap[dueDate]
          .map((task) => {
            const due = new Date(task.dueDate);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

            // Color logic
            let color = "bg-emerald-50 border-emerald-200 text-emerald-800";
            if (diffDays < 0)
              color = "bg-rose-50 border-rose-200 text-rose-800";
            else if (diffDays <= 2)
              color = "bg-amber-50 border-amber-200 text-amber-800";

            // Priority badge color
            const priorityColor =
              task.priority === "high"
                ? "bg-red-100 text-red-700"
                : task.priority === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600";

            return `
              <li class="p-4 rounded-xl border ${color} shadow-sm hover:shadow-lg transition-all duration-300">
                <div class="flex justify-between items-start">
                  <div>
                  <h4 class="font-semibold text-sm flex items-center gap-2">
  ${task.status === "done" ? "✅" : "📝"} ${task.title}
</h4>

                    <p class="text-xs text-gray-500 mt-1">${task.assignee} • ${
              task.status
            }</p>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full ${priorityColor} capitalize">${
              task.priority
            }</span>
                </div>
              </li>`;
          })
          .join("");

        return `
          <div class="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between mb-4">
              <div class="text-lg font-bold text-gray-800">📆 ${dueDate}</div>
              <span class="text-xs font-medium text-gray-500">${taskMap[dueDate].length} Task(s)</span>
            </div>
            <ul class="space-y-4">${taskCards}</ul>
          </div>`;
      })
      .join("")}
  </div>
`;
}

// chart.js
let statusChartInstance = null;
let assigneeChartInstance = null;
function renderStatusChart(
  filteredTasks = projects.find((p) => p.id === currentProjectId).tasks
) {
  const ctx = document.getElementById("statusChart").getContext("2d");

  // Destroy old chart instance if exists
  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  const statusCount = { todo: 0, inprogress: 0, done: 0 };
  filteredTasks.forEach((t) => statusCount[t.status]++);

  statusChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Todo", "In Progress", "Done"],
      datasets: [
        {
          label: "Tasks",
          data: [statusCount.todo, statusCount.inprogress, statusCount.done],
          backgroundColor: ["#AAB99A", "#F0F0D7", "#727D73"],
        },
      ],
    },
  });
}
function renderAssigneeChart(
  filteredTasks = projects.find((p) => p.id === currentProjectId).tasks
) {
  const ctx = document.getElementById("assigneeChart").getContext("2d");

  // Destroy old chart instance if exists
  if (assigneeChartInstance) {
    assigneeChartInstance.destroy();
  }

  const assigneeMap = {};
  filteredTasks.forEach((t) => {
    assigneeMap[t.assignee] = (assigneeMap[t.assignee] || 0) + 1;
  });

  assigneeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(assigneeMap),
      datasets: [
        {
          label: "Tasks per Assignee",
          data: Object.values(assigneeMap),
          backgroundColor: "#727D73",
        },
      ],
    },
  });
}

// Initialize drag & drop columns
["todo", "inprogress", "done"].forEach((status) => {
  const column = document.getElementById(`${status}-column`);

  column.addEventListener("dragover", (e) => e.preventDefault());

  column.addEventListener("drop", (e) => handleDrop(e, status));
});

// Handle drop logic
function handleDrop(event, newStatus) {
  event.preventDefault();

  const taskId = event.dataTransfer.getData("text/plain");
  const project = projects.find((p) => p.id === currentProjectId);
  const task = project?.tasks?.find((t) => t.id === taskId);

  if (!task) return;

  // task.status = newStatus;

  // // Save to localStorage
  // localStorage.setItem("projects", JSON.stringify(projects));

  // // Re-render
  // renderTasks();
  // renderStatusChart();
  // renderAssigneeChart();
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "task-update",
        projectId: currentProjectId,
        taskId: task.id,
        status: newStatus,
      })
    );
  } else {
    alert("WebSocket is not connected. Please try again later.");
  }
}

// Task creation
document.getElementById("taskForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const newTask = {
    id: "task-" + Date.now(),
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    dueDate: document.getElementById("dueDate").value,
    assignee: document.getElementById("assignee").value,
    status: document.getElementById("status").value,
    priority: document.getElementById("priority").value,
    labels: [],
    comments: [],
  };
  // // When a new task is created

  // let project = projects.find((p) => p.id === currentProjectId);
  // // console.log("projects is", project);
  // project.tasks.push(newTask);
  // localStorage.setItem("tasks", JSON.stringify(tasks));
  // localStorage.setItem("projects", JSON.stringify(projects));
  socket.send(
    JSON.stringify({
      type: "taskCreated",
      task: newTask,
      projectId: currentProjectId,
    })
  );

  renderTasks();
  renderCalendarView();
  renderStatusChart();
  renderAssigneeChart();
  closeTaskModal();
});

// Tab switch logic
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    if (tab === "calendar")
      renderCalendarView(projects.find((p) => p.id === currentProjectId).tasks);
    if (tab === "reports") {
      renderStatusChart(projects.find((p) => p.id === currentProjectId).tasks);
      renderAssigneeChart(
        projects.find((p) => p.id === currentProjectId).tasks
      );
    }

    // Toggle tabss
    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("tab-active"));
    btn.classList.add("tab-active");

    // Toggle views
    document
      .querySelectorAll("main > section")
      .forEach((sec) => sec.classList.add("hidden"));
    document.querySelector(`#${tab}`).classList.remove("hidden");
  });
});

// Toggle comments visibility
function toggleComments(taskId) {
  const commentBox = document.getElementById(`comments-${taskId}`);
  commentBox.classList.toggle("hidden");
}
// function addComment(taskId, comment, inputEl) {
//   if (!comment.trim()) return;
//   const project = projects.find((p) => p.id === currentProjectId).tasks;
//   const task = project.find((t) => t.id === taskId);
//   task.comments.push({ text: comment, replies: [] });
//   localStorage.setItem("tasks", JSON.stringify(tasks));
//   console.log(project);
//   inputEl.value = "";
//   renderTasks();

//   socket.send(
//     JSON.stringify({
//       type: "addComment",
//       taskId: taskId,
//       projectId: currentProjectId,
//       comment: comment, // ✅ Send comment content
//     })
//   );
// }

// delete task
function deleteTask(taskId) {
  const confirmed = confirm("Are you sure you want to delete this task?");
  if (!confirmed) return;
  // let tasks = projects.find((p) => p.id === currentProjectId).tasks;
  // const index = tasks.findIndex((t) => t.id === taskId);
  // if (index !== -1) {
  //   tasks.splice(index, 1);
  //   localStorage.setItem("projects", JSON.stringify(projects));
  // renderTasks();
  // renderCalendarView();
  // renderStatusChart();
  // renderAssigneeChart();
  // }
  socket.send(
    JSON.stringify({
      type: "taskDeleted",
      taskId: taskId,
      projectId: currentProjectId,
    })
  );
}
function renderNestedComments(comments, taskId, path = []) {
  return `
    <ul class="ml-4 border-l pl-2 space-y-1">
      ${comments
        .map((c, i) => {
          const currentPath = [...path, i];
          const pathId = currentPath.join("-");
          return `
            <li>
              🔸 ${c.text}
              <button class="text-xs text-blue-500 ml-1" onclick="toggleReplyBox('${taskId}', '${pathId}')">↩ Reply</button>
              <div id="reply-${taskId}-${pathId}" class="hidden mt-1">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  class="text-xs w-full border rounded px-2 py-1 mt-1"
                  onkeydown="if(event.key==='Enter') addNestedReply('${taskId}', '${pathId}', this.value, this)"
                />
              </div>
              ${renderNestedComments(c.replies, taskId, currentPath)}
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function toggleReplyBox(taskId, pathId) {
  const replyBox = document.getElementById(`reply-${taskId}-${pathId}`);
  if (replyBox) replyBox.classList.toggle("hidden");
}

function addNestedReply(taskId, pathId, text, inputEl) {
  if (!text.trim()) return;

  const project = projects.find((p) => p.id === currentProjectId);
  const task = project.tasks.find((t) => t.id === taskId);
  let comments = task.comments;

  if (pathId) {
    const indices = pathId.split("-").map(Number);
    for (let i = 0; i < indices.length; i++) {
      comments = comments[indices[i]].replies;
    }
  }

  const replyObj = { text, replies: [] };
  comments.push(replyObj);

  localStorage.setItem("projects", JSON.stringify(projects));
  inputEl.value = "";
  renderTasks();
  console.log(projects);

  // 🔁 Send real-time update
  socket.send(
    JSON.stringify({
      type: "addNestedReply",
      taskId,
      projectId: currentProjectId,
      pathId,
      text,
    })
  );
 
}

// basics of filter tasks
function filterTasks(filter) {
  let project = projects.find((p) => p.id === currentProjectId);
  // console.log("Current Project:", project);
  // console.log(filter);
  if (filter === "all") {
    renderTasks();
  } else if (filter === "high" || filter === "medium" || filter === "low") {
    const filteredTasks = project?.tasks?.filter(
      (task) => task.priority === filter
    );
    // console.log("Filtered Tasks:", filteredTasks);
    renderTasks(filteredTasks);
  } else {
    const filteredTasks = project?.tasks?.filter(
      (task) => task.status === filter
    );
    renderTasks(filteredTasks);
  }
}
document.getElementById("task-filter").addEventListener("change", (e) => {
  filter = e.target.value;
  filterTasks(filter);
});

function setActiveProject(id) {
  currentProjectId = id;
  renderTasks();
  renderCalendarView();
  renderStatusChart();
}
function DeleteProject(id) {
  const confirmed = confirm("Are you sure you want to delete this project?");
  if (!confirmed) return;

  const index = projects.findIndex((p) => p.id === id);
  if (index !== -1) {
    projects.splice(index, 1);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjectList();
    // Reset to default project if current project is deleted
    if (currentProjectId === id) {
      currentProjectId = "proj-1";
      renderTasks();
      renderCalendarView();
      renderStatusChart();
      renderAssigneeChart();
    }
  }
}
let createNewProjectBtn = document.getElementById("new-project-btn");
createNewProjectBtn.addEventListener("click", () => {
  const name = prompt("Enter project name:");
  if (!name) return;
  alert(`Project ${name} created  successfully!`);
  const newProject = {
    id: "proj-" + Date.now(),
    name,
    tasks: [],
  };

  projects.push(newProject);
  localStorage.setItem("projects", JSON.stringify(projects));
  renderProjectList();
});
