import express = require("express");
import { createServer as createHttpServer } from "http";
import { ServerOptions, createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import cors = require("cors");
import path = require("path");
import fs = require("fs");
import dotenv from "dotenv";

import routes from "./routes";
import { redisSub } from "./config/db";
import CameraSubManager from "./config/camera-subs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const envPath = path.resolve(__dirname, "../.env");
const dotenvResult = dotenv.config({ path: envPath });

console.log("[ENV] Loading env from:", envPath);
console.log("[ENV] dotenv error:", dotenvResult.error);
console.log("[ENV] SSL_KEY_PATH:", process.env.SSL_KEY_PATH);
console.log("[ENV] SSL_CERT_PATH:", process.env.SSL_CERT_PATH);


const useHTTPS = !!process.env.SSL_KEY_PATH && !!process.env.SSL_CERT_PATH;
const app = express();
let server;

// Shared CORS allowlist for Express and Socket.IO
const allowedOrigins = [
  // Dashboard production/local HTTPS server
  "https://10.247.225.41:8000",
  "http://10.247.225.41:8000",

  // Dashboard Vite dev server
  "http://10.247.225.41:5174",
  "https://10.247.225.41:5174",

  // Cart UI Vite dev server when accessed directly on dashboard host
  "http://10.247.225.41:5173",
  "https://10.247.225.41:5173",

  // Local browser testing
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:5174",
  "https://localhost:5174",
  "http://localhost:8000",
  "https://localhost:8000",
];

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  // Allow localhost on any port
  if (
    origin.startsWith("http://localhost") ||
    origin.startsWith("https://localhost") ||
    origin.startsWith("http://127.0.0.1") ||
    origin.startsWith("https://127.0.0.1")
  ) {
    return true;
  }

  // Allow ZeroTier/private dev clients on Vite cart UI/dashboard dev ports
  if (/^http:\/\/10\.\d+\.\d+\.\d+:5173$/.test(origin)) return true;
  if (/^http:\/\/10\.\d+\.\d+\.\d+:5174$/.test(origin)) return true;

  return false;
}

// If SSL key/cert files are provided, we start the server as HTTPS
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

// Initialize WebSocket server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.log("[Socket.IO CORS] Blocked origin:", origin);
        callback(new Error(`Not allowed by Socket.IO CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Define how each WebSocket message is handled
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

// Define CORS rules for the server
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.log("[CORS] Blocked origin:", origin);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../static")));
app.use("/api", routes);
app.set("trust proxy", true);

// Any messages to redisSub on the server will be sent to all connected carts
redisSub.subscribe("vehicles", (message) => {
  // console.log("[WS] Received vehicle update:", message, "\n");
  io.emit("vehicles", JSON.parse(message));
});

const PORT = 8000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT} \n`)
);
