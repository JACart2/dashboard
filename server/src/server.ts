import express = require("express");
import bodyParser = require("body-parser");
import { createServer } from "http";
import routes from "./routes";
import helmet from "helmet";
import cors = require("cors");
import { Server } from "socket.io";
import path = require("path");
import { redisSub } from "./config/db";
import CameraSubManager from "./config/camera-subs";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["*", "http://localhost:8000"],
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log("New WebSocket connection:", socket.id, "\n");

  socket.on("message", (msg) => {});

  socket.on("subscribe-camera", (cartName: string) => {
    CameraSubManager.subscribe(cartName, socket);
  });

  socket.on("unsubscribe-camera", (cartName: string) => {
    CameraSubManager.unsubscribe(cartName, socket);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id, "\n");
  });
});

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "../static")));

redisSub.subscribe("vehicles", (message) => {
  console.log("[WS] Received vehicle update:", message, "\n");
  io.emit("vehicles", JSON.parse(message));
});

const PORT = 8000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT} \n`)
);
