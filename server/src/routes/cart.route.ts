import { Router } from "express";
import { redis, redisPub } from "../config/db";

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
        return { id: id, ...data }; // Include the key as ID
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

  const vehicleData: Record<string, string> = {
    name: req.body.name ?? "unknown",
    speed: req.body.speed ?? 0, // Default speed to "0" if not provided
    startLocation: req.body.startLocation || "Unknown", // Default location if not provided
    endLocation: req.body.endLocation || "Unknown", // Default location if not provided
  };

  await redis.hSet(`vehicle:${id}`, vehicleData);
  await redisPub.publish("vehicles", JSON.stringify({ id: id, ...req.body }));
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
