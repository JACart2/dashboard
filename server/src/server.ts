import express = require("express");
import { createServer as createHttpServer } from "http";
import {
  ServerOptions,
  createServer as createHttpsServer,
} from "https";
import { Server } from "socket.io";
import cors = require("cors");
import path = require("path");
import fs = require("fs");
import dotenv from "dotenv";

import routes from "./routes";
import { redis, redisSub } from "./config/db";
import CameraSubManager from "./config/camera-subs";

/*
 * Docker Compose injects environment variables directly into the process.
 * Only load a .env file as a local-development fallback.
 */
if (process.env.NODE_ENV !== "production") {
  const envPath =
    process.env.ENV_FILE_PATH ??
    path.resolve(process.cwd(), ".env");

  dotenv.config({ path: envPath });

  console.log("[ENV] Development environment file:", envPath);
}

const app = express();

const PORT = Number(process.env.PORT ?? 8000);
const HOST = process.env.HOST ?? "0.0.0.0";

const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

const hasSSLConfiguration = Boolean(sslKeyPath && sslCertPath);

if (
  (sslKeyPath && !sslCertPath) ||
  (!sslKeyPath && sslCertPath)
) {
  throw new Error(
    "Both SSL_KEY_PATH and SSL_CERT_PATH must be provided together."
  );
}

if (sslKeyPath && !fs.existsSync(sslKeyPath)) {
  throw new Error(`SSL key file does not exist: ${sslKeyPath}`);
}

if (sslCertPath && !fs.existsSync(sslCertPath)) {
  throw new Error(
    `SSL certificate file does not exist: ${sslCertPath}`
  );
}

/*
 * When running through tsx:
 *   process.cwd() normally points to /workspace/dashboard
 *
 * When running compiled JavaScript:
 *   __dirname may point to /app/dist or /app/dist/server
 *
 * STATIC_DIR lets Docker explicitly define the correct location.
 */
const staticDirectory =
  process.env.STATIC_DIR ??
  path.resolve(process.cwd(), "static");

console.log("[SERVER] Configuration:", {
  nodeEnv: process.env.NODE_ENV,
  host: HOST,
  port: PORT,
  https: hasSSLConfiguration,
  staticDirectory,
  sslKeyPath,
  sslCertPath,
});

/*
 * Shared CORS allowlist for Express and Socket.IO.
 *
 * Example:
 * CORS_ALLOWED_ORIGINS=https://10.247.225.41:8000,http://10.247.225.41:5173
 */
const defaultOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:5174",
  "https://localhost:5174",
  "http://localhost:8000",
  "https://localhost:8000",
];

const environmentOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([...defaultOrigins, ...environmentOrigins]),
];

console.log("[CORS] Allowed origins:", allowedOrigins);

function isAllowedOrigin(origin?: string): boolean {
  /*
   * Requests without an Origin header include curl, server-to-server
   * requests, Docker health checks, and some same-origin requests.
   */
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.warn("[CORS] Blocked origin:", origin);
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.set("trust proxy", true);
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

let server;

if (hasSSLConfiguration) {
  console.log("[SERVER] Starting HTTPS server");

  const httpsOptions: ServerOptions = {
    key: fs.readFileSync(sslKeyPath!),
    cert: fs.readFileSync(sslCertPath!),
  };

  server = createHttpsServer(httpsOptions, app);
} else {
  console.log("[SERVER] Starting HTTP server");
  server = createHttpServer(app);
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.warn("[Socket.IO CORS] Blocked origin:", origin);
      callback(
        new Error(
          `Origin not allowed by Socket.IO CORS: ${origin}`
        )
      );
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },

  transports: ["websocket", "polling"],

  /*
   * Compressed base64 camera frames may approach or exceed the
   * default Engine.IO payload limit.
   */
  maxHttpBufferSize: Number(
    process.env.SOCKET_MAX_BUFFER_BYTES ?? 5_000_000
  ),

  pingInterval: Number(
    process.env.SOCKET_PING_INTERVAL_MS ?? 25_000
  ),

  pingTimeout: Number(
    process.env.SOCKET_PING_TIMEOUT_MS ?? 20_000
  ),
});

io.engine.on("connection_error", (error) => {
  console.error("[Socket.IO] Engine connection error:", {
    code: error.code,
    message: error.message,
    url: error.req?.url,
    origin: error.req?.headers?.origin,
  });
});

type CameraName = "front" | "rear";

type CameraSubscriptionPayload =
  | string
  | {
      name?: string;
      camera?: CameraName;
    };

type CameraFramePayload = {
  name: string;
  camera?: CameraName;
  data: string;
};

type DecisionLogPayload = {
  cartName?: string;
  timestamp?: string;
  severity?: string;
  source?: string;
  message?: string;
};


function parseCameraSubscription(
  payload: CameraSubscriptionPayload
): {
  name: string;
  camera: CameraName;
} | null {
  if (typeof payload === "string") {
    const name = payload.trim().toLowerCase();

    if (!name) {
      return null;
    }

    return {
      name,
      camera: "front",
    };
  }

  const name = payload?.name?.trim().toLowerCase();

  if (!name) {
    return null;
  }

  return {
    name,
    camera: payload.camera ?? "front",
  };
}

