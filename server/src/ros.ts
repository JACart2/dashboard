import * as ROSLIB from "roslib";

export default class ROSListener {
  url: string;
  name: string;

  ros: ROSLIB.Ros;
  topics: { [key: string]: ROSLIB.Topic };

  constructor(url: string, name: string) {
    this.url = url;
    this.name = name;

    // Can hook up error/connection/close events for logging if desired
    this.ros = new ROSLIB.Ros({
      url: "ws://localhost:9090",
    });

    this.topics = {};
    Object.entries(CART_TOPICS).forEach(([name, options]) => {
      this.topics[name] = new ROSLIB.Topic({
        ros: this.ros,
        ...options,
      });
    });
  }
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
    throttle_rate: 100 // this can be changed based on bandwidth
  }
};

// // ROSMarker[]
// export const visual_path = new ROSLIB.Topic({
//   ros: ros,
//   name: "/visual_path",
//   messageType: "visualization_msgs/msg/MarkerArray",
// });

// // PoseWithCovarianceStamped
// export const limited_pose = new ROSLIB.Topic({
//   ros: ros,
//   name: "/pcl_pose",
//   messageType: "geometry_msgs/msg/PoseWithCovarianceStamped",
// });

// VehicleState
// export const vehicle_state = new ROSLIB.Topic({
//   ros: ros,
//   name: "/vehicle_state",
//   messageType: "navigation_interface/msg/VehicleState",
// });

// {  point: { x: #, y: #, z: # } }
// export const clicked_point = new ROSLIB.Topic({
//   ros: ros,
//   name: "/clicked_point",
//   messageType: "geometry_msgs/msg/PointStamped",
// });
