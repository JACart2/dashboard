import { Server } from "socket.io";

// Broadcasts anomaly log messages to all connected WebSocket clients
export default class AnomalyBroadcaster {
  private static io: Server | null = null;

  static init(io: Server) {
    this.io = io;
  }

  static broadcast(message: string) {
    if (!this.io) {
      console.warn("[AnomalyBroadcaster] broadcast() called before init()");
      return;
    }
    this.io.emit("anomaly-update", message);
  }
}
