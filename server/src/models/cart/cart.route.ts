import { Router } from "express";
import { redis, redisPub, redisSub } from "../../config/db";
import CartModel from "./cart.model";
import { Utils, CartUtils } from "../../config/utils";
import ROSListener from "./ros";
import CameraSubManager from "../../config/camera-subs";

const vehicleRouter = Router();

// Create a ROSListener given a cart's ROS IP and listen for topics
vehicleRouter.post("/register/", async (req, res) => {
  try {
    let url = req.body?.url;
    const name = req.body?.name;

    // If a URL isn't explicitly provided, build one from an explicit ip/port or
    // fall back to the source IP of the request combined with the provided port.
    if (url == undefined && !!req.body?.port) {
      let ip = req.body?.ip;

      if (!ip) {
        ip =
          req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
          req.socket.remoteAddress;

        if (ip?.startsWith("::ffff:")) {
          ip = ip.replace("::ffff:", "");
        }
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
      new ROSListener(url, name);
    } else {
      ROSListener.listeners[name] = new ROSListener(url, name);
    }

    res.json({ name, url });
  } catch (err) {
    console.error("[ROS] Registration error:", err);
    res.status(500).json({ error: "Registration failed", details: err instanceof Error ? err.message : String(err) });
  }
});

// Retrieve list of all currently registered carts
vehicleRouter.get("/", async (req, res) => {
  try {
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
          console.log("[REDIS] Error parsing vehicle data:", err instanceof Error ? err.message : String(err));
        }
      })
    );

    res.json(vehicles);
  } catch (err) {
    console.error("[REDIS] Error fetching vehicles:", err);
    res.status(500).json({ error: "Failed to fetch vehicles", details: err instanceof Error ? err.message : String(err) });
  }
});

// Retrieve cart by its name
vehicleRouter.get("/:name/", async (req, res) => {
  try {
    const item = await redis.hGetAll(`vehicle:${req.params.name}`);

    if (!item || Object.keys(item).length === 0) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    res.json(item);
  } catch (err) {
    console.error("[REDIS] Error fetching vehicle:", err);
    res.status(500).json({ error: "Failed to fetch vehicle", details: err instanceof Error ? err.message : String(err) });
  }
});

// Create new cart, using `name` as the key
vehicleRouter.post("/", async (req, res) => {
  try {
    const result = await CartUtils.editCart(req.body.name, req.body);

    res.json({ ...result });
  } catch (err) {
    console.error("[REDIS] Error creating vehicle:", err);
    res.status(500).json({ error: "Failed to create vehicle", details: err instanceof Error ? err.message : String(err) });
  }
});

// Update a cart given its name
vehicleRouter.put("/:name/", async (req, res) => {
  try {
    const result = await CartUtils.editCart(req.params.name, req.body);

    res.json(result);
  } catch (err) {
    console.error("[REDIS] Error updating vehicle:", err);
    res.status(500).json({ error: "Failed to update vehicle", details: err instanceof Error ? err.message : String(err) });
  }
});

// Delete a cart given its name
vehicleRouter.delete("/:name/", async (req, res) => {
  try {
    await CartUtils.deleteCart(req.params.name);

    res.json({});
  } catch (err) {
    console.error("[REDIS] Error deleting vehicle:", err);
    res.status(500).json({ error: "Failed to delete vehicle", details: err instanceof Error ? err.message : String(err) });
  }
});

// Toggle whether a given cart is requesting help or not
vehicleRouter.post("/:name/toggle-help", async (req, res) => {
  try {
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
      helpRequested,
    });

    res.json(result);
  } catch (err) {
    console.error("[REDIS] Error toggling help:", err);
    res.status(500).json({ error: "Failed to toggle help", details: err instanceof Error ? err.message : String(err) });
  }
});

export default vehicleRouter;
