import { Socket } from "socket.io";

export default class CameraSubManager {
  private static subscriptions: { [key: string]: Set<Socket> } = {};
  static selected: string = "";

  static subscribe(cartName: string, socket: Socket) {
    if (!this.subscriptions[cartName]) this.subscriptions[cartName] = new Set();

    this.subscriptions[cartName].add(socket);
    this.selected = cartName;
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

  static TESTgetCart() {
    return this.selected;
  }
}
