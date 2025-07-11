import io from "socket.io-client";

const SOCKET_SERVER =
  import.meta.env.VITE_SOCKET_SERVER || "http://localhost:8000";

console.log(SOCKET_SERVER);

const socket = io(SOCKET_SERVER, {
  transports: ["websocket"],
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

  subscribeCamera(cartName: string, callback: any) {
    socket.emit("subscribe-camera", cartName);

    socket.on("camera-update", (data: { name: string; data: string }) => {
      if (data.name === cartName) {
        callback(data.data);
      }
    });
  },

  unsubscribeCamera(cartName: string) {
    socket.emit("unsubscribe-camera", cartName);
  },
};
