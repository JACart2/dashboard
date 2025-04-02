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

  keys = keys.filter((key) => !key.endsWith(":id"));

  const vehicles = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hGetAll(key);
        const id = key.split(":").pop();

        const parsedData = Utils.parseData(data);

        return { id: id, ...parsedData }; // Include the key as ID
      } catch (err) {
        console.log(err.message);
      }
    })
  );

  res.json(vehicles);
});

vehicleRouter.get("/:id/", async (req, res) => {
  const item = await redis.hGetAll(`vehicle:${req.params.id}`);

  if (!item || Object.keys(item).length === 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(item);
});

vehicleRouter.post("/", async (req, res) => {
  const id = await redis.incr("vehicle:id");

  const result = CartUtils.updateCart(id, req.body);

  // Utils.updateCart(id, req.body);

  // await redis.hSet(`vehicle:${id}`, data.object);
  // await redisPub.publish(
  //   "vehicles",
  //   JSON.stringify({ id: id, ...data.stringified })
  // );

  res.json({ id: id, ...result });
});

vehicleRouter.put("/:id/", async (req, res) => {
  const result = CartUtils.updateCart(req.params.id, req.body);

  res.json(result);
});

vehicleRouter.post("/register/", async (req, res) => {
  const url = req.body?.url;
  const name = req.body?.name;

  if (!url || !name) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  let id = await CartUtils.getCartId(name);
  if (id == undefined) {
    id = await redis.incr("vehicle:id");
    await CartUtils.updateCart(id, { name: name });
  }

  const rosListener = new ROSListener(url, id);

  res.json({ name, url });
});

export default vehicleRouter;
