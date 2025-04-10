import { Socket } from "socket.io";

export default class CameraSubManager {
  private static subscriptions: { [key: string]: Set<Socket> } = {};

  static subscribe(cartName: string, socket: Socket) {
    if (!this.subscriptions[cartName]) this.subscriptions[cartName] = new Set();

    this.subscriptions[cartName].add(socket);
  }

  static unsubscribe(cartName: string, socket: Socket) {
    this.subscriptions[cartName]?.delete(socket);
  }

  static unsubscribeAll(socket: Socket) {
    Object.values(this.subscriptions).forEach((cart) => {
      cart.delete(socket);
    });
  }

  static isSubscribed(cartName: string, socket: Socket) {
    return this.subscriptions[cartName]?.has(socket) ?? false;
  }

  static getCartSubscriptions(cartName: string) {
    return this.subscriptions[cartName] ?? [];
  }

  static emitFrame(cartName: string, data: string) {
    const sockets = CameraSubManager.getCartSubscriptions(cartName);

    sockets.forEach((socket) => {
      socket.emit("camera-update", { name: cartName, data: data });
    });
  }

  static encodeBase64(data: string) {
    let binaryString = atob(data); // Decode Base64 string to binary
    let len = binaryString.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[1] = binaryString.charCodeAt(1);
    }

    // Create a Blob from the binary data
    let blob = new Blob([bytes], { type: "image/jpeg" });
    let imageUrl = URL.createObjectURL(blob);

    return imageUrl;
  }
}
