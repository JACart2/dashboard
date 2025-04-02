import * as ROSLIB from "roslib";

export default class ROSListener {
  static listeners: { [key: number]: ROSListener } = {};

  url: string;
  id: number;

  ros: ROSLIB.Ros;
  topics: { [key: string]: ROSLIB.Topic };

  constructor(url: string, id: number) {
    this.url = url;
    this.id = id;

    // Can hook up error/connection/close events for logging if desired
    this.ros = new ROSLIB.Ros({
      url: this.url,
    });

    this.topics = {};
    Object.entries(CART_TOPICS).forEach(([topicName, options]) => {
      this.topics[topicName] = new ROSLIB.Topic({
        ros: this.ros,
        ...options,
      });
    });

    this.subscribeToTopics();

    ROSListener.listeners[id] = this;
  }

  subscribeToTopics(): void {}
}

const CART_TOPICS = {
  visual_path: {
    name: "/visual_path",
    messageType: "visualization_msgs/msg/MarkerArray",
  },
  limited_pose: {
    name: "/pcl_pose",
    messageType: "geometry_msgs/msg/PoseWithCovarianceStamped",
  },
  vehicle_state: {
    name: "/vehicle_state",
    messageType: "navigation_interface/msg/VehicleState",
  },
  clicked_point: {
    name: "/clicked_point",
    messageType: "geometry_msgs/msg/PointStamped",
  },
  compressed_image: {
    name: "/zed/zed_node/rgb/image_rect_color/compressed",
    messageType: "sensor_msgs/msg/CompressedImage",
    throttle_rate: 100, // this can be changed based on bandwidth
  },
};
