import { Empty, Modal, Tabs, Typography, Tag } from "antd";
import type { CartLogEntry, Vehicle, DashboardAIDecision } from "../../types";
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
  const localAADMessages = cart.anomalyResult ?? [];
  const dashboardAIDecisions = cart.dashboardAIDecisions ?? [];

  const aiMessages = [
    ...localAADMessages.map((alert) => ({
      id: `local-${alert.timestamp}-${alert.message}`,
      timestamp: alert.timestamp,
      message: alert.message,
      source: "local-aad" as const,
      anomaly: true,
      severity: undefined,
      action: undefined,
      model: undefined,
    })),

    ...dashboardAIDecisions.map((decision, index) => ({
      id:
        decision.requestId ??
        `dashboard-${decision.timestamp}-${index}`,
      timestamp: decision.timestamp,
      message: decision.summary,
      source: "dashboard-ai" as const,
      anomaly: decision.anomaly,
      severity: decision.severity,
      action: decision.action,
      model: decision.model,
    })),
  ].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime()
  );

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
        <Text strong>AI Decisions & Alerts</Text>
        <Tag color="purple">{aiMessages.length}</Tag>
        </div>

        <div className={styles.scrollableAnomalyList}>
          {aiMessages.length === 0 ? (
            <Empty description="No local or dashboard AI messages received yet" />
          ) : (
            aiMessages.map((entry) => (
              <div
                key={entry.id}
                className={
                  entry.source === "local-aad"
                    ? styles.localAADLine
                    : styles.dashboardAILine
                }
              >
                <div className={styles.anomalyHeader}>
                  {entry.source === "local-aad" ? (
                    <Tag color="red">LOCAL AAD</Tag>
                  ) : (
                    <Tag color="purple">DASHBOARD AI</Tag>
                  )}

                  {entry.source === "dashboard-ai" && (
                    <>
                      <Tag color={entry.anomaly ? "red" : "green"}>
                        {entry.anomaly ? "ANOMALY" : "NORMAL"}
                      </Tag>

                      {entry.severity && (
                        <Tag color={getDashboardSeverityColor(entry.severity)}>
                          {entry.severity.toUpperCase()}
                        </Tag>
                      )}

                      {entry.action && <Tag>{entry.action}</Tag>}
                    </>
                  )}

                  <Text
                    type="secondary"
                    className={styles.logTimestamp}
                  >
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                </div>

                <div className={styles.anomalyMessage}>
                  {entry.message}
                </div>

                {entry.source === "dashboard-ai" && entry.model && (
                  <Text type="secondary">
                    Model: {entry.model}
                  </Text>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}


function CartAI({ cart }: { cart: Vehicle }) {
  const decisions = cart.dashboardAIDecisions ?? [];
  const latestDecision = decisions[0];

  return (
    <div className={styles.aiPanel}>
      <section className={styles.aiSummaryBox}>
        <div className={styles.aiHeader}>
          <Text strong>Dashboard AI</Text>

          <Tag color={cart.dashboardAIProcessing ? "blue" : "green"}>
            {cart.dashboardAIProcessing ? "ANALYZING" : "IDLE"}
          </Tag>
        </div>

        {latestDecision ? (
          <>
            <div className={styles.aiDecisionTags}>
              <Tag color={latestDecision.anomaly ? "red" : "green"}>
                {latestDecision.anomaly ? "ANOMALY" : "NORMAL"}
              </Tag>

              <Tag color={getSeverityColor(latestDecision.severity)}>
                {latestDecision.severity.toUpperCase()}
              </Tag>

              <Tag>{latestDecision.action}</Tag>
            </div>

            <Paragraph className={styles.aiSummaryText}>
              {latestDecision.summary}
            </Paragraph>

            <div className={styles.aiMetadata}>
              <Text type="secondary">
                Model: {latestDecision.model}
              </Text>

              <Text type="secondary">
                Inputs: {latestDecision.inputMessageCount}
              </Text>

              <Text type="secondary">
                {formatTimestamp(latestDecision.timestamp)}
              </Text>
            </div>
          </>
        ) : (
          <Empty description="No dashboard AI decisions received yet" />
        )}
      </section>

      <section className={styles.aiHistoryBox}>
        <div className={styles.columnHeader}>
          <Text strong>Dashboard AI Decision History</Text>
          <Tag color="purple">{decisions.length}</Tag>
        </div>

        <div className={styles.scrollableAIList}>
          {decisions.length === 0 ? (
            <Empty description="No dashboard AI decision history" />
          ) : (
            decisions.map((decision, index) => (
              <DashboardAIDecisionEntry
                key={`${decision.timestamp}-${index}`}
                decision={decision}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardAIDecisionEntry({
  decision,
}: {
  decision: DashboardAIDecision;
}) {
  return (
    <div className={styles.aiDecisionLine}>
      <div className={styles.aiDecisionHeader}>
        <Tag color={decision.anomaly ? "red" : "green"}>
          {decision.anomaly ? "ANOMALY" : "NORMAL"}
        </Tag>

        <Tag color={getSeverityColor(decision.severity)}>
          {decision.severity.toUpperCase()}
        </Tag>

        <Tag>{decision.action}</Tag>

        <Text
          type="secondary"
          className={styles.logTimestamp}
        >
          {formatTimestamp(decision.timestamp)}
        </Text>
      </div>

      <Paragraph className={styles.aiDecisionSummary}>
        {decision.summary}
      </Paragraph>

      <Text type="secondary">
        {decision.model} · {decision.inputMessageCount} input messages
      </Text>
    </div>
  );
}

function getSeverityColor(
  severity: DashboardAIDecision["severity"]
) {
  switch (severity) {
    case "high":
      return "red";

    case "medium":
      return "orange";

    case "low":
      return "gold";

    case "unknown":
    default:
      return "default";
  }
}

function getDashboardSeverityColor(
  severity: "low" | "medium" | "high" | "unknown"
) {
  switch (severity) {
    case "high":
      return "red";

    case "medium":
      return "orange";

    case "low":
      return "gold";

    case "unknown":
    default:
      return "default";
  }
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