export interface Vehicle {
  id: number;
  name: string;
  speed?: number;
  tripProgress?: number;
  longLat?: [number, number];
  startLocation: string;
  endLocation: string;
}

export interface VehicleMap {
  [key: number | string]: Vehicle;
}
