#!/bin/bash
echo "MAKE SURE THIS IS RAN WITH source ./ros_setup.sh"
echo "Setting ROS_DOMAIN_ID to 0"
export ROS_DOMAIN_ID=0
echo "ROS_DOMAIN_ID=$ROS_DOMAIN_ID"
echo "Setting ROS_LOCALHOST_ONLY to 0"
export ROS_LOCALHOST_ONLY=0
echo "ROS_LOCALHOST_ONLY=$ROS_LOCALHOST_ONLY"
echo "Setting RMW_IMPLEMENTATION to rmw_fastrtps_cpp"
export RMW_IMPLEMENTATION=rmw_fastrtps_cpp
echo "RMW_IMPLEMENTATION=$RMW_IMPLEMENTATION"
source /opt/ros/humble/setup.bash
echo "Done!"
