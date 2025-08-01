import * as ROSLIB from "roslib";
import CameraSubManager from "../../config/camera-subs";
import { CartUtils, Transform } from "../../config/utils";

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
      console.log(`[ROS] Received 'compressed_image':`, message);

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
      console.log(`[ROS] Received 'visual_path':`, message);
    });

    this.topics["vehicle_state"].subscribe((message: any) => {
      console.log(`[ROS] Received 'vehicle_state':`, message);
    });

    this.topics["clicked_point"].subscribe((message: any) => {
      console.log(`[ROS] Received 'clicked_point':`, message);
    });

    this.topics["zed_rear"].subscribe((message: any) => {
      console.log(`[ROS] Received 'zed_rear':`, message);

      const url = CameraSubManager.encodeBase64(message?.["data"]);
      CameraSubManager.emitFrame(this.name, url);
    });

    this.topics["nav_cmd"].subscribe((message) => {
      console.log(`[ROS] Received 'nav_cmd':`, message);

      const speed = message?.["vel"];
      CartUtils.editCart(this.name, { speed });
    });
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
    throttle_rate: 500,
  },
  nav_cmd: {
    name: "/nav_cmd",
    messageType: "motor_control_interface/msg/VelAngle",
    throttle_rate: 500, // this can be changed based on bandwidth
  },
};
