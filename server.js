const http = require("http");

const express = require("express");

const app = express();
const server = http.createServer(app);

const port = 3000;
app.use(express.static("public"));
// ===== server.js (Backend WebSocket Server) =====
const WebSocket = require("ws");
const wss = new WebSocket.Server({ server });
const fs = require("fs");
const DATA_FILE = "projects.json";

let projects = {
  "proj-1": {
    name: "Default Project",
    tasks: [],
  },
};

// Load from file if exists
if (fs.existsSync(DATA_FILE)) {
  projects = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Save to file
function saveProjectsToFile() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    let data = JSON.parse(message);

    if (data.type === "getInitialData") {
      const project = projects[data.projectId] || { tasks: [] };
      ws.send(JSON.stringify({ type: "initialData", tasks: project.tasks }));
    }
    
    if (data.type === "taskCreated") {
      const project = projects[data.projectId];
      project.tasks.push(data.task);
      saveProjectsToFile();
      broadcast(
        JSON.stringify({
          type: "taskCreated",
          task: data.task,
          projectId: data.projectId,
        })
      );
    }

    if (data.type === "taskDeleted") {
      const tasks = projects[data.projectId].tasks;
      // let tasks = projects.find((p) => p.id === currentProjectId).tasks;
      const index = tasks.findIndex((t) => t.id === data.taskId);
      if (index !== -1) {
        tasks.splice(index, 1);
        saveProjectsToFile();
        broadcast(
          JSON.stringify({
            type: "taskDeleted",
            taskId: data.taskId,
            projectId: data.projectId,
          })
        );
      }
    }

    if (data.type === "task-update") {
      const project = projects[data.projectId];
      const task = project?.tasks?.find((t) => t.id === data.taskId);
      if (task) {
        task.status = data.status;
        saveProjectsToFile();
        broadcast(
          JSON.stringify({
            type: "task-update",
            taskId: data.taskId,
            status: data.status,
            projectId: data.projectId,
          })
        );
      }
    }

    if (data.type === "getProjects") {
      ws.send(JSON.stringify({ type: "projectsList", projects }));
    }
  });
});

function broadcast(msg) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== wss) {
      client.send(msg);
    }
  });
}

server.listen(port, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${port}`);
});
