import { Router } from "express";
import { redis, redisPub, redisSub } from "../../config/db";
import CartModel from "./cart.model";
import { Utils, CartUtils } from "../../config/utils";
import ROSListener from "./ros";

const vehicleRouter = Router();

vehicleRouter.get("/", async (req, res) => {
  let keys = await redis.keys("vehicle:*");
  if (keys.length === 0) {
    res.send([]);
    return;
  }

  const vehicles = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hGetAll(key);

        const parsedData = Utils.parseData(data);

        return { ...parsedData }; // Include the key as ID
      } catch (err) {
        console.log(err.message);
      }
    })
  );

  res.json(vehicles);
});

vehicleRouter.get("/:name/", async (req, res) => {
  const item = await redis.hGetAll(`vehicle:${req.params.name}`);

  if (!item || Object.keys(item).length === 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(item);
});

vehicleRouter.post("/", async (req, res) => {
  const result = await CartUtils.updateCart(req.body.name, req.body);

  // Utils.updateCart(id, req.body);

  // await redis.hSet(`vehicle:${id}`, data.object);
  // await redisPub.publish(
  //   "vehicles",
  //   JSON.stringify({ id: id, ...data.stringified })
  // );

  res.json({ ...result });
});

vehicleRouter.put("/:name/", async (req, res) => {
  const result = CartUtils.updateCart(req.params.name, req.body);

  res.json(result);
});

vehicleRouter.post("/register/", async (req, res) => {
  const url = req.body?.url;
  const name = req.body?.name;

  if (!url || !name) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  if (!redis.exists(`vehicle:${name}`)) {
    await CartUtils.updateCart(name, { name: name });
  }

  const rosListener = new ROSListener(url, name);

  res.json({ name, url });
});

export default vehicleRouter;
