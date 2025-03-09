import { Router } from "express";
import { redis, redisPub, redisSub } from "../config/db";
import CartModel from "../models/cart-model";

const vehicleRouter = Router();

vehicleRouter.get("/", async (req, res) => {
  let keys = await redis.keys("vehicle:*");
  if (keys.length === 0) {
    res.send([]);
    return;
  }

  keys = keys.filter((key) => !key.endsWith(":id"));

  const vehicles = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hGetAll(key);
        const id = key.split(":").pop();

        const parsedData = {};

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          parsedData[key] = JSON.parse(value);
        });

        return { id: id, ...parsedData }; // Include the key as ID
      } catch (err) {
        console.log(err.message);
      }
    })
  );

  res.send(vehicles);
});

vehicleRouter.get("/:id/", async (req, res) => {
  const item = await redis.hGetAll(`vehicle:${req.params.id}`);

  if (!item || Object.keys(item).length === 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.send(item);
});

vehicleRouter.post("/", async (req, res) => {
  const id = await redis.incr("vehicle:id");

  const vehicleData: Record<string, string> = {};
  const rawData = {};

  Object.entries(req.body).forEach(([key, value]: [string, any]) => {
    if (key in CartModel) {
      vehicleData[key] = JSON.stringify(value);
      rawData[key] = value;
    }
  });

  await redis.hSet(`vehicle:${id}`, vehicleData);
  await redisPub.publish("vehicles", JSON.stringify({ id: id, ...rawData }));
});

vehicleRouter.patch("/:id/", async (req, res) => {
  const exists = await redis.exists(`vehicle:${req.params.id}`);

  if (exists <= 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  await redis.hSet(`vehicle:${req.params.id}`, req.body);
  await redisPub.publish(
    "vehicles",
    JSON.stringify({ id: req.params.id, ...req.body })
  );
});

export default vehicleRouter;
