import io from "socket.io-client";

const SOCKET_SERVER =
  import.meta.env.VITE_SOCKET_SERVER || "http://localhost:8002";

const socket = io(SOCKET_SERVER, { transports: ["websocket"] });

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
};
