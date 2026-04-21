import { Router } from "express";
import { redisPub } from "../../config/db";

const stopRouter = Router();

// REST endpoint to trigger stop on a specific cart
stopRouter.post("/:cartId/stop", (req, res) => {
  const { cartId } = req.params;
  
  try {
    // Publish to Redis which will be distributed to connected clients
    redisPub.publish("stop-signal", JSON.stringify({ cartId, timestamp: Date.now() }));
    
    console.log(`Stop signal sent for cart: ${cartId}`);
    res.json({ success: true, message: `Stop signal sent to cart ${cartId}` });
  } catch (error) {
    console.error("Error sending stop signal:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default stopRouter;
