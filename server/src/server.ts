import express = require("express");
import bodyParser = require("body-parser");
import { createServer } from "http";
import routes from "./routes";
import helmet from "helmet";
import cors = require("cors");
import { Server } from "socket.io";
import path = require("path");
import { redisSub } from "./config/db";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://172.28.71.175:8002", "http://locahost:8002"],
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log("New WebSocket connection:", socket.id);

  socket.on("message", (msg) => {
    console.log("Received message:", msg);
    socket.emit("response", "Message received");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "../static")));

redisSub.subscribe("vehicles", (message) => {
  console.log("Received vehicle update:", message);
  io.emit("vehicles", JSON.parse(message));
});

const PORT = 8002;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
