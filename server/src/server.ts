import express = require("express");
import bodyParser = require("body-parser");
import { createServer } from "http";
import routes from "./routes";
import helmet from "helmet";
import cors = require("cors");
import { Server } from "socket.io";
import path = require("path");

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New WebSocket connection:", socket.id);

  socket.on("message", (msg) => {
    console.log("Received message:", msg);
    socket.emit("response", "Message received");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "../static")));
app.use(cors());

const PORT = 8002; //process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
