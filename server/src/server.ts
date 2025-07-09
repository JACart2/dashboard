import express = require("express");
import { createServer as createHTTPServer } from "http";
import { ServerOptions, createServer as createHTTPSServer } from "https";
import routes from "./routes";
import cors = require("cors");
import { Server } from "socket.io";
import path = require("path");
import { redisSub } from "./config/db";
import CameraSubManager from "./config/camera-subs";
import fs = require("fs");
import db = require("db");

let httpsOptions: ServerOptions = {};

const useHTTPS = !!process.env.SSL_KEY_PATH && !!process.env.SSL_CERT_PATH;
const app = express();
let server;

if (useHTTPS) {
  const httpsOptions: ServerOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  };
  server = createHTTPSServer(httpsOptions, app);
} else {
  server = createHTTPServer(app);
}

const io = new Server(server, {
  cors: {
    origin: ["*"],
    methods: ["GET", "POST", "PUT"],
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

app.use(
  cors({
    origin: "*",
  })
);

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
