export interface CartLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source?: string;
  message: string;
}

export interface DashboardAIDecision {
  timestamp: string;
  cartName: string;
  source: "dashboard-ai";
  model: string;
  mode: "shadow" | "automatic" | "prompt";
  inputMessageCount: number;
  anomaly: boolean;
  severity: "low" | "medium" | "high" | "unknown";
  action: "stop_cart" | "alert_admin" | "none";
  summary: string;
  requestId?: string;
  prompt?: string;
}

export interface DashboardAIResponse {
  requestId: string;
  timestamp: string;
  cartName: string;
  source: "dashboard-ai";
  model: string;
  mode: "automatic" | "prompt";
  anomaly: boolean;
  severity: "low" | "medium" | "high" | "unknown";
  action: "stop_cart" | "alert_admin" | "none";
  summary: string;
  prompt?: string;
}

export type AISource = "local-aad" | "dashboard-ai";

export interface AADAlert {
  timestamp: string;
  message: string;
  source: AISource;
}

export interface Vehicle {
  name: string;
  speed?: number;
  tripProgress?: number;
  etaSeconds?: number;
  longLat?: [number, number];
  startLocation?: string;
  endLocation?: string;
  imgData?: string;
  helpRequested?: boolean;
  visualPath?: number[][];
  logs?: CartLogEntry[];

  // Existing cart-local AAD output
  anomalyResult?: AADAlert[];
  dashboardAIResponses?: DashboardAIResponse[];

  // Dashboard-hosted AI output
  dashboardAIDecisions?: DashboardAIDecision[];
  dashboardAIProcessing?: boolean;
}

export interface VehicleMap {
  [key: string]: Vehicle;
}

export interface CartLogUpdate {
  cartName: string;
  log: CartLogEntry;
}