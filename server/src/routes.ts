import { Router } from "express";
import vehicleRouter from "./models/cart/cart.route";

const routes = Router();

// Defines the base paths and the routers that are used
routes.use("/vehicles", vehicleRouter);

export default routes;