io.on("connection", (socket) => {
  console.log("[Socket.IO] Client connected:", {
    id: socket.id,
    address: socket.handshake.address,
    origin: socket.handshake.headers.origin,
    transport: socket.conn.transport.name,
  });

  socket.on(
    "subscribe-camera",
    (payload: CameraSubscriptionPayload) => {
      const subscription = parseCameraSubscription(payload);

      if (!subscription) {
        console.warn(
          "[Camera] Invalid subscribe-camera payload:",
          payload
        );
        return;
      }

      console.log("[Camera] Client subscribed:", {
        socketId: socket.id,
        ...subscription,
      });

      /*
       * CameraSubManager currently appears to subscribe by cart name.
       * If it later distinguishes front/rear cameras, pass the camera
       * field into the manager as well.
       */
      CameraSubManager.subscribe(subscription.name, socket);
    }
  );

  socket.on(
    "unsubscribe-camera",
    (payload: CameraSubscriptionPayload) => {
      const subscription = parseCameraSubscription(payload);

      if (!subscription) {
        console.warn(
          "[Camera] Invalid unsubscribe-camera payload:",
          payload
        );
        return;
      }

      console.log("[Camera] Client unsubscribed:", {
        socketId: socket.id,
        ...subscription,
      });

      CameraSubManager.unsubscribe(subscription.name, socket);
    }
  );

  socket.on("camera-frame", (data: CameraFramePayload) => {
    if (
      !data?.name ||
      !data?.data ||
      typeof data.data !== "string"
    ) {
      console.warn("[Camera] Invalid camera-frame payload");
      return;
    }

    const name = data.name.trim().toLowerCase();
    const camera = data.camera ?? "front";

    if (!name) {
      console.warn("[Camera] Empty cart name in camera frame");
      return;
    }

    io.emit("camera-update", {
      name,
      camera,
      data: data.data,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket.IO] Client disconnected:", {
      id: socket.id,
      reason,
    });
  });

  socket.on(
    "decision-log",
    async (payload: DecisionLogPayload) => {
      const cartName = payload.cartName
        ?.trim()
        .toLowerCase();

      const message = payload.message?.trim();

      if (!cartName || !message) {
        console.warn(
          "[Decision Log] Invalid payload:",
          payload,
        );
        return;
      }

      const timestamp =
        payload.timestamp ?? new Date().toISOString();

      const level: "info" | "warn" | "error" | "debug" =
        payload.severity?.toLowerCase() === "error"
          ? "error"
          : payload.severity?.toLowerCase() === "warning" ||
              payload.severity?.toLowerCase() === "warn"
            ? "warn"
            : payload.severity?.toLowerCase() === "debug"
              ? "debug"
              : "info";

      const source =
        payload.source ?? "ai_anomaly_logging";

      const log = {
        timestamp,
        level,
        source,
        message,
      };

      io.emit("decision-log-update", {
        cartName,
        log,
      });

      try {
        const streamKey =
          `cart:${cartName}:dashboard-ai:input`;

        const aiPayload = {
          timestamp,
          cartName,
          nodeName: source,
          importance: severityToImportance(level),
          type: 0,
          text: message,
        };

        const entryId = await redis.xAdd(
          streamKey,
          "*",
          {
            payload: JSON.stringify(aiPayload),
          },
        );

        await redis.xTrim(
          streamKey,
          "MAXLEN",
          1000,
        );

        console.log(
          "[Dashboard AI] Stored decision log input:",
          {
            cartName,
            streamKey,
            entryId,
          },
        );
      } catch (error) {
        console.error(
          "[Dashboard AI] Failed to store input:",
          error,
        );
      }
    },
  );
});

  function severityToImportance(
  level: "info" | "warn" | "error" | "debug",
): number {
  switch (level) {
    case "error":
      return 2;

    case "warn":
      return 1;

    case "debug":
    case "info":
    default:
      return 0;
  }
}

/*
 * API routes should be registered before the SPA fallback.
 */
app.use("/api", routes);

/*
 * Serve the built dashboard frontend when static files exist.
 *
 * In Vite development mode, the frontend normally runs separately
 * on port 5174, so this directory may not exist yet.
 */
if (fs.existsSync(staticDirectory)) {
  console.log(
    "[STATIC] Serving dashboard frontend from:",
    staticDirectory
  );

  app.use(express.static(staticDirectory));

  /*
   * React SPA fallback. This must remain after /api and Socket.IO.
   *
   * Express 4 accepts "*". If your Express version rejects it,
   * replace this with "/{*splat}".
   */
  app.get("*", (_request, response) => {
    response.sendFile(path.join(staticDirectory, "index.html"));
  });
} else {
  console.warn(
    "[STATIC] Directory does not exist. API and Socket.IO will still run:",
    staticDirectory
  );
}

/*
 * Forward Redis cart updates to connected dashboard browsers.
 */
redisSub.subscribe("vehicles", (message) => {
  try {
    io.emit("vehicles", JSON.parse(message));
  } catch (error) {
    console.error(
      "[Redis] Failed to parse vehicles message:",
      error
    );
  }
});

/*
 * Optional future channel for AI-generated log analysis.
 */
redisSub.subscribe("ai:log-results", (message) => {
  try {
    io.emit("ai-analysis-update", JSON.parse(message));
  } catch (error) {
    console.error(
      "[Redis] Failed to parse AI analysis message:",
      error
    );
  }
});

redisSub.subscribe("dashboard-ai:decision", (message) => {
  try {
    const decision = JSON.parse(message);

    console.log("[Dashboard AI] Decision received:", {
      cartName: decision.cartName,
      model: decision.model,
      anomaly: decision.anomaly,
      severity: decision.severity,
    });

    io.emit("dashboard-ai-decision", decision);
  } catch (error) {
    console.error(
      "[Dashboard AI] Failed to parse decision:",
      error
    );
  }
});

server.listen(PORT, HOST, () => {
  const protocol = hasSSLConfiguration ? "https" : "http";

  console.log(
    `[SERVER] Dashboard listening on ${protocol}://${HOST}:${PORT}`
  );
});