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
    origin: "*",
    methods: ["GET", "POST"],
  },
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "../static")));
app.use(cors());

redisSub.subscribe("vehicles", (message) => {
  console.log("Received vehicle update:", message);
  io.emit("vehicles", JSON.parse(message));
});

const PORT = 8002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
