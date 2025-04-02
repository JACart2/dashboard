import CartModel from "../models/cart/cart.model";
import { redis, redisPub } from "./db";

interface JSONObject {
  [key: string]: any;
}

type ModelType = Record<string, any>;
type Model<T extends JSONObject> = {
  [K in keyof T]: T[K];
};

export namespace Utils {
  export function filterAndStringify(model: any, data: JSONObject) {
    const rawData = {};
    const stringifiedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      if (key in model) {
        rawData[key] = value;
        stringifiedData[key] = JSON.stringify(value);
      }
    });

    return {
      object: rawData,
      stringified: stringifiedData,
    };
  }

  export function filterToModel<T extends JSONObject>(
    model: Model<T>,
    data: JSONObject
  ): Partial<T> {
    const filtered = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      if (key in model) {
        filtered[key] = value;
      }
    });

    return filtered;
  }

  export function stringifyValues(data: JSONObject) {
    const stringifiedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      stringifiedData[key] = JSON.stringify(value);
    });

    return stringifiedData;
  }

  export function parseData(data: any) {
    const parsedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      parsedData[key] = JSON.parse(value);
    });

    return parsedData;
  }
}

export namespace CartUtils {
  export async function getCartId(name: string): Promise<number> {
    const id = await redis.get(`vehicle:name:${name}`);

    return parseInt(id);
  }

  export async function updateCart(id: string | number, data: JSONObject) {
    if (typeof id !== "number") id = parseInt(id);

    const filtered = Utils.filterToModel(CartModel, data);
    const stringified = Utils.stringifyValues(filtered);

    await redis.hSet(`vehicle:${id}`, stringified);
    await redis.set(`vehicle:name:${filtered.name}`, id);

    await redisPub.publish("vehicles", JSON.stringify({ id: id, ...filtered }));

    return filtered;
  }
}
