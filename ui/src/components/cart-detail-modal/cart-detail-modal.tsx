import { Empty, Modal, Tabs, Typography, Tag } from "antd";
import type { CartLogEntry, Vehicle, AADAlert } from "../../types";
import styles from "./cart-detail-modal.module.css";


const { Text, Paragraph } = Typography;

interface CartDetailModalProps {
  cart?: Vehicle;
  open: boolean;
  onClose: () => void;
  cartImages?: {
    front?: string;
    rear?: string;
  };
}

export default function CartDetailModal({
  cart,
  open,
  onClose,
  cartImages,
}: CartDetailModalProps) {

  console.log("[CartDetailModal] cart:", cart);
  console.log("[CartDetailModal] open:", open);

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
            children: <CartCamera cart={cart} cartImages={cartImages} />,
          },
          {
            key: "logs",
            label: "Logs & Events",
            children: <CartLogs cart={cart} />,
          },
          {
            key: "ai",
            label: "AI",
            children: <CartAI cart={cart} />,
          },
        ]}
      />
    </Modal>
  );
}

function CartOverview({ cart }: { cart: Vehicle }) {
  return (
    <div className={styles.overviewGrid}>
      <InfoBlock label="Cart Name" value={cart.name} />

      <InfoBlock
        label="Speed"
        value={cart.speed == null ? "N/A" : `${cart.speed.toFixed(2)} mph`}
      />

      <InfoBlock label="Trip Progress" value={`${cart.tripProgress ?? 0}%`} />

      <div>
        <Text strong>Route:</Text>
        <div>
          {cart.startLocation ?? "Starting point"} →{" "}
          {cart.endLocation ?? "Ending point"}
        </div>
      </div>

      <div>
        <Text strong>Help Requested:</Text>
        <div>
          {cart.helpRequested ? (
            <Tag color="orange">YES</Tag>
          ) : (
            <Tag color="green">NO</Tag>
          )}
        </div>
      </div>

        <div className={styles.anomalyBlock}>
          <Text strong>Anomaly:</Text>

          <div className={styles.anomalyContainer}>
            {cart.anomalyResult?.length ? (
              <Tag color="red" className={styles.anomalyTag}>
                {cart.anomalyResult?.[0]?.message ?? "None"}
              </Tag>
            ) : (
              <Tag color="green">None</Tag>
            )}
          </div>
        </div>

      <InfoBlock
        label="Location"
        value={
          cart.longLat
            ? `${cart.longLat[1].toFixed(6)}, ${cart.longLat[0].toFixed(6)}`
            : "No location available"
        }
      />

      <InfoBlock
        label="Logs Stored"
        value={`${cart.logs?.length ?? 0}`}
      />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text strong>{label}:</Text>
      <div>{value}</div>
    </div>
  );
}

function CartCamera({
  cart,
  cartImages,
}: {
  cart: Vehicle;
  cartImages?: {
    front?: string;
    rear?: string;
  };
}) {
  const frontImage = cartImages?.front;
  const rearImage = cartImages?.rear;

  if (!frontImage && !rearImage) {
    return <Empty description={`Waiting for ${cart.name} camera feeds...`} />;
  }

  return (
    <div className={styles.cameraGrid}>
      <div className={styles.cameraFeedBox}>
        <Text strong>Front Camera</Text>
        {frontImage ? (
          <img
            src={frontImage}
            alt={`${cart.name} front camera feed`}
            className={styles.cameraImage}
          />
        ) : (
          <Empty description="Waiting for front camera..." />
        )}
      </div>

      <div className={styles.cameraFeedBox}>
        <Text strong>Rear Camera</Text>
        {rearImage ? (
          <img
            src={rearImage}
            alt={`${cart.name} rear camera feed`}
            className={styles.cameraImage}
          />
        ) : (
          <Empty description="Waiting for rear camera..." />
        )}
      </div>
    </div>
  );
}

function CartLogs({ cart }: { cart: Vehicle }) {
  const logs = cart.logs ?? [];
  const anomalyMessages = cart.anomalyResult ?? [];

  return (
    <div className={styles.logsColumns}>
      <section className={styles.logsColumn}>
        <div className={styles.columnHeader}>
          <Text strong>Cart Logs</Text>
          <Tag>{logs.length}</Tag>
        </div>

        <div className={styles.scrollableLogList}>
          {logs.length === 0 ? (
            <Empty description="No cart logs or events received yet" />
          ) : (
            logs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className={styles.logLine}
              >
                <div className={styles.logHeader}>
                  <Tag color={getLogLevelColor(log.level)}>
                    {log.level.toUpperCase()}
                  </Tag>

                  {log.source && <Text strong>{log.source}</Text>}

                  <Text
                    type="secondary"
                    className={styles.logTimestamp}
                  >
                    {formatTimestamp(log.timestamp)}
                  </Text>
                </div>

                <div className={styles.logMessage}>
                  {log.message}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.anomalyColumn}>
        <div className={styles.columnHeader}>
          <Text strong>AAD Alerts</Text>
          <Tag color="red">{anomalyMessages.length}</Tag>
        </div>

        <div className={styles.scrollableAnomalyList}>
          {anomalyMessages.length === 0 ? (
            <Empty description="No /aad/alerts messages received yet" />
          ) : (
            anomalyMessages.map((alert: AADAlert, index) => (
              <div
                key={`${alert.timestamp}-${index}`}
                className={styles.anomalyLine}
              >
                <div className={styles.anomalyHeader}>
                  <Tag color="red">AAD ALERT</Tag>

                  <Text
                    type="secondary"
                    className={styles.logTimestamp}
                  >
                    {formatTimestamp(alert.timestamp)}
                  </Text>
                </div>

                <div className={styles.anomalyMessage}>
                  {alert.message}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}


function CartAI({ cart }: { cart: Vehicle }) {
  const logs = cart.logs ?? [];

  return (
    <div className={styles.aiPanel}>
      <div className={styles.aiSummaryBox}>
        <Text strong>AI Log Summary</Text>

        {cart.aiLogSummary ? (
          <Paragraph className={styles.aiSummaryText}>
            {cart.aiLogSummary}
          </Paragraph>
        ) : (
          <Empty description="AI log summary not connected yet" />
        )}
      </div>

      <div className={styles.aiInputsBox}>
        <Text strong>Future AI Inputs</Text>

        <ul>
          <li>Recent cart logs: {logs.length}</li>
          <li>Current destination: {cart.endLocation ?? "Unknown"}</li>
          <li>Help requested: {cart.helpRequested ? "Yes" : "No"}</li>
          <li>Latest anomaly result:{" "} {cart.anomalyResult?.[0]?.message ?? "None"}</li>
          <li>Current speed: {cart.speed == null ? "N/A" : cart.speed}</li>
        </ul>
      </div>
    </div>
  );
}

function getLogLevelColor(level: CartLogEntry["level"]) {
  switch (level) {
    case "error":
      return "red";
    case "warn":
      return "yellow";
    case "debug":
      return "purple";
    case "info":
    default:
      return "blue";
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}