import { Router } from "express";
import { redis, redisPub, redisSub } from "../../config/db";
import CartModel from "./cart.model";
import { Utils, CartUtils } from "../../config/utils";
import ROSListener from "./ros";
import CameraSubManager from "../../config/camera-subs";

const vehicleRouter = Router();

// Create a ROSListener given a cart's ROS IP and listen for topics
vehicleRouter.post("/register/", async (req, res) => {
  let url = req.body?.url;
  const name = req.body?.name;

  // If a URL isn't explicitly provided, we use request source IP and provided port
  if (url == undefined && !!req.body?.port) {
    let ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress;

    if (ip?.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    url = `ws://${ip}:${req.body.port}`;
  }

  if (!url || !name) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  console.log(`[ROS] Registering "${name}" to ${url}`, "\n");

  if (!(await redis.exists(`vehicle:${name}`))) {
    await CartUtils.editCart(name, { name: name });
    const rosListener = new ROSListener(url, name);
  } else {
    ROSListener.listeners[name] = new ROSListener(url, name);
  }

  res.json({ name, url });
});

// Retrieve list of all currently registered carts
vehicleRouter.get("/", async (req, res) => {
  let keys = await redis.keys("vehicle:*");
  if (keys.length === 0) {
    res.send([]);
    return;
  }

  // We need to JSON.parse() each cart property
  const vehicles = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hGetAll(key);

        const parsedData = Utils.parseData(data);

        return { ...parsedData };
      } catch (err) {
        console.log(err.message);
      }
    })
  );

  res.json(vehicles);
});

// Retrieve cart by its name
vehicleRouter.get("/:name/", async (req, res) => {
  const item = await redis.hGetAll(`vehicle:${req.params.name}`);

  if (!item || Object.keys(item).length === 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(item);
});

// Create new cart, using `name` as the key
vehicleRouter.post("/", async (req, res) => {
  const result = await CartUtils.editCart(req.body.name, req.body);

  res.json({ ...result });
});

// Update a cart given its name
vehicleRouter.put("/:name/", async (req, res) => {
  const result = CartUtils.editCart(req.params.name, req.body);

  res.json(result);
});

// Update a cart given its name
vehicleRouter.delete("/:name/", async (req, res) => {
  const result = CartUtils.deleteCart(req.params.name);

  res.json(result);
});

vehicleRouter.post("/:name/toggle-help", async (req, res) => {
  const name = req.params.name;

  if (!name) {
    res.status(404).json({ error: "Vehicle name is required" });
    return;
  }

  const data = await redis.hGetAll(`vehicle:${req.params.name}`);

  if (!data) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const vehicle = Utils.parseData(data) as typeof CartModel;

  const helpRequested = req.body?.helpRequested ?? !vehicle.helpRequested;

  const result = await CartUtils.editCart(name, {
    helpRequested: helpRequested,
  });

  res.json(result);
});

export default vehicleRouter;
