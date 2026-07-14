import io from "socket.io-client";
import type { CartLogUpdate, DashboardAIDecision } from "../types";

const socket = io(window.location.origin, {
  transports: ["websocket", "polling"],
});

type CameraName = "front" | "rear";

type CameraUpdate = {
  name: string;
  camera?: CameraName;
  data: string;
};

type CameraFrame = {
  name: string;
  camera: CameraName;
  data: string;
};

type DashboardAIDecisionUpdate = DashboardAIDecision;

function normalizeCartName(name: string) {
  return name.trim().toLowerCase();
}

function cameraKey(cartName: string, camera: CameraName) {
  return `${normalizeCartName(cartName)}:${camera}`;
}

const cameraCallbacks = new Map<string, (data: string) => void>();

socket.on("connect", () => {
  console.log("[Socket.IO] connected:", socket.id);
});

socket.on("disconnect", (reason: string) => {
  console.log("[Socket.IO] disconnected:", reason);
});

socket.on("connect_error", (error: Error) => {
  console.error("[Socket.IO] connect_error:", error.message, error);
});

socket.on("camera-update", (data: CameraUpdate) => {
  const camera = data.camera ?? "front";
  const key = cameraKey(data.name, camera);

  // console.log("[Socket.IO] camera-update received:", {
  //   name: data.name,
  //   camera,
  //   key,
  //   length: data.data?.length,
  // });

  const callback = cameraCallbacks.get(key);

  if (callback) {
    callback(data.data);
  } else {
    console.log("[Socket.IO] no camera callback registered for:", key);
  }
});

export const vehicleSocket = {
  subscribe(callback: any) {
    socket.on("vehicles", callback);
  },

  unsubscribe(callback: any) {
    socket.off("vehicles", callback);
  },

  emit(data: any) {
    socket.emit("vehicles", data);
  },

  subscribeCamera(
    cartName: string,
    camera: CameraName,
    callback: (data: string) => void
  ) {
    const key = cameraKey(cartName, camera);

    console.log("[Socket.IO] subscribeCamera called:", {
      cartName,
      camera,
      key,
    });

    cameraCallbacks.set(key, callback);

    socket.emit("subscribe-camera", {
      name: normalizeCartName(cartName),
      camera,
    });
  },

  subscribeDashboardAIDecisions(
    callback: (decision: DashboardAIDecisionUpdate) => void,
  ): void {
    socket.on("dashboard-ai-decision", callback);
  },

  unsubscribeDashboardAIDecisions(
    callback: (decision: DashboardAIDecisionUpdate) => void,
  ): void {
    socket.off("dashboard-ai-decision", callback);
  },

  subscribeDecisionLogs(
    callback: (update: CartLogUpdate) => void,
  ): void {
    socket.on("decision-log-update", callback);
  },

  unsubscribeDecisionLogs(
    callback: (update: CartLogUpdate) => void,
  ): void {
    socket.off("decision-log-update", callback);
  },
  
  unsubscribeCamera(cartName: string, camera: CameraName) {
    const key = cameraKey(cartName, camera);

    console.log("[Socket.IO] unsubscribeCamera called:", {
      cartName,
      camera,
      key,
    });

    cameraCallbacks.delete(key);

    socket.emit("unsubscribe-camera", {
      name: normalizeCartName(cartName),
      camera,
    });
  },

  publishCameraFrame(cartName: string, camera: CameraName, imageData: string) {
    const frame: CameraFrame = {
      name: normalizeCartName(cartName),
      camera,
      data: imageData,
    };

    console.log("[Socket.IO] publishing camera-frame:", {
      name: frame.name,
      camera,
      length: imageData.length,
    });

    socket.emit("camera-frame", frame);
  },
};