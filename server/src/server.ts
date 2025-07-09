import express = require("express");
import { createServer as createHttpServer } from "http";
import { ServerOptions, createServer as createHttpsServer } from "https";
import routes from "./routes";
import cors = require("cors");
import { Server } from "socket.io";
import path = require("path");
import { redisSub } from "./config/db";
import CameraSubManager from "./config/camera-subs";
import fs = require("fs");
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const useHTTPS = !!process.env.SSL_KEY_PATH && !!process.env.SSL_CERT_PATH;
const app = express();
let server;

if (useHTTPS) {
  console.log("STARTING HTTPS SERVER");
  const httpsOptions: ServerOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    rejectUnauthorized: false,
  };
  server = createHttpsServer(httpsOptions, app);
} else {
  console.log("STARTING HTTP (DEVELOPMENT) SERVER");
  server = createHttpServer(app);
}

const io = new Server(server, {
  cors: {
    origin: "https://35.153.174.48:8000",
    methods: ["GET", "POST", "PUT"],
    credentials: true,
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
    origin: (origin, callback) => {
      const allowedOrigins = ["https://35.153.174.48", "http://localhost:8000"];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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
