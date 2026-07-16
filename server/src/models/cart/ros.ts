import * as ROSLIB from "roslib";
import CameraSubManager from "../../config/camera-subs";
import { redis } from "../../config/db";
import { CartUtils, Transform } from "../../config/utils";

type AADAlert = {
  timestamp: string;
  message: string;
  source: "local-aad";
};

type CartLogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source?: string;
  message: string;
};

type AnomalyMsg = {
  header?: {
    stamp?: {
      sec?: number;
      nanosec?: number;
    };
    frame_id?: string;
  };
  node_name?: string;
  importance?: number;
  type?: number;
  msg?: string;
};

// A utility class that handles a cart's ROS connection
export default class ROSListener {
  static listeners: { [name: string]: ROSListener } = {};
  private anomalyMessages: AADAlert[] = [];
  private logs: CartLogEntry[] = [];

  url: string;
  name: string;

  ros: ROSLIB.Ros;
  topics: { [key: string]: ROSLIB.Topic };

  // When instantiated, connect to the given ROS server address
  constructor(
    url: string,
    name: string,
    initialLogs: CartLogEntry[] = []
  ) {
    this.url = url;
    this.name = name;
    this.logs = initialLogs;

    // Can hook up error/connection/close events for logging if desired
    this.ros = new ROSLIB.Ros({
      url: this.url,
    });

    this.ros.on("error", (error) => {
      console.error(
        `[ROS] Connection error to ${this.url}:`,
        error.message || error
      );
    });

    // A topic is created for each entry in CART_TOPICS
    this.topics = {};
    Object.entries(CART_TOPICS).forEach(([topicName, options]) => {
      this.topics[topicName] = new ROSLIB.Topic({
        ros: this.ros,
        ...options,
      });
    });

    this.subscribeToTopics();

    ROSListener.listeners[name] = this;
  }

  private stampToIso(stamp?: {
  sec?: number;
  nanosec?: number;
}): string {
  if (!stamp || typeof stamp.sec !== "number") {
    return new Date().toISOString();
  }

  return new Date(
    stamp.sec * 1000 + (stamp.nanosec ?? 0) / 1_000_000
  ).toISOString();
}

private importanceToLevel(
  importance?: number
): "info" | "warn" | "error" | "debug" {
  switch (importance) {
    case 2:
      return "error";
    case 1:
      return "warn";
    case 0:
    default:
      return "info";
  }
}

private levelToImportance(
  level: "info" | "warn" | "error" | "debug"
): number {
  switch (level) {
    case "error":
      return 2;
    case "warn":
      return 1;
    case "debug":
    case "info":
    default:
      return 0;
  }
}

private async pushLog(log: CartLogEntry) {
  this.logs = [log, ...this.logs].slice(0, 500);

  await CartUtils.editCart(this.name, {
    logs: this.logs,
  });

  const streamKey = `cart:${this.name}:dashboard-ai:input`;

  const aiPayload = {
    timestamp: log.timestamp,
    cartName: this.name,
    nodeName: log.source ?? "ai_anomaly_logging",
    importance: this.levelToImportance(log.level),
    type: 0,
    text: log.message,
  };

  const entryId = await redis.xAdd(streamKey, "*", {
    payload: JSON.stringify(aiPayload),
  });

  await redis.xTrim(streamKey, "MAXLEN", 1000);

  console.log("[Dashboard AI] Stored ROS log input:", {
    cartName: this.name,
    streamKey,
    entryId,
    message: log.message,
  });
}

