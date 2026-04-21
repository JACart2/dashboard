import { Router } from "express";
import vehicleRouter from "./models/cart/cart.route";
import stopRouter from "./models/cart/stop.route";

const routes = Router();

// Defines the base paths and the routers that are used
routes.use("/vehicles", vehicleRouter);
routes.use("/vehicles", stopRouter);

export default routes;
