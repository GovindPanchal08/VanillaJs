let socket
function connectWebSocket() {
  socket = new WebSocket("ws://localhost:3000");

  // socket.addEventListener("open", () => {
  //   console.log("WebSocket connection established");
  // });
  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({ type: "getInitialData", projectId: currentProjectId })
    );
  });
  socket.addEventListener("message", async (event) => {
    let data;
    if (event.data instanceof Blob) {
      const text = await event.data.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(event.data);
    }

    if (data.type === "projectsList") {
      projects = data.projects;
      renderProjectList(projects);
    }
  });
  socket.addEventListener("message", async (event) => {
    let data;
    if (event.data instanceof Blob) {
      const text = await event.data.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(event.data);
    }

    if (data.type === "initialData") {
      const project = projects.find((p) => p.id === currentProjectId);
      project.tasks = data.tasks;
      renderTasks(project.tasks);
      renderCalendarView(project.tasks);
      renderStatusChart(project.tasks);
      renderAssigneeChart(project.tasks);
    }
  });
  // task update event listener
  socket.addEventListener("message", async (event) => {
    let data;

    if (event.data instanceof Blob) {
      const text = await event.data.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(event.data);
    }

    if (data.type === "task-update" && data.projectId === currentProjectId) {
      const project = projects.find((p) => p.id === data.projectId);
      const task = project?.tasks?.find((t) => t.id === data.taskId);

      if (task) {
        task.status = data.status;
        // localStorage.setItem("projects", JSON.stringify(projects));
        renderTasks();
        renderStatusChart();
        renderAssigneeChart();
      }
    }
  });
  // listen for task creation events
  socket.addEventListener("message", async (event) => {
    let data;

    if (event.data instanceof Blob) {
      const text = await event.data.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(event.data);
    }

    if (data.type === "taskCreated") {
      const project = projects.find((p) => p.id === currentProjectId);
      project.tasks.push(data.task);
      localStorage.setItem("projects", JSON.stringify(projects));
      renderTasks();
      renderCalendarView();
      renderStatusChart();
      renderAssigneeChart();
    }
    // You can handle "taskUpdated", "taskDeleted" similarly
  });
  // listen for task deletion events
  socket.addEventListener("message", async (event) => {
    let data;
    if (event.data instanceof Blob) {
      const text = await event.data.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(event.data);
    }

    if (data.type === "taskDeleted" && data.projectId === currentProjectId) {
      let tasks = projects.find((p) => p.id === data.projectId).tasks;
      const index = tasks.findIndex((t) => t.id === data.taskId);
      if (index !== -1) {
        tasks.splice(index, 1);
        localStorage.setItem("projects", JSON.stringify(projects));
        renderTasks();
        renderCalendarView();
        renderStatusChart();
        renderAssigneeChart();
      }
    }
    // You can handle "taskUpdated", "taskDeleted" similarly
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  socket.addEventListener("close", () => {
    // console.log("WebSocket connection closed");
    // Optionally, you can try to reconnect here
    setTimeout(connectWebSocket, 10);
  });

  return socket;
}
