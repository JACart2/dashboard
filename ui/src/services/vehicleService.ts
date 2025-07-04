import { Vehicle, VehicleMap } from "../types";

const API_ROOT = import.meta.env.VITE_API_ROOT;

export const vehicleService = {
  BASE_URL: API_ROOT + "vehicles/",
  vehicles: null as VehicleMap | null,

  async getVehicles(ignoreCache: boolean = false): Promise<VehicleMap> {
    if (!ignoreCache && !!this.vehicles) return this.vehicles;

    const data = await fetch(this.BASE_URL, { method: "GET" });
    const json = await data.json();
    this.vehicles = this.parseVehicles(json);

    return this.vehicles;
  },

  parseVehicles(vehicles: any): VehicleMap {
    const parsed: { [key: string]: Vehicle } = {};

    vehicles.forEach((vehicle: Vehicle) => {
      parsed[vehicle.name] = vehicle;
    });

    return parsed;
  },

  getVehicle(name: string) {
    return fetch(this.BASE_URL + name, { method: "GET" });
  },

  deleteVehicle(name: string) {
    return fetch(this.BASE_URL + name, { method: "DELETE" });
  },
};
