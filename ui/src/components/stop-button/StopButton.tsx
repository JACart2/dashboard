import { Button, Modal } from "antd";
import { StopOutlined } from "@ant-design/icons";
import { useState } from "react";
import { vehicleService } from "../../services/vehicleService";

interface StopButtonProps {
  cartId: string;
  onStop?: () => void;
}

export default function StopButton({ cartId, onStop }: StopButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleStop = async () => {
    Modal.confirm({
      title: "Confirm Stop",
      content: `Are you sure you want to stop cart ${cartId}?`,
      okText: "Yes",
      cancelText: "No",
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          const response = await vehicleService.stopVehicle(cartId);
          
          if (response.ok) {
            const data = await response.json();
            console.log(data.message);
            Modal.success({ content: `Stop signal sent to ${cartId}` });
            onStop?.();
          } else {
            throw new Error("Failed to send stop signal");
          }
        } catch (error) {
          console.error("Error stopping cart:", error);
          Modal.error({ title: "Error", content: "Failed to stop cart" });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Button 
      danger 
      type="primary"
      icon={<StopOutlined />}
      loading={loading}
      onClick={handleStop}
      style={{ width: "100%" }}
    >
      Stop Cart
    </Button>
  );
}
