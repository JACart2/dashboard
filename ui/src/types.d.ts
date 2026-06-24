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
}

export interface VehicleMap {
  [key: string]: Vehicle;
}
