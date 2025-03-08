# dashboard
Dashboard control center for seeing all cart data and managing them real time. This should be ran on an external server that the carts can communicate with through the Internet.

# How to see ROS2 topics between multiple computers
This is referring to being able to see the ROS2 topics of computer1 on computer2, or in the future, be able to see the ros2 topics of James and Madison on the dashboard server, in order to show that data to the admin.

## Setup
### This is all setup in a bash file.
To make things easier, the bash file `ros_setup.sh` is available in this repository and it runs all of these commands for you.
Make sure to run it with `source ros_setup.sh`.

_Or you can do this step by step:_

### Step 1: Make sure the devices are connected to the same network
This will **not** work on JMU-Official-Wireless or JMU-Robotics wifi networks. Multicasting must be allowed. In the future, the carts and the dashboard server will be connected to each other through the Internet through ZeroTier. ZeroTier will make it so they have subnetted IP addresses and can communicate with each other.

### Step 2: Set ROS_DOMAIN_ID to the same on each device. Default to 0.
`export ROS_DOMAIN_ID=0`

### Step 3: Set sure ROS_LOCALHOST_ONLY to 1
`export ROS_LOCALHOST_ONLY=1`

### Step 4: Set RMW_IMPLEMENTATION to rmw_fastrtps_cpp
`export RMW_IMPLEMENTATION=rmw_fastrtps_cpp`

### Step 5: Make sure ROS2 environment is setup:
`source /opt/ros/humble/setup.bash`

## Seeing ROS2 Topics
In order to confirm that you can see the topics, run `ros2 topic list` on both machines and ensure the topics are the same. If the only topics are `/rosout` and  `/parameter_events`, you can run `ros2 run demo_nodes_cpp talker` on computer1 and `ros2 topic list` on computer2. You should see the `/chatter` topic on computer2. You can see this info using `ros2 topic echo /chatter`. This should transfer to the JACart topics as well.

## Debugging
If this doesn't work, potentially the firewall is to blame. Type `sudo ufw disable` to turn it off. Make sure to turn it back on afterwards.
