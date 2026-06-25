export interface CartLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source?: string;
  message: string;
}

export interface Vehicle {
  name: string;
  speed?: number;
  tripProgress?: number;
  longLat?: [number, number];
  startLocation: string;
  endLocation: string;
  imgData?: string;
  helpRequested?: boolean;
  anomalyResult?: string;
  logs?: CartLogEntry[];
  aiLogSummary?: string;
}

export interface VehicleMap {
  [key: string]: Vehicle;
}