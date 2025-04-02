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
  export async function updateCart(name: string, data: JSONObject) {
    const filtered = Utils.filterToModel(CartModel, data);
    const stringified = Utils.stringifyValues(filtered);

    await redis.hSet(`vehicle:${name}`, stringified);

    await redisPub.publish(
      "vehicles",
      JSON.stringify({ name: name, ...filtered })
    );

    return filtered;
  }
}
