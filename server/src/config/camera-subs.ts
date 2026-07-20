import { Socket } from "socket.io";

type CameraName = "front" | "rear";

export default class CameraSubManager {
  private static subscriptions: { [key: string]: Set<Socket> } = {};

  private static key(cartName: string, camera: CameraName) {
    return `${cartName.trim().toLowerCase()}:${camera}`;
  }

  static subscribe(cartName: string, camera: CameraName, socket: Socket) {
    const key = this.key(cartName, camera);

    if (!this.subscriptions[key]) {
      this.subscriptions[key] = new Set();
    }

    this.subscriptions[key].add(socket);
  }

  static unsubscribe(cartName: string, camera: CameraName, socket: Socket) {
    const key = this.key(cartName, camera);
    this.subscriptions[key]?.delete(socket);
  }

  static unsubscribeAll(socket: Socket) {
    Object.values(this.subscriptions).forEach((subscribers) => {
      subscribers.delete(socket);
    });
  }

  static getCameraSubscriptions(cartName: string, camera: CameraName) {
    const key = this.key(cartName, camera);
    return this.subscriptions[key] ?? new Set<Socket>();
  }

  static emitFrame(cartName: string, camera: CameraName, data: string) {
    const normalizedName = cartName.trim().toLowerCase();
    const sockets = CameraSubManager.getCameraSubscriptions(
      normalizedName,
      camera,
    );

    sockets.forEach((socket) => {
      socket.emit("camera-update", {
        name: normalizedName,
        camera,
        data,
      });
    });
  }

  static encodeBase64(data: string | number[]) {
    if (typeof data === "string") {
      return `data:image/jpeg;base64,${data}`;
    }

    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return `data:image/jpeg;base64,${btoa(binary)}`;
  }
}