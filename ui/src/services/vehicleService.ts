import { Vehicle, VehicleMap } from "../types";

const API_ROOT = import.meta.env.VITE_API_ROOT ?? "http://localhost:8000/api/";

export const vehicleService = {
  BASE_URL: API_ROOT + "vehicles/",
  vehicles: null as VehicleMap | null,

  async getVehicles(ignoreCache: boolean = false): Promise<VehicleMap> {
    if (!ignoreCache && !!this.vehicles) return this.vehicles;

    console.log("getting vehicles");
    console.log(this.BASE_URL);

    const data = await fetch(this.BASE_URL, { method: "GET" });
    const json = await data.json();
    this.vehicles = this.parseVehicles(json);

    return this.vehicles;
  },

  createTestVehicle() {
    let longLat = [
      Math.random() * 0.004 - 78.86,
      Math.random() * 0.004 + 38.43,
    ];

    console.log("Creating vehicle");
    console.log(this.BASE_URL);

    fetch(this.BASE_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: generateRandomLetters(8),
        speed: Math.random() * 8,
        // long: (Math.random() * 0.004) - 78.86,
        // lat: (Math.random() * 0.004) + 38.43,
        longLat: longLat,
        startLocation: "Starting point",
        endLocation: "Ending point",
      }),
    });
  },

  parseVehicles(vehicles: any): VehicleMap {
    const parsed: { [key: string]: Vehicle } = {};

    vehicles.forEach((vehicle: Vehicle) => {
      parsed[vehicle.name] = vehicle;
    });

    return parsed;
  },

  getVehicle(name: string) {
    return fetch(this.BASE_URL + name, {
      method: "GET",
      credentials: "include",
    });
  },

  deleteVehicle(name: string) {
    return fetch(this.BASE_URL + name, {
      method: "DELETE",
      credentials: "include",
    });
  },

  editVehicle(name: string, data: Partial<Vehicle>) {
    return fetch(this.BASE_URL + name, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },
};

function generateRandomLetters(length: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const randomLetters = [];

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomLetters.push(letters[randomIndex]);
  }

  return randomLetters.join("");
}
