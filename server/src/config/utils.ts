import CartModel from "../models/cart/cart.model";
import { redis, redisPub } from "./db";

import { Matrix, inverse } from "ml-matrix";
import { Vector3 } from "roslib";

interface JSONObject {
  [key: string]: any;
}

type Model<T extends JSONObject> = {
  [K in keyof T]: T[K];
};

export namespace Utils {
  // Filter out any keys not defined in the provided model
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

  // Stringify each value in the provided object (Props in a Redis hash must be strings)
  export function stringifyValues(data: JSONObject) {
    const stringifiedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      stringifiedData[key] = JSON.stringify(value);
    });

    return stringifiedData;
  }

  // Parse each value in the provided object
  export function parseData(data: JSONObject) {
    const parsedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      parsedData[key] = JSON.parse(value);
    });

    return parsedData;
  }
}

export namespace CartUtils {
  // Either create a new cart or update an existing cart given its name
  export async function editCart(
    name: string,
    data: Partial<typeof CartModel>
  ) {
    const filtered = Utils.filterToModel(CartModel, data);
    if (Object.keys(filtered).length <= 0) return {};

    const stringified = Utils.stringifyValues(filtered);

    await redis.hSet(`vehicle:${name}`, stringified);

    await redisPub.publish(
      "vehicles",
      JSON.stringify({ name: name, data: filtered })
    );

    console.log(`[REDIS] "${name}" modified:`, filtered);

    return filtered;
  }

  export async function deleteCart(name: string) {
    await redis.del(`vehicle:${name}`);

    await redisPub.publish(
      "vehicles",
      JSON.stringify({ name: name, deleted: true })
    );

    console.log(`[REDIS] "${name}" deleted`);

    return;
  }
}

export namespace Transform {
  const mapProjectionMatrix = new Matrix([
    [-0.00000156, 0.00001108, -78.86214758],
    [-0.00000849, -0.00000137, 38.43388357],
    [0, 0, 1],
  ]);

  const inverseMapProjectionMatrix = inverse(mapProjectionMatrix);

  export function rosToMapCoords(
    position: Vector3 | { x: number; y: number; z: number }
  ) {
    const { x, y } = position;
    const [x2, y2] = mapProjectionMatrix
      .mmul(Matrix.columnVector([x, y, 1]))
      .to1DArray();
    return [x2, y2];
  }
  export function lngLatToMapCoords(lngLat: { lat: number; lng: number }) {
    const { lat, lng } = lngLat;
    const [x2, y2] = inverseMapProjectionMatrix
      .mmul(Matrix.columnVector([lng, lat, 1]))
      .to1DArray();
    return [x2, y2];
  }
}
