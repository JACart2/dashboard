export interface Vehicle {
  name: string;
  speed?: number;
  tripProgress?: number;
  longLat?: [number, number];
  startLocation: string;
  endLocation: string;
}

export interface VehicleMap {
  [key: string]: Vehicle;
}
