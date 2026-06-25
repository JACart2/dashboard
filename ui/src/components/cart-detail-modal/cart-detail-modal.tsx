import { Empty, Modal, Tabs, Typography } from "antd";
import type { Vehicle } from "../../types";
import styles from "./cart-detail-modal.module.css";

const { Text } = Typography;

interface CartDetailModalProps {
  cart?: Vehicle;
  open: boolean;
  onClose: () => void;
  cartImage?: string;
}

export default function CartDetailModal({
  cart,
  open,
  onClose,
  cartImage,
}: CartDetailModalProps) {
  if (!cart) return null;

  return (
    <Modal
      title={`${cart.name} Details`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={950}
      centered
    >
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: "Overview",
            children: <CartOverview cart={cart} />,
          },
          {
            key: "camera",
            label: "Camera",
            children: <CartCamera cart={cart} cartImage={cartImage} />,
          },
          {
            key: "logs",
            label: "Logs",
            children: <CartLogs cart={cart} />,
          },
          {
            key: "ai-summary",
            label: "AI Summary",
            children: <CartAISummary cart={cart} />,
          },
        ]}
      />
    </Modal>
  );
}

function CartOverview({ cart }: { cart: Vehicle }) {
  return (
    <div className={styles.overviewGrid}>
      <div>
        <Text strong>Cart Name:</Text>
        <div>{cart.name}</div>
      </div>

      <div>
        <Text strong>Speed:</Text>
        <div>{cart.speed == null ? "N/A" : `${cart.speed.toFixed(2)} mph`}</div>
      </div>

      <div>
        <Text strong>Trip Progress:</Text>
        <div>{cart.tripProgress ?? 0}%</div>
      </div>

      <div>
        <Text strong>Route:</Text>
        <div>
          {cart.startLocation ?? "Starting point"} →{" "}
          {cart.endLocation ?? "Ending point"}
        </div>
      </div>

      <div>
        <Text strong>Help Requested:</Text>
        <div>{cart.helpRequested ? "Yes" : "No"}</div>
      </div>

      <div>
        <Text strong>Anomaly:</Text>
        <div>{cart.anomalyResult ?? "None"}</div>
      </div>

      <div>
        <Text strong>Location:</Text>
        <div>
          {cart.longLat
            ? `${cart.longLat[1]}, ${cart.longLat[0]}`
            : "No location available"}
        </div>
      </div>
    </div>
  );
}

function CartCamera({
  cart,
  cartImage,
}: {
  cart: Vehicle;
  cartImage?: string;
}) {
  const imageSrc = cartImage || cart.imgData;

  if (!imageSrc) {
    return <Empty description="No camera feed available" />;
  }

  return (
    <div className={styles.cameraPanel}>
      <img
        src={imageSrc}
        alt={`${cart.name} camera feed`}
        className={styles.cameraImage}
      />
    </div>
  );
}

function CartLogs({ cart }: { cart: Vehicle }) {
  const logs = cart.logs ?? [];

  if (logs.length === 0) {
    return <Empty description="No cart logs received yet" />;
  }

  return (
    <div className={styles.logsPanel}>
      {logs.map((log, index) => (
        <div key={index} className={styles.logLine}>
          <span>[{log.timestamp}] </span>
          <span>[{log.level.toUpperCase()}] </span>
          {log.source && <span>[{log.source}] </span>}
          <span>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

function CartAISummary({ cart }: { cart: Vehicle }) {
  if (!cart.aiLogSummary) {
    return <Empty description="AI log summary not connected yet" />;
  }

  return <div className={styles.aiSummary}>{cart.aiLogSummary}</div>;
}