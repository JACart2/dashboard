

export interface CartLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source?: string;
  message: string;
}

export interface AADAlert {
  timestamp: string;
  message: string;
}

export interface Vehicle {
  name: string;
  speed?: number;
  tripProgress?: number;
  longLat?: [number, number];
  startLocation?: string;
  endLocation?: string;
  imgData?: string;
  helpRequested?: boolean;
  anomalyResult?: AADAlert[];
  visualPath?: number[][];
  logs?: CartLogEntry[];
  aiLogSummary?: string;
}

export interface VehicleMap {
  [key: string]: Vehicle;
}

export interface CartLogUpdate {
  cartName: string;
  log: CartLogEntry;
}