  subscribeToTopics(): void {
    // Decode and emit incoming camera frames
    this.topics["compressed_image"].subscribe((message) => {
      // console.log(`[ROS] Received 'compressed_image':`, message);

      const url = CameraSubManager.encodeBase64(message?.["data"]);
      CameraSubManager.emitFrame(this.name, url);
    });

    // Update cart location
    this.topics["limited_pose"].subscribe((message: any) => {
      // console.log(`[ROS] Received 'limited_pose':`, message);
      const longLat = Transform.rosToMapCoords(message.pose.pose.position);

      CartUtils.editCart(this.name, { longLat });
    });

    this.topics["clicked_point"].subscribe((message: any) => {
      console.log(`[ROS] Received 'clicked_point':`, message);

      // Do not update startLocation/endLocation here.
      // The UI repo sends the real selected destination name to the dashboard API.
    });
    
    this.topics["zed_rear"].subscribe((message: any) => {
      // console.log(`[ROS] Received 'zed_rear':`, message);

      const url = CameraSubManager.encodeBase64(message?.["data"]);
      CameraSubManager.emitFrame(this.name, url);
    });

    this.topics["nav_cmd"].subscribe((message) => {
      // console.log(`[ROS] Received 'nav_cmd':`, message);

      const speed = message?.["vel"];
      CartUtils.editCart(this.name, { speed });
    });

    try {
      this.topics["ai_anomaly_logging"].subscribe((message: AnomalyMsg) => {
        const logMessage = message.msg?.trim();

        if (!logMessage) {
          console.warn(
            `[ROS] Received empty ai_anomaly_logging message:`,
            message
          );
          return;
        }

        void this.pushLog({
          timestamp: this.stampToIso(message.header?.stamp),
          level: this.importanceToLevel(message.importance),
          source: message.node_name?.trim() || "ai_anomaly_logging",
          message: logMessage,
        });
      });
    } catch (e) {
      console.error(
        `[ROS] Failed to subscribe to 'ai_anomaly_logging':`,
        e
      );
    }
    
    try {
      this.topics["anomaly_result"].subscribe((message: any) => {
        console.log("INCOMING ANOMALY MESSAGE");
        console.log(message.data);

        const incomingAlert: AADAlert = {
          timestamp: new Date().toISOString(),
          message: String(message.data),
          source: "local-aad",
        };

        this.anomalyMessages = [
          incomingAlert,
          ...this.anomalyMessages,
        ].slice(0, 100);

        CartUtils.editCart(this.name, {
          anomalyResult: this.anomalyMessages,
        });
      });
    } catch (e) {
      console.error(
        `[ROS] Failed to subscribe to 'anomaly_result':`,
        e
      );
    }
  }
}

const CART_TOPICS = {
  visual_path: {
    name: "/visual_path",
    messageType: "visualization_msgs/msg/MarkerArray",
    throttle_rate: 500,
  },
  limited_pose: {
    name: "/pcl_pose",
    messageType: "geometry_msgs/msg/PoseWithCovarianceStamped",
    throttle_rate: 500,
  },
  vehicle_state: {
    name: "/vehicle_state",
    messageType: "navigation_interface/msg/VehicleState",
    throttle_rate: 500, // this can be changed based on bandwidth
  },
  clicked_point: {
    name: "/clicked_point",
    messageType: "geometry_msgs/msg/PointStamped",
    throttle_rate: 500,
  },
  compressed_image: {
    name: "/zed_front/zed_node_0/right_raw/image_raw_color/compressed",
    messageType: "sensor_msgs/msg/CompressedImage",
    throttle_rate: 1000, // this can be changed based on bandwidth
  },
  zed_rear: {
    name: "/zed/zed_node/rgb/image_raw_color/compressed",
    messageType: "sensor_msgs/msg/Image",
    throttle_rate: 1000, // this can be changed based on bandwidth
  },
  nav_cmd: {
    name: "/nav_cmd",
    messageType: "motor_control_interface/msg/VelAngle",
    throttle_rate: 500, // this can be changed based on bandwidth
  },

  //ai anomamly
  anomaly_result: {
    name: "/aad/alerts",
    messageType: "std_msgs/msg/String",
    throttle_rate: 0,
  },
  ai_anomaly_logging: {
    name: "/ai_anomaly_logging",
    messageType: "anomaly_msg/msg/AnomalyMsg",
    throttle_rate: 0, // this can be changed based on bandwidth, may drop essential logs for analyzing if throttled.
  },
  aad_decisions: {
    name: "/aad/decisions",
    messageType: "std_msgs/msg/String",
    throttle_rate: 0,
  },
};