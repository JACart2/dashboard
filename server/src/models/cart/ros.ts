import * as ROSLIB from "roslib";
import CameraSubManager from "../../config/camera-subs";
import { CartUtils, Transform } from "../../config/utils";
import locations from "../../config/locations.json";

// A utility class that handles a cart's ROS connection
export default class ROSListener {
  static listeners: { [name: string]: ROSListener } = {};

  url: string;
  name: string;

  ros: ROSLIB.Ros;
  topics: { [key: string]: ROSLIB.Topic };

  // When instantiated, connect to the given ROS server address
  constructor(url: string, name: string) {
    this.url = url;
    this.name = name;

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

    this.topics["visual_path"].subscribe((message: any) => {
      // console.log(`[ROS] Received 'visual_path':`, message);
    });

    this.topics["vehicle_state"].subscribe((message: any) => {
      // console.log(`[ROS] Received 'vehicle_state':`, message);
    });

    this.topics["clicked_point"].subscribe((message: any) => {
      console.log(`[ROS] Received 'clicked_point':`, message);
    
      const point = message?.point;
    
      if (!point) return;
    
      const longitude = point.x;
      const latitude = point.y;
    
      const location = getClosestLocation(longitude, latitude);
    
      CartUtils.editCart(this.name, {
        startLocation: "Current location",
        endLocation: location?.displayName ?? `Point (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
        tripProgress: 0,
      });
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
      this.topics["anomaly_result"].subscribe((message: any) => {
        console.log("                      INCOMING ANOMALY MESSAGE")
        console.log("______________________________________________________________________")
        console.log(message.data);
        console.log("______________________________________________________________________")
        console.log("")

        const anomalyResult = message.data;
        CartUtils.editCart(this.name, { anomalyResult });
      });
    } catch (e) {
      console.error(`[ROS] Failed to subscribe to 'anomaly_result':`, e);
    }
  }
}

// Helper for location
type LocationEntry = {
  name: string;
  displayName: string;
  lat: number;
  long: number;
  url?: string;
  disabled?: boolean;
};

const DESTINATION_MATCH_THRESHOLD = 0.00025;

function getClosestLocation(longitude: number, latitude: number): LocationEntry | null {
  const enabledLocations = (locations as LocationEntry[]).filter(
    (location) => location.disabled !== true
  );

  let closestLocation: LocationEntry | null = null;
  let closestDistance = Infinity;

  for (const location of enabledLocations) {
    const dx = longitude - location.long;
    const dy = latitude - location.lat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestLocation = location;
      closestDistance = distance;
    }
  }

  if (closestDistance > DESTINATION_MATCH_THRESHOLD) {
    return null;
  }

  return closestLocation;
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
    throttle_rate: 500,
  },
  nav_cmd: {
    name: "/nav_cmd",
    messageType: "motor_control_interface/msg/VelAngle",
    throttle_rate: 500, // this can be changed based on bandwidth
  },
  anomaly_result: {
    name: "/aad/alerts",
    messageType: "std_msgs/msg/String",
    throttle_rate: 500,
  },
};